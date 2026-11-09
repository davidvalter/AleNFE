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
  // DOWNLOAD DO XML COMPLETO DE UMA NOTA
  // =========================
  app.get<{ Params: { id: string } }>("/notas/:id/xml", async (request, reply) => {
    const id = Number(request.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return reply.status(400).send({
        success: false,
        message: "ID da nota inválido."
      });
    }

    try {
      const nota = await prisma.nFe.findUnique({
        where: { id },
        select: {
          chaveAcesso: true,
          situacao: true,
          xmlStorage: {
            select: {
              xmlOriginal: true,
              xmlProc: true
            }
          }
        }
      });

      if (!nota) {
        return reply.status(404).send({
          success: false,
          message: "Nota não encontrada."
        });
      }

      const xml = nota.xmlStorage?.xmlProc || nota.xmlStorage?.xmlOriginal;
      if (nota.situacao !== "XML_COMPLETO" || !xml) {
        return reply.status(404).send({
          success: false,
          message: "XML completo não encontrado para esta nota."
        });
      }

      const nomeArquivo = `NFe-${nota.chaveAcesso.replace(/[^a-zA-Z0-9_-]/g, "")}.xml`;
      return reply
        .header("Content-Type", "application/xml; charset=utf-8")
        .header("Content-Disposition", `attachment; filename="${nomeArquivo}"`)
        .send(xml);
    } catch (error: any) {
      app.log.error(error, "Erro ao baixar XML da nota");
      return reply.status(500).send({
        success: false,
        message: "Não foi possível baixar o XML desta nota."
      });
    }
  });

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