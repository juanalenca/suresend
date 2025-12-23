import { Queue } from 'bullmq';

// Redis connection configuration
const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
};

// Campaign sending queue - jobs are processed in order
export const campaignQueue = new Queue('campaign-sending', {
    connection,
    defaultJobOptions: {
        attempts: 1, // No retries - we handle errors in the worker
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs for debugging
    }
});

console.log('📋 Campaign queue initialized');
