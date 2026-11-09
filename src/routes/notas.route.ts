import { FastifyInstance } from "fastify";
import { prisma } from "../config/database";
import { reprocessarNotas } from "../scripts/reprocessar-notas";

export async function notasRoutes(app: FastifyInstance) {
  // =========================
  // LISTAGEM (sempre por empresa)
  // =========================
  app.get<{ Querystring: { empresaId?: string; page?: string; limit?: string } }>(
    "/notas",
    async (request, reply) => {
      try {
        const empresaId = Number(request.query.empresaId);
        if (!empresaId) {
          return reply.status(400).send({
            success: false,
            message: "Parâmetro empresaId é obrigatório."
          });
        }

        const page = Math.max(1, Number(request.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 50));

        const [notas, total] = await Promise.all([
          prisma.nFe.findMany({
            where: { empresaId },
            orderBy: { dataEmissao: "desc" },
            skip: (page - 1) * limit,
            take: limit,
            include: { itens: true }
          }),
          prisma.nFe.count({ where: { empresaId } })
        ]);

        return { success: true, total, page, limit, notas };
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: error.message
        });
      }
    }
  );

  // =========================
  // REPROCESSAR NOTAS
  // =========================
  app.post("/notas/reprocessar", async (_request, reply) => {
    try {
      // Fire-and-forget SEGURO: falhas são capturadas, nunca derrubam o processo
      reprocessarNotas().catch((err) =>
        app.log.error(err, "Falha no reprocessamento de notas")
      );
      return reply.status(202).send({
        success: true,
        message: "Reprocessamento iniciado em background"
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message
      });
    }
  });
}