// src/modules/fiscal/config/bull-config.ts
import Redis from 'ioredis';
import { QueueOptions, WorkerOptions } from 'bullmq';

// Configurações de ambiente com valores padrão
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

if (!REDIS_PASSWORD) {
    console.error('REDIS_PASSWORD não definida nas variáveis de ambiente');
    process.exit(1);
}

/**
 * Instância Redis singleton com logging de eventos
 */
let redisInstance: Redis | null = null;

export function getRedisConnection(): Redis {
    if (!redisInstance) {
        redisInstance = new Redis({
            host: REDIS_HOST,
            port: REDIS_PORT,
            password: REDIS_PASSWORD,
            retryStrategy: (times) => {
                console.log(`[Redis] Tentativa de reconexão ${times}`);
                return Math.min(times * 200, 2000);
            },
            maxRetriesPerRequest: null, // Permite retry infinito no BullMQ
        });

        redisInstance.on('connect', () => {
            console.log('[Redis] Conectado com sucesso');
        });

        redisInstance.on('error', (err) => {
            console.error('[Redis] Erro na conexão:', err);
        });

        redisInstance.on('close', () => {
            console.warn('[Redis] Conexão fechada');
        });

        redisInstance.on('reconnecting', () => {
            console.log('[Redis] Reconectando...');
        });

        redisInstance.on('ready', () => {
            console.log('[Redis] Pronto para operações');
        });
    }

    return redisInstance;
}

/**
 * Opções padrão para filas BullMQ
 */
export function getBullQueueOptions(): QueueOptions {
    return {
        connection: getRedisConnection(),
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
            removeOnComplete: true,
            removeOnFail: false,
        },
    };
}

/**
 * Opções padrão para workers BullMQ
 */
export function getBullWorkerOptions(): WorkerOptions {
    return {
        connection: getRedisConnection(),
        concurrency: 5,
        lockDuration: 30000,
        maxStalledCount: 3,
    };
}