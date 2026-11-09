import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authPreHandler, requireAdmin } from '../middlewares/auth.middleware';

const JWT_SECRET: string = process.env.JWT_SECRET || '';
// CORRIGIDO: tipo esperado pelo jsonwebtoken v9 (number | StringValue)
const JWT_EXPIRES: jwt.SignOptions["expiresIn"] =
  (process.env.JWT_EXPIRES ?? "8h") as jwt.SignOptions["expiresIn"];

interface CreateUserBody {
  nome: string;
  usuario: string;
  senha: string;
  role: string;
}
interface UpdateUserBody {
  nome?: string;
  usuario?: string;
  role?: string;
  ativo?: boolean;
}
interface LoginBody {
  usuario: string;
  senha: string;
}

export async function userRoutes(fastify: FastifyInstance) {
  // =========================
  // POST /api/login — EMITE JWT (rota aberta)
  // =========================
  fastify.post<{ Body: LoginBody }>('/api/login', async (request, reply) => {
    if (!JWT_SECRET) {
      console.error('JWT_SECRET não configurada no .env');
      return reply.status(500).send({ message: 'Servidor mal configurado' });
    }

    const { usuario, senha } = request.body;
    const user = await prisma.user.findUnique({ where: { usuario } });

    if (!user || !user.ativo || !(await bcrypt.compare(senha, user.senha))) {
      return reply.status(401).send({ message: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, nome: user.nome, usuario: user.usuario, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    return {
      success: true,
      token,
      user: { id: user.id, nome: user.nome, usuario: user.usuario, role: user.role }
    };
  });

  // =========================
  // USUÁRIOS — protegido (ADMIN)
  // CORRIGIDO: genéricos declarados explicitamente na rota,
  // para o TS resolver Params/Body mesmo com preHandler presente
  // =========================

  fastify.get(
    '/api/usuarios',
    { preHandler: [authPreHandler, requireAdmin] },
    async () => {
      return await prisma.user.findMany({
        select: { id: true, nome: true, usuario: true, role: true, ativo: true }
      });
    }
  );

  fastify.get<{ Params: { id: string } }>(
    '/api/usuarios/:id',
    { preHandler: [authPreHandler, requireAdmin] },
    async (request) => {
      return await prisma.user.findUnique({
        where: { id: request.params.id },
        select: { id: true, nome: true, usuario: true, role: true, ativo: true }
      });
    }
  );

  fastify.post<{ Body: CreateUserBody }>(
    '/api/usuarios',
    { preHandler: [authPreHandler, requireAdmin] },
    async (request, reply) => {
      const { nome, usuario, senha, role } = request.body;
      if (!['ADMIN', 'USER'].includes(role)) {
        return reply.status(400).send({ message: 'Role inválida' });
      }
      const hashedPassword = await bcrypt.hash(senha, 10);
      const user = await prisma.user.create({
        data: { nome, usuario, senha: hashedPassword, role }
      });
      const { senha: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
  );

  fastify.put<{ Params: { id: string }; Body: UpdateUserBody }>(
    '/api/usuarios/:id',
    { preHandler: [authPreHandler, requireAdmin] },
    async (request) => {
      return await prisma.user.update({
        where: { id: request.params.id },
        data: request.body,
        select: { id: true, nome: true, usuario: true, role: true, ativo: true }
      });
    }
  );

  fastify.delete<{ Params: { id: string } }>(
    '/api/usuarios/:id',
    { preHandler: [authPreHandler, requireAdmin] },
    async (request) => {
      return await prisma.user.delete({
        where: { id: request.params.id },
        select: { id: true }
      });
    }
  );
}