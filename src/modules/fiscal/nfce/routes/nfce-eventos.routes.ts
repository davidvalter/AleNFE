// src/modules/fiscal/nfce/routes/nfce-eventos.routes.ts
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { inutilizarNumeracao } from '../services/nfce-inutilizacao.service';
import { cancelarNFCe } from '../services/nfce-cancelamento.service';
import { apiKeyAuth } from '../../core/middlewares/api-key-auth';
import { prisma } from "../../../../config/database";

export async function nfceEventosRoutes(app: FastifyInstance): Promise<void> {

    // =========================
    // POST /nfce/inutilizar — inutilizar faixa de numeração
    // =========================
    app.post('/nfce/inutilizar', {
        preHandler: [apiKeyAuth]
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        const empresa = (request as any).empresa;
        const { ano, modelo, serie, nNFIni, nNFFin, xJust } = request.body as {
            ano: number;
            modelo: number;
            serie: number;
            nNFIni: number;
            nNFFin: number;
            xJust: string;
        };

        if (!ano || !modelo || !serie || nNFIni === undefined || nNFFin === undefined || !xJust) {
            return reply.status(400).send({
                success: false,
                message: 'Campos obrigatórios: ano, modelo, serie, nNFIni, nNFFin, xJust'
            });
        }

        if (xJust.length < 15) {
            return reply.status(400).send({
                success: false,
                message: 'Justificativa deve ter no mínimo 15 caracteres'
            });
        }

        if (xJust.length > 255) {
            return reply.status(400).send({
                success: false,
                message: 'Justificativa deve ter no máximo 255 caracteres'
            });
        }

        try {
            const resultado = await inutilizarNumeracao(
                empresa.id,
                Number(ano),
                Number(modelo),
                Number(serie),
                Number(nNFIni),
                Number(nNFFin),
                String(xJust)
            );
            return reply.send(resultado);
        } catch (error: any) {
            console.error('[ROTAS] Erro inutilização:', error);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    // =========================
    // POST /nfce/:id/cancelar — cancelar NFC-e autorizada
    // =========================
    app.post('/nfce/:id/cancelar', {
        preHandler: [apiKeyAuth]
    }, async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string };
        const { xJust } = request.body as { xJust: string };

        if (!xJust || xJust.length < 15) {
            return reply.status(400).send({
                success: false,
                message: 'Justificativa (xJust) é obrigatória e deve ter no mínimo 15 caracteres'
            });
        }

        if (xJust.length > 255) {
            return reply.status(400).send({
                success: false,
                message: 'Justificativa deve ter no máximo 255 caracteres'
            });
        }

        try {
            const resultado = await cancelarNFCe(Number(id), String(xJust));
            return reply.send(resultado);
        } catch (error: any) {
            console.error('[ROTAS] Erro cancelamento:', error);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    // =========================
    // POST /nfce/:id/cancelar-web — cancelar NFC-e pelo painel ALENFE
    // (rota separada do PDV; resolve a API Key da empresa internamente)
    // =========================
    app.post('/api/nfce/:id/cancelar-web', async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string };
        const { xJust } = request.body as { xJust: string };

        // Validação da justificativa (mesmas regras da rota do PDV)
        if (!xJust || xJust.length < 15) {
            return reply.status(400).send({
                success: false,
                message: 'Justificativa (xJust) é obrigatória e deve ter no mínimo 15 caracteres'
            });
        }

        if (xJust.length > 255) {
            return reply.status(400).send({
                success: false,
                message: 'Justificativa deve ter no máximo 255 caracteres'
            });
        }

        try {
            // ===== 1. Busca a NFC-e (NFeSaida) para descobrir a empresa dona =====
            const nfce = await prisma.nFeSaida.findUnique({
                where: { id: Number(id) },
                select: { id: true, empresaId: true, status: true }
            });
            if (!nfce) {
                return reply.status(404).send({ success: false, message: 'NFC-e não encontrada' });
            }

            // ===== 2. Busca a API Key da empresa dona da NFC-e =====
            const empresa = await prisma.empresa.findUnique({
                where: { id: nfce.empresaId },
                select: { id: true, apiKey: true, apiKeyAtiva: true }
            });

            if (!empresa?.apiKey || !empresa.apiKeyAtiva) {
                return reply.status(400).send({
                    success: false,
                    message: 'API Key da empresa não encontrada ou inativa. Verifique o cadastro da empresa.'
                });
            }

            // ===== 3. Executa o cancelamento usando a chave da empresa =====
            const resultado = await cancelarNFCe(Number(id), String(xJust));
            return reply.send(resultado);
        } catch (error: any) {
            console.error('[ROTAS] Erro cancelamento (painel):', error);
            return reply.status(500).send({ success: false, message: error.message });
        }
    });
}