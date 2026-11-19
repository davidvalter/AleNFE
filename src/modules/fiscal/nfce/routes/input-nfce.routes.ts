// src/modules/fiscal/nfce/routes/input-nfce.routes.ts
import { FastifyInstance } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { NFCeInputSchema, NFCeInputDTO, validateNFeInput } from "../../dto/nfce-input.dto";
import { criarNFCeSaida } from "../services/nfce-saida.service";
import { apiKeyAuth } from "../../core/middlewares/api-key-auth";
import { Value } from "@sinclair/typebox/value";
import { prisma } from "../../../../config/database";

export async function inputNFCeRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<TypeBoxTypeProvider>();

  server.post(
    "/input_nfce",
    {
      preHandler: [apiKeyAuth],
      schema: { body: NFCeInputSchema }
    },
    async (request, reply) => {
      try {
        const input = request.body as any;
        const empresa = (request as any).empresa;

        if (!Value.Check(NFCeInputSchema, input)) {
          const errors = [...Value.Errors(NFCeInputSchema, input)];
          return reply.status(400).send({ success: false, errors });
        }

        const validationError = validateNFeInput(input);
        if (validationError) {
          return reply.status(400).send({ success: false, errors: validationError.errors });
        }

        const empresaId = Number(empresa.id);
        const fiscalConfig = await prisma.empresaFiscalConfig.findUnique({ where: { empresaId } });
        if (!fiscalConfig || ![1, 2].includes(Number(fiscalConfig.ambiente))) {
          return reply.status(409).send({
            success: false,
            error: "Ambiente fiscal da empresa não configurado no ALENFE."
          });
        }

        const ambiente = Number(fiscalConfig.ambiente);
        if (input.ambiente !== undefined && Number(input.ambiente) !== ambiente) {
          return reply.status(409).send({
            success: false,
            error: `Ambiente divergente: PDV=${input.ambiente}, ALENFE=${ambiente}. Alinhe ALENFE_AMBIENTE e a configuração fiscal da empresa.`
          });
        }

        const cpfCnpj = String(input.cliente?.cpfCnpj ?? "").replace(/\\D/g, "");
        if (ambiente === 2 && !/^\\d{11}$|^\\d{14}$/.test(cpfCnpj)) {
          return reply.status(400).send({
            success: false,
            error: "Em Homologação, informe CPF (11 dígitos) ou CNPJ (14 dígitos)."
          });
        }

        const cliente = ambiente === 1
          ? { nome: "CONSUMIDOR" }
          : { cpfCnpj, nome: "CONSUMIDOR" };

        const dados: NFCeInputDTO = {
          empresaId,
          ambiente,
          cliente,
          itens: input.itens,
          pagamentos: input.pagamentos,
        };

        // criarNFCeSaida registra e enfileira a emissão.
        const nfce = await criarNFCeSaida(dados);
        return reply.status(201).send({
          success: true,
          message: "NFC-e recebida com sucesso",
          id: nfce.id
        });
      } catch (error: any) {
        app.log.error(error, "Erro ao receber NFC-e");
        return reply.status(500).send({
          success: false,
          message: error.message
        });
      }
    }
  );
}
