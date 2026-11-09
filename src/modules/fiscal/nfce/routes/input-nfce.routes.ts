// src/modules/fiscal/nfce/routes/input-nfce.routes.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { NFCeInputSchema, NFCeInputDTO } from "../../dto/nfce-input.dto";
import { criarNFCeSaida } from "../services/nfce-saida.service";
import { enqueueNfceEmission } from "../queues/nfce-queue";
import { apiKeyAuth } from "../../core/middlewares/api-key-auth";
import { Value } from "@sinclair/typebox/value";

export async function inputNFCeRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<TypeBoxTypeProvider>();

  server.post(
    "/input_nfce",
    {
      preHandler: [apiKeyAuth],
      schema: {
        body: NFCeInputSchema
      }
    },
    async (request, reply) => {
      try {
        const input = request.body as any;
        const empresa = (request as any).empresa;

        if (!Value.Check(NFCeInputSchema, input)) {
          const errors = [...Value.Errors(NFCeInputSchema, input)];
          return reply.status(400).send({ success: false, errors });
        }

        const dados: NFCeInputDTO = {
          empresaId: empresa.id,
          cliente: input.cliente,
          itens: input.itens,
          pagamentos: input.pagamentos,
        };

        const nfce = await criarNFCeSaida(dados);

        enqueueNfceEmission(nfce.id).catch((err) => {
          console.error('Erro ao enfileirar emissão NFC-e:', err);
        });

        return reply.status(201).send({
          success: true,
          message: "NFC-e recebida com sucesso",
          id: nfce.id
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: error.message
        });
      }
    }
  );
}