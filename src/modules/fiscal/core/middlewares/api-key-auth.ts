// src/modules/fiscal/core/middlewares/api-key-auth.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../../../config/database';

/**
 * Middleware de autenticação por API Key.
 * Valida a chave no header x-api-key e anexa a empresa na requisição.
 * 
 * O empresaId vem da API Key validada — NÃO do body da requisição.
 * Isso impede que um sistema emita notas em nome de outra empresa.
 */
export async function apiKeyAuth(request: FastifyRequest, reply: FastifyReply) {
  const apiKey = request.headers['x-api-key'] as string;

  if (!apiKey) {
    return reply.status(401).send({
      success: false,
      error: 'API Key não fornecida. Envie no header x-api-key.'
    });
  }

  // Valida formato mínimo (ak_ + 32 chars hex)
  if (!apiKey.startsWith('ak_') || apiKey.length < 35) {
    return reply.status(401).send({
      success: false,
      error: 'Formato de API Key inválido.'
    });
  }

  // Busca a empresa pela chave ativa
  const empresa = await prisma.empresa.findFirst({
    where: {
      apiKey: apiKey,
      apiKeyAtiva: true
    },
    select: {
      id: true,
      razaoSocial: true,
      cnpj: true,
      uf: true
    }
  });

  if (!empresa) {
    return reply.status(401).send({
      success: false,
      error: 'API Key inválida ou inativa.'
    });
  }

  // Anexa a empresa na requisição para uso nas rotas
  (request as any).empresa = empresa;
}