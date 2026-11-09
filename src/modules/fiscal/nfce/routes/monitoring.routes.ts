// src/modules/fiscal/nfce/routes/monitoring.routes.ts
import { FastifyInstance } from 'fastify';
import { getNfceQueue } from '../queues/nfce-queue';

async function monitoringRoutes(app: FastifyInstance) {
  app.get('/queues', async (request, reply) => {
    const nfceQueue = getNfceQueue();
    const counts = await nfceQueue.getJobCounts();
    return {
      queue: 'nfce-processing',
      status: 'active',
      jobs: {
        waiting: counts.waiting,
        active: counts.active,
        completed: counts.completed,
        failed: counts.failed,
        delayed: counts.delayed
      },
      timestamp: new Date().toISOString()
    };
  });

  app.get<{ Params: { jobId: string } }>('/job/:jobId', async (request, reply) => {
    const { jobId } = request.params;
    const nfceQueue = getNfceQueue();
    const job = await nfceQueue.getJob(jobId);
    if (!job) {
      return reply.status(404).send({ error: 'Job not found' });
    }
    return {
      id: job.id,
      status: await job.getState(),
      progress: job.progress,
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
      attempts: job.attemptsMade,
      timestamp: job.timestamp
    };
  });
}

export { monitoringRoutes };