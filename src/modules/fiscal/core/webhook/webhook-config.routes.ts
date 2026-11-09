// src/modules/fiscal/core/webhook/webhook-config.routes.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../../../config/database';
import crypto from 'crypto';

export async function webhookConfigRoutes(app: FastifyInstance): Promise<void> {

  // =========================
  // GET /api/empresas/:empresaId/webhook — buscar config
  // =========================
  app.get('/api/empresas/:empresaId/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    const { empresaId } = request.params as { empresaId: string };

    const config = await prisma.webhookConfig.findUnique({
      where: { empresaId: Number(empresaId) },
      select: {
        id: true,
        empresaId: true,
        url: true,
        ativo: true,
        eventos: true,
        secret: true,
        tentativas: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!config) {
      return reply.status(404).send({ message: 'Webhook não configurado' });
    }

    return reply.send(config);
  });

  // =========================
  // POST /api/empresas/:empresaId/webhook — criar config
  // =========================
  app.post('/api/empresas/:empresaId/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    const { empresaId } = request.params as { empresaId: string };
    const { url, eventos, secret, tentativas } = request.body as any;

    if (!url) {
      return reply.status(400).send({ message: 'URL é obrigatória' });
    }

    try {
      new URL(url);
    } catch {
      return reply.status(400).send({ message: 'URL inválida' });
    }

    const secretFinal = secret || 'whsec_' + crypto.randomBytes(16).toString('hex');

    try {
      const config = await prisma.webhookConfig.create({
        data: {
          empresaId: Number(empresaId),
          url,
          ativo: true,
          eventos: eventos || '*',
          secret: secretFinal,
          tentativas: tentativas || 3
        },
        select: {
          id: true,
          empresaId: true,
          url: true,
          ativo: true,
          eventos: true,
          secret: true,
          tentativas: true,
          createdAt: true
        }
      });

      return reply.status(201).send(config);
    } catch (e: any) {
      if (e.code === 'P2002') {
        return reply.status(409).send({ message: 'Webhook já configurado para esta empresa. Use PUT para atualizar.' });
      }
      throw e;
    }
  });

  // =========================
  // PUT /api/empresas/:empresaId/webhook — atualizar config
  // =========================
  app.put('/api/empresas/:empresaId/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    const { empresaId } = request.params as { empresaId: string };
    const { url, ativo, eventos, secret, tentativas } = request.body as any;

    if (url) {
      try {
        new URL(url);
      } catch {
        return reply.status(400).send({ message: 'URL inválida' });
      }
    }

    const data: any = {};
    if (url !== undefined) data.url = url;
    if (ativo !== undefined) data.ativo = ativo;
    if (eventos !== undefined) data.eventos = eventos;
    if (tentativas !== undefined) data.tentativas = tentativas;
    if (secret !== undefined) data.secret = secret;

    try {
      const config = await prisma.webhookConfig.update({
        where: { empresaId: Number(empresaId) },
        data,
        select: {
          id: true,
          empresaId: true,
          url: true,
          ativo: true,
          eventos: true,
          secret: true,
          tentativas: true,
          updatedAt: true
        }
      });

      return reply.send(config);
    } catch (e: any) {
      if (e.code === 'P2025') {
        return reply.status(404).send({ message: 'Webhook não encontrado. Use POST para criar.' });
      }
      throw e;
    }
  });

  // =========================
  // DELETE /api/empresas/:empresaId/webhook — remover config
  // =========================
  app.delete('/api/empresas/:empresaId/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    const { empresaId } = request.params as { empresaId: string };

    try {
      await prisma.webhookConfig.delete({
        where: { empresaId: Number(empresaId) }
      });
      return reply.status(204).send();
    } catch (e: any) {
      if (e.code === 'P2025') {
        return reply.status(404).send({ message: 'Webhook não encontrado' });
      }
      throw e;
    }
  });

  // =========================
  // GET /api/empresas/:empresaId/webhook/logs — histórico de entregas
  // =========================
  app.get('/api/empresas/:empresaId/webhook/logs', async (request: FastifyRequest, reply: FastifyReply) => {
    const { empresaId } = request.params as { empresaId: string };
    const query = request.query as { nfceId?: string; sucesso?: string; limit?: string };

    const config = await prisma.webhookConfig.findUnique({
      where: { empresaId: Number(empresaId) },
      select: { id: true }
    });

    if (!config) {
      return reply.status(404).send({ message: 'Webhook não configurado' });
    }

    const where: any = { webhookConfigId: config.id };
    if (query.nfceId) where.nfceId = Number(query.nfceId);
    if (query.sucesso === 'true') where.sucesso = true;
    if (query.sucesso === 'false') where.sucesso = false;

    const logs = await prisma.webhookLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.limit ? Number(query.limit) : 50
    });

    return reply.send(logs);
  });
}