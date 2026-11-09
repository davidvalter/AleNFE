// src/app.ts
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';
import multipart from '@fastify/multipart';
import { authPreHandler } from './middlewares/auth.middleware';
import { userRoutes } from './routes/user.routes';
import sefazRoutes from './routes/sefaz.routes';
import { logsRoutes } from './routes/logs.route';
import { notasRoutes } from './routes/notas.route';
import { inputNFCeRoutes } from './modules/fiscal/nfce/routes/input-nfce.routes';
import { nfceRoutes } from './modules/fiscal/nfce/routes/nfce-saida.routes';
import { nfceEventosRoutes } from "./modules/fiscal/nfce/routes/nfce-eventos.routes";
import { monitoringRoutes } from './modules/fiscal/nfce/routes/monitoring.routes';
import nfceApiRoutes from './modules/fiscal/nfce/routes/nfce-api.routes';
import { empresaRoutes } from './routes/empresas.route';
import { webhookConfigRoutes } from './modules/fiscal/core/webhook/webhook-config.routes';
import { dashboardRoutes } from './routes/dashboard.route';


export async function buildApp() {
  const app = Fastify({ logger: true });

  // ##### SERVIR FRONTEND ##### //

  //index
  await app.register(fastifyStatic, {
    root: path.join(__dirname, './public'),
    prefix: '/'
  });

  //Detalhes das notas enviadas
  app.get('/detalhes/:id', async (request, reply) => {
    return reply.sendFile('nfce-detail.html');
  });

  //Criar novas notas para enviar
  app.get('/criar', async (request, reply) => {
    return reply.sendFile('create-nfce.html');
  });

  // Multipart para configurações de diretorio para o Certificado PFX:
  await app.register(multipart, {
    limits: { fileSize: 1024 * 1024 }  // 1MB — PFX é pequeno
  });

  await app.register(sefazRoutes, { prefix: '/sefaz', preHandler: authPreHandler });
  await app.register(logsRoutes, { prefix: '/api', preHandler: authPreHandler });
  await app.register(notasRoutes, { prefix: '/api', preHandler: authPreHandler });
  await app.register(inputNFCeRoutes, { prefix: '/input' });
  await app.register(nfceRoutes);
  await app.register(nfceEventosRoutes);
  await app.register(monitoringRoutes, { prefix: '/api' });
  await app.register(nfceApiRoutes);
  await app.register(empresaRoutes, { preHandler: authPreHandler });
  await app.register(userRoutes);
  await app.register(webhookConfigRoutes);
  await app.register(dashboardRoutes, { prefix: '/api', preHandler: authPreHandler });

  return app;
}