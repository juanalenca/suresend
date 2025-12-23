import { Worker, Job } from 'bullmq';
import { processCampaignSending } from '../modules/campaigns/worker';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Redis connection configuration (same as queue.ts)
const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
};

interface CampaignJobData {
    campaignId: string;
}

// Worker that processes scheduled campaign jobs
export const campaignWorker = new Worker<CampaignJobData>(
    'campaign-sending',
    async (job: Job<CampaignJobData>) => {
        const { campaignId } = job.data;

        console.log(`[BullMQ Worker] 🚀 Processing job ${job.id} for campaign ${campaignId}`);

        try {
            // Update status before processing
            await prisma.campaign.update({
                where: { id: campaignId },
                data: { status: 'PROCESSING' }
            });

            // Call existing sending logic
            await processCampaignSending(campaignId);

            console.log(`[BullMQ Worker] ✅ Job ${job.id} completed successfully`);
        } catch (error) {
            console.error(`[BullMQ Worker] ❌ Job ${job.id} failed:`, error);

            // Mark campaign as failed
            await prisma.campaign.update({
                where: { id: campaignId },
                data: { status: 'FAILED' }
            });

            throw error; // Re-throw to mark job as failed
        }
    },
    {
        connection,
        concurrency: 1, // Process one campaign at a time
    }
);

// Event handlers for logging
campaignWorker.on('completed', (job) => {
    console.log(`[BullMQ Worker] 📧 Job ${job.id} has completed`);
});

campaignWorker.on('failed', (job, err) => {
    console.error(`[BullMQ Worker] 💥 Job ${job?.id} has failed with error:`, err.message);
});

campaignWorker.on('ready', () => {
    console.log('📋 Campaign worker is ready and listening for jobs');
});

console.log('🔧 Campaign worker initialized');
