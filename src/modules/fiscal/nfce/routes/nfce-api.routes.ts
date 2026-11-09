// src/modules/fiscal/nfce/routes/nfce-api.routes.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../../../config/database';

interface NFeSaidaListResponse {
    id: number;
    numero: number;
    cliente: string;
    valor: number;
    status: string;
    dataCriacao: string;
    chaveAcesso: string | null;
    protocolo: string | null;
    motivoRejeicao: string | null;
    tpEmis: number | null;
}

export default async function nfceRoutes(fastify: FastifyInstance) {
    // GET /api/nfce - List all NFC-e
    fastify.get('/api/nfce', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            request.log.info('Fetching all NFC-e');
            const nfces = await prisma.nFeSaida.findMany({
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    numero: true,
                    clienteNome: true,
                    valorNota: true,
                    status: true,
                    createdAt: true,
                    chaveAcesso: true,
                    protocolo: true,
                    motivoRejeicao: true,
                    tpEmis: true,
                },
            });

            const response: NFeSaidaListResponse[] = nfces.map((nfe) => ({
                id: nfe.id,
                numero: nfe.numero,
                cliente: nfe.clienteNome ?? '',
                valor: nfe.valorNota instanceof Decimal ? nfe.valorNota.toNumber() : 0,
                status: nfe.status,
                dataCriacao: nfe.createdAt.toISOString(),
                chaveAcesso: nfe.chaveAcesso ?? null,
                protocolo: nfe.protocolo ?? null,
                motivoRejeicao: nfe.motivoRejeicao ?? null,
                tpEmis: nfe.tpEmis ?? null,
            }));

            request.log.info(`Found ${response.length} NFC-e`);
            return reply.send(response);
        } catch (error) {
            request.log.error(error, 'Error fetching NFC-e list');
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    // GET /api/nfce/:id - Details of a single NFC-e
    fastify.get('/api/nfce/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
        const { id } = request.params;
        const numericId = parseInt(id, 10);

        if (isNaN(numericId) || numericId <= 0) {
            request.log.warn({ id }, 'Invalid NFC-e ID');
            return reply.status(400).send({ error: 'ID must be a positive integer' });
        }

        try {
            request.log.info({ id: numericId }, 'Fetching NFC-e details');
            const nfe = await prisma.nFeSaida.findUnique({
                where: { id: numericId },
                include: {
                    itens: true,
                    pagamentos: true,
                },
            });

            if (!nfe) {
                request.log.info({ id: numericId }, 'NFC-e not found');
                return reply.status(404).send({ error: 'NFC-e not found' });
            }

            return reply.send({
                id: nfe.id,
                numero: nfe.numero,
                cliente: nfe.clienteNome ?? '',
                valor: nfe.valorNota instanceof Decimal ? nfe.valorNota.toNumber() : 0,
                status: nfe.status,
                tpEmis: nfe.tpEmis ?? null,
                dataCriacao: nfe.createdAt.toISOString(),
                chaveAcesso: nfe.chaveAcesso ?? null,
                protocolo: nfe.protocolo ?? null,
                motivoRejeicao: nfe.motivoRejeicao ?? null,
                motivoContingencia: nfe.motivoContingencia ?? null,
                dataContingencia: nfe.dataContingencia?.toISOString() ?? null,
                dataAutorizacao: nfe.dataAutorizacao?.toISOString() ?? null,
                xmlEnvio: nfe.xmlEnvio ?? null,
                xmlRetorno: nfe.xmlRetorno ?? null,
                xmlProc: nfe.xmlProc ?? null,
                xmlContingencia: nfe.xmlContingencia ?? null,
                itens: nfe.itens,
                pagamentos: nfe.pagamentos,
            });
        } catch (error) {
            request.log.error(error, 'Error fetching NFC-e details');
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    // GET /api/nfce/:id/logs - Logs de processamento da NFC-e
    fastify.get('/api/nfce/:id/logs', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
        const { id } = request.params;
        const numericId = parseInt(id, 10);

        if (isNaN(numericId) || numericId <= 0) {
            return reply.status(400).send({ error: 'ID must be a positive integer' });
        }

        try {
            const logs = await prisma.nFCeLog.findMany({
                where: { nfceId: numericId },
                orderBy: { createdAt: 'asc' },
            });

            return reply.send(logs);
        } catch (error) {
            request.log.error(error, 'Error fetching NFC-e logs');
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });
}