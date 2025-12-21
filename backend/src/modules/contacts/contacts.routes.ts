import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse';

const prisma = new PrismaClient();

export async function contactsRoutes(app: FastifyInstance) {
    // GET /contacts - List with pagination
    app.get('/', async (request, reply) => {
        const { page = 1, limit = 10 } = request.query as { page?: number; limit?: number };
        const skip = (Number(page) - 1) * Number(limit);

        try {
            const [contacts, total] = await Promise.all([
                prisma.contact.findMany({
                    skip,
                    take: Number(limit),
                    orderBy: { createdAt: 'desc' }
                }),
                prisma.contact.count()
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

    // DELETE /contacts/:id - Delete a contact (with cascade delete of related records)
    app.delete('/:id', async (request, reply) => {
        const { id } = request.params as { id: string };

        try {
            // Use a transaction to ensure data integrity
            await prisma.$transaction(async (tx) => {
                // First, delete all related EmailLog records
                await tx.emailLog.deleteMany({
                    where: { contactId: id }
                });

                // Then, delete the contact itself
                await tx.contact.delete({
                    where: { id }
                });
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

    // POST /contacts - Create single
    app.post('/', async (request, reply) => {
        const { email, name, tags } = request.body as { email: string; name?: string; tags?: string[] };

        if (!email) {
            return reply.status(400).send({ message: 'Email is required' });
        }

        try {
            const contact = await prisma.contact.create({
                data: {
                    email,
                    name,
                    tags: tags || [],
                    status: 'SUBSCRIBED'
                }
            });
            return contact;
        } catch (error: any) {
            if (error.code === 'P2002') {
                return reply.status(409).send({ message: 'Email already exists' });
            }
            app.log.error(error);
            return reply.status(500).send({ message: 'Error creating contact' });
        }
    });

    // POST /contacts/import - Import CSV
    app.post('/import', async (request, reply) => {
        const data = await request.file();
        if (!data) {
            return reply.status(400).send({ message: 'No file uploaded' });
        }

        const contactsToCreate: any[] = [];

        try {
            // Buffer the file stream to string to detect delimiter and parse
            const buffer = await data.toBuffer();
            const fileContent = buffer.toString('utf-8');

            // Simple delimiter detection
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

                // Fallback for malformed CSVs (entire line quoted)
                if (keys.length === 1) {
                    const singleKey = keys[0];
                    // Check if the key itself looks like a CSV row (contains delimiter)
                    if (singleKey.includes(',') || singleKey.includes(';')) {
                        console.log('[CSV Import] Malformed record detected (Single Column). Attempting fallback parse...');

                        // Determine delimiter again for this specific line/key
                        const localDelimiter = singleKey.includes(';') ? ';' : ',';

                        // The "value" might be part of the string or empty if the header was also malformed
                        // In many cases of "quoted line", the key IS the data if headers were also quoted.
                        // Let's assume the key + value holds the data.
                        // Actually, if headers were "email,name,tags", then the key is "email,name,tags".
                        // And the value is "test@test.com,Name,Tag".

                        const rawValue = record[singleKey];
                        const rawString = `${singleKey},${rawValue}`; // This might be risky if not careful.

                        // Safer approach: Just look at the values we have.
                        // If the header was parsed as a single string "email,name,tags", then `record` is { "email,name,tags": "value,value,value" }

                        const values = (typeof record[singleKey] === 'string' ? record[singleKey] : singleKey).split(localDelimiter);

                        // We need to map these values to our expected schema [email, name, tags]
                        // Assuming standard order if headers failed: email, name, tags
                        if (values.length >= 1) {
                            processedRecord = {
                                email: values[0]?.trim().replace(/^["']|["']$/g, ''), // Remove quotes
                                name: values[1]?.trim().replace(/^["']|["']$/g, ''),
                                tags: values[2]?.trim().replace(/^["']|["']$/g, '')
                            };
                            console.log('[CSV Import] Fallback parsed:', processedRecord);
                        }
                    }
                }

                console.log('[CSV Import] Record:', processedRecord);

                // Map columns: email, name, tags
                if (processedRecord.email) {
                    contactsToCreate.push({
                        email: processedRecord.email,
                        name: processedRecord.name || null,
                        tags: processedRecord.tags ? processedRecord.tags.split(',').map((t: string) => t.trim()) : [],
                        status: 'SUBSCRIBED'
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
