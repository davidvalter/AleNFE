// src/server.ts
import dotenv from 'dotenv'
dotenv.config()

import { buildApp } from './app';
import { initNfceQueue } from './modules/fiscal/nfce/queues/nfce-queue';
import { iniciarSyncContingencia, pararSyncContingencia } from './modules/fiscal/nfce/services/nfce-sync-contingencia.service';

async function start() {
  try {
    await initNfceQueue();
    iniciarSyncContingencia();
    console.log('[NFC-e Queue] Fila e sync de contingência inicializados');

    const app = await buildApp();
    await app.listen({ port: Number(process.env.PORT || 3001), host: '0.0.0.0' });
    console.log('AleNFE service running');

    // ✅ Shutdown graceful — só para o worker quando o processo for encerrado
    process.on('SIGINT', () => {
      console.log('[Server] Encerrando...');
      pararSyncContingencia();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('[Server] Encerrando (SIGTERM)...');
      pararSyncContingencia();
      process.exit(0);
    });

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();