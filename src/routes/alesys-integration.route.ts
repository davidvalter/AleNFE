import { FastifyInstance } from "fastify";
import { prisma } from "../config/database";
import { apiKeyAuth } from "../modules/fiscal/core/middlewares/api-key-auth";

/**
 * Endpoints de leitura usados pelo Alesys ERP.
 * A empresa é sempre obtida da API Key validada pelo middleware.
 */
export async function alesysIntegrationRoutes(app: FastifyInstance) {
  app.get<{
    Querystring: { page?: string; limit?: string };
  }>(
    "/notas-compras",
    { preHandler: apiKeyAuth },
    async (request, reply) => {
      const empresaId = Number((request as any).empresa?.id);
      if (!Number.isSafeInteger(empresaId) || empresaId <= 0) {
        return reply.status(401).send({
          success: false,
          message: "Não foi possível identificar a empresa vinculada à API Key."
        });
      }

      const pageRaw = request.query.page ?? "1";
      const limitRaw = request.query.limit ?? "50";
      if (!/^\\d+$/.test(pageRaw) || !/^\\d+$/.test(limitRaw)) {
        return reply.status(400).send({
          success: false,
          message: "Os parâmetros page e limit devem ser inteiros positivos."
        });
      }
      const page = Number(pageRaw);
      const requestedLimit = Number(limitRaw);
      if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(requestedLimit)) {
        return reply.status(400).send({
          success: false,
          message: "Os parâmetros de paginação estão fora do intervalo permitido."
        });
      }
      const limit = Math.min(100, Math.max(1, requestedLimit));
      const skip = (page - 1) * limit;
      if (!Number.isSafeInteger(skip)) {
        return reply.status(400).send({
          success: false,
          message: "A página solicitada excede o limite permitido."
        });
      }

      try {
        const where = { empresaId };
        const [notas, total] = await Promise.all([
          prisma.nFe.findMany({
            where,
            orderBy: [{ dataEmissao: "desc" }, { id: "desc" }],
            skip,
            take: limit,
            select: {
              id: true,
              chaveAcesso: true,
              numero: true,
              serie: true,
              modelo: true,
              fornecedorCNPJ: true,
              fornecedorNome: true,
              dataEmissao: true,
              dataRecebimento: true,
              valorProdutos: true,
              valorNota: true,
              valorFrete: true,
              valorDesconto: true,
              valorICMS: true,
              valorIPI: true,
              valorPIS: true,
              valorCOFINS: true,
              protocolo: true,
              situacao: true,
              xmlBaixado: true,
              createdAt: true,
              itens: {
                orderBy: { itemNumero: "asc" },
                select: {
                  itemNumero: true,
                  codigo: true,
                  descricao: true,
                  ncm: true,
                  cfop: true,
                  unidade: true,
                  quantidade: true,
                  valorUnitario: true,
                  valorTotal: true
                }
              }
            }
          }),
          prisma.nFe.count({ where })
        ]);

        return { success: true, total, page, limit, notas };
      } catch (error: any) {
        app.log.error(error, "Erro ao listar notas de compra para o Alesys");
        return reply.status(500).send({
          success: false,
          message: "Não foi possível consultar as notas de compra."
        });
      }
    }
  );

  app.get<{ Params: { id: string } }>(
    "/notas-compras/:id/xml",
    { preHandler: apiKeyAuth },
    async (request, reply) => {
      const empresaId = Number((request as any).empresa?.id);
      const id = Number(request.params.id);
      if (!Number.isSafeInteger(empresaId) || empresaId <= 0) {
        return reply.status(401).send({
          success: false,
          message: "Não foi possível identificar a empresa vinculada à API Key."
        });
      }
      if (!Number.isSafeInteger(id) || id <= 0) {
        return reply.status(400).send({
          success: false,
          message: "ID da nota inválido."
        });
      }

      try {
        const nota = await prisma.nFe.findFirst({
          where: { id, empresaId },
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
            message: "Nota de compra não encontrada."
          });
        }

        const xml = nota.xmlStorage?.xmlProc || nota.xmlStorage?.xmlOriginal;
        if (nota.situacao !== "XML_COMPLETO" || !xml) {
          return reply.status(404).send({
            success: false,
            message: "XML completo não disponível para esta nota."
          });
        }

        const nomeArquivo = `NFe-${nota.chaveAcesso.replace(/[^a-zA-Z0-9_-]/g, "")}.xml`;
        return reply
          .header("Content-Type", "application/xml; charset=utf-8")
          .header("Content-Disposition", `attachment; filename="${nomeArquivo}"`)
          .send(xml);
      } catch (error: any) {
        app.log.error(error, "Erro ao obter XML de compra para o Alesys");
        return reply.status(500).send({
          success: false,
          message: "Não foi possível obter o XML desta nota."
        });
      }
    }
  );
}
