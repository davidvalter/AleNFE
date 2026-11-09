// src/modules/fiscal/nfce/queues/nfce-queue.ts
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '../../../../config/database';
import { processNFCeWorker } from '../jobs/nfce-worker';

interface NfceJobData {
  nfceId: number;
}

let nfceQueue: Queue<NfceJobData> | null = null;
let nfceWorker: Worker<NfceJobData> | null = null;

async function initNfceQueue(): Promise<Queue<NfceJobData>> {
  if (nfceQueue && nfceWorker) {
    console.log('[NFC-e Queue] Já inicializada, pulando...');
    return nfceQueue;
  }

  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null
  });

  const queue = new Queue<NfceJobData>('nfce-emission', { connection: redis });

  nfceWorker = new Worker<NfceJobData>('nfce-emission', processNFCeWorker, {
    connection: redis,
    lockDuration: 120000,
  });

  // ✅ Handler para falha definitiva (todas as tentativas esgotadas)
  nfceWorker.on('failed', async (job, err) => {
    if (!job) return;
    const { nfceId } = job.data;
    const maxAttempts = job.opts.attempts || 1;

    if (job.attemptsMade >= maxAttempts) {
      console.error(
        `[WORKER] Job ${job.id} falhou definitivamente para NFC-e ${nfceId} ` +
        `após ${job.attemptsMade} tentativas: ${err.message}`
      );

      await prisma.nFeSaida.update({
        where: { id: nfceId },
        data: { status: 'ERRO' }
      }).catch(e => console.error('[WORKER] Erro ao atualizar status para ERRO:', e));
    }
  });

  console.log('[NFC-e Queue] Worker registrado com backoff exponencial (máx 5 tentativas, base 40s)');
  nfceQueue = queue;
  return queue;
}

function getNfceQueue(): Queue<NfceJobData> {
  if (!nfceQueue) throw new Error('NFC-e queue não inicializada. Chame initNfceQueue() primeiro.');
  return nfceQueue;
}

async function enqueueNfceEmission(nfceId: number) {
  const queue = getNfceQueue();
  const job = await queue.add('nfce-emission-job', { nfceId }, {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 40000  // ← base 40s → total ~10min
    },
    removeOnComplete: 100,
    removeOnFail: 500
  });
  console.log(
    `[NFC-e Queue] Job ${job.id} enfileirado para nfceId ${nfceId} ` +
    `(máx 5 tentativas, backoff exponencial base 40s)`
  );
  return job;
}

export { initNfceQueue, getNfceQueue, enqueueNfceEmission };