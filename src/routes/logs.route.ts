import { FastifyInstance } from "fastify";
import { prisma } from "../config/database";

export async function logsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { empresaId?: string; limit?: string } }>(
    "/logs",
    async (request) => {
      const empresaId = Number(request.query.empresaId);
      const limit = Math.min(200, Math.max(1, Number(request.query.limit) || 50));

      return prisma.importacaoLog.findMany({
        where: empresaId ? { empresaId } : undefined,
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { empresa: true }
      });
    }
  );
}