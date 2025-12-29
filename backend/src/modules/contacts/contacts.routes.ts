import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse';

const prisma = new PrismaClient();

export async function contactsRoutes(app: FastifyInstance) {
    // GET /contacts - List with pagination (filtered by brandId)
    app.get('/', async (request, reply) => {
        const { page = 1, limit = 10 } = request.query as { page?: number; limit?: number };
        const skip = (Number(page) - 1) * Number(limit);
        const brandId = request.brandId;

        try {
            // Filter by brandId
            const where = brandId ? { brandId } : {};

            const [contacts, total] = await Promise.all([
                prisma.contact.findMany({
                    where,
                    skip,
                    take: Number(limit),
                    orderBy: { createdAt: 'desc' }
                }),
                prisma.contact.count({ where })
            ]);

            return {
                data: contacts,
                meta: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / Number(limit))
                }
            };
        } catch (error) {
            app.log.error(error);
            return reply.status(500).send({ message: 'Error fetching contacts' });
        }
    });

    // DELETE /contacts/:id - Delete a contact (with cascade delete)
    app.delete('/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const brandId = request.brandId;

        try {
            // Verify contact belongs to brand
            const contact = await prisma.contact.findFirst({
                where: { id, ...(brandId ? { brandId } : {}) }
            });

            if (!contact) {
                return reply.status(404).send({ message: 'Contact not found' });
            }

            await prisma.$transaction(async (tx) => {
                await tx.emailLog.deleteMany({ where: { contactId: id } });
                await tx.contact.delete({ where: { id } });
            });

            return { message: 'Contact deleted successfully' };
        } catch (error: any) {
            if (error.code === 'P2025') {
                return reply.status(404).send({ message: 'Contact not found' });
            }
            app.log.error(error);
            return reply.status(500).send({ message: 'Error deleting contact' });
        }
    });

    // POST /contacts - Create single (with brandId)
    app.post('/', async (request, reply) => {
        const { email, name, tags } = request.body as { email: string; name?: string; tags?: string[] };
        const brandId = request.brandId;

        if (!email) {
            return reply.status(400).send({ message: 'Email is required' });
        }

        if (!brandId) {
            return reply.status(400).send({ message: 'Brand not selected' });
        }

        try {
            const contact = await prisma.contact.create({
                data: {
                    email,
                    name,
                    tags: tags || [],
                    status: 'SUBSCRIBED',
                    brandId
                }
            });
            return contact;
        } catch (error: any) {
            if (error.code === 'P2002') {
                return reply.status(409).send({ message: 'Email already exists for this brand' });
            }
            app.log.error(error);
            return reply.status(500).send({ message: 'Error creating contact' });
        }
    });

    // POST /contacts/import - Import CSV (with brandId)
    app.post('/import', async (request, reply) => {
        const data = await request.file();
        const brandId = request.brandId;

        if (!data) {
            return reply.status(400).send({ message: 'No file uploaded' });
        }

        if (!brandId) {
            return reply.status(400).send({ message: 'Brand not selected' });
        }

        const contactsToCreate: any[] = [];

        try {
            const buffer = await data.toBuffer();
            const fileContent = buffer.toString('utf-8');

            const delimiter = fileContent.includes(';') ? ';' : ',';
            console.log(`[CSV Import] Detected delimiter: '${delimiter}'`);

            const parser = parse(fileContent, {
                columns: (header) => header.map((h: string) => h.toLowerCase().trim()),
                trim: true,
                skip_empty_lines: true,
                delimiter: delimiter
            });

            for await (const record of parser) {
                let processedRecord = record;
                const keys = Object.keys(record);

                // Fallback for malformed CSVs
                if (keys.length === 1) {
                    const singleKey = keys[0];
                    if (singleKey.includes(',') || singleKey.includes(';')) {
                        console.log('[CSV Import] Malformed record detected. Attempting fallback parse...');
                        const localDelimiter = singleKey.includes(';') ? ';' : ',';
                        const values = (typeof record[singleKey] === 'string' ? record[singleKey] : singleKey).split(localDelimiter);

                        if (values.length >= 1) {
                            processedRecord = {
                                email: values[0]?.trim().replace(/^["']|["']$/g, ''),
                                name: values[1]?.trim().replace(/^["']|["']$/g, ''),
                                tags: values[2]?.trim().replace(/^["']|["']$/g, '')
                            };
                            console.log('[CSV Import] Fallback parsed:', processedRecord);
                        }
                    }
                }

                console.log('[CSV Import] Record:', processedRecord);

                if (processedRecord.email) {
                    contactsToCreate.push({
                        email: processedRecord.email,
                        name: processedRecord.name || null,
                        tags: processedRecord.tags ? processedRecord.tags.split(',').map((t: string) => t.trim()) : [],
                        status: 'SUBSCRIBED',
                        brandId
                    });
                }
            }

            if (contactsToCreate.length === 0) {
                return reply.status(400).send({ message: 'No valid contacts found in CSV' });
            }

            const result = await prisma.contact.createMany({
                data: contactsToCreate,
                skipDuplicates: true
            });

            return { message: 'Import processed', count: result.count };

        } catch (e) {
            app.log.error(e);
            return reply.status(500).send({ message: 'Import failed', error: String(e) });
        }
    });
}
