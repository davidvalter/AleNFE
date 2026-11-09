import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '';

export interface JwtPayload {
  id: string;
  nome: string;
  usuario: string;
  role: 'ADMIN' | 'USER';
}

/**
 * Exige JWT válido no header Authorization: Bearer <token>.
 * Popula request.user com o payload do token.
 */
export async function authPreHandler(req: FastifyRequest, reply: FastifyReply) {
  if (!JWT_SECRET) {
    return reply.status(500).send({ success: false, message: 'Servidor mal configurado' });
  }

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return reply.status(401).send({ success: false, message: 'Não autenticado' });
  }

  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as JwtPayload;
    (req as any).user = payload;
  } catch {
    return reply.status(401).send({ success: false, message: 'Token inválido ou expirado' });
  }
}

/**
 * Exige role ADMIN (usar DEPOIS do authPreHandler).
 */
export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  const user = (req as any).user as JwtPayload | undefined;
  if (user?.role !== 'ADMIN') {
    return reply.status(403).send({ success: false, message: 'Acesso restrito ao administrador' });
  }
}