// src/modules/fiscal/nfce/routes/nfce-saida.routes.ts
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../../../config/database';
import { criarNFCeSaida } from '../services/nfce-saida.service';
import { NFCeInputSchema, NFCeInputDTO, validateNFeInput } from '../../dto/nfce-input.dto';
import { apiKeyAuth } from '../../core/middlewares/api-key-auth';
import { Value } from '@sinclair/typebox/value';

export async function nfceRoutes(app: FastifyInstance): Promise<void> {
  // =========================
  // POST /nfce/criar — PROTEGIDO
  // =========================
  app.post('/nfce/criar', {
    preHandler: [apiKeyAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const input = request.body as any;
      const empresa = (request as any).empresa; // ← vem do middleware

      // Validação com TypeBox
      if (!Value.Check(NFCeInputSchema, input)) {
        const errors = [...Value.Errors(NFCeInputSchema, input)];
        return reply.status(400).send({ success: false, errors });
      }

      // Validação adicional dos itens e pagamentos
      const validationError = validateNFeInput(input);
      if (validationError) {
        return reply.status(400).send({ success: false, errors: validationError.errors });
      }

      const empresaId = Number(empresa.id);
      const fiscalConfig = await prisma.empresaFiscalConfig.findUnique({
        where: { empresaId }
      });
      if (!fiscalConfig || ![1, 2].includes(Number(fiscalConfig.ambiente))) {
        return reply.status(409).send({
          success: false,
          error: 'Ambiente fiscal da empresa não configurado no ALENFE.'
        });
      }

      const ambiente = Number(fiscalConfig.ambiente);
      if (input.ambiente !== undefined && Number(input.ambiente) !== ambiente) {
        return reply.status(409).send({
          success: false,
          error: `Ambiente divergente: PDV=${input.ambiente}, ALENFE=${ambiente}. Alinhe ALENFE_AMBIENTE e a configuração fiscal da empresa.`
        });
      }

      const cpfCnpj = String(input.cliente?.cpfCnpj ?? '').replace(/\\D/g, '');
      if (ambiente === 2 && !/^\\d{11}$|^\\d{14}$/.test(cpfCnpj)) {
        return reply.status(400).send({
          success: false,
          error: 'Em Homologação, informe CPF (11 dígitos) ou CNPJ (14 dígitos).'
        });
      }

      // Na produção, o destinatário da NFC-e é sempre o consumidor não identificado.
      const cliente = ambiente === 1
        ? { nome: 'CONSUMIDOR' }
        : { cpfCnpj, nome: 'CONSUMIDOR' };

      // empresaId e ambiente são definidos pela configuração fiscal do ALENFE.
      const dados: NFCeInputDTO = {
        empresaId,
        ambiente,
        cliente,
        itens: input.itens,
        pagamentos: input.pagamentos,
      };

      // criarNFCeSaida registra e enfileira a emissão.
      const nfce = await criarNFCeSaida(dados);

      return reply.status(201).send({ success: true, id: nfce.id });
    } catch (error) {
      console.error('Erro ao criar NFCe:', error);
      return reply.status(500).send({ success: false, error: 'Erro interno do servidor' });
    }
  });

  // =========================
  // GET /nfce/:id — leitura (sem auth por enquanto)
  // =========================
  app.get('/nfce/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const idNumber = Number(id);

      const nfce = await prisma.nFeSaida.findUnique({ where: { id: idNumber } });

      if (!nfce) {
        return reply.status(404).send({ success: false, error: 'NFCe não encontrada' });
      }

      return reply.status(200).send({ success: true, nota: nfce });
    } catch (error) {
      console.error('Erro ao buscar NFCe:', error);
      return reply.status(500).send({ success: false, error: 'Erro interno do servidor' });
    }
  });

  // =========================
  // GET /nfce/:id/consulta — consulta leve para PDV
  // =========================
  app.get('/nfce/:id/consulta', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const idNumber = Number(id);

      const nota = await prisma.nFeSaida.findUnique({
        where: { id: idNumber },
        select: {
          id: true,
          numero: true,
          serie: true,
          status: true,
          chaveAcesso: true,
          protocolo: true,
          tpEmis: true,
          motivoRejeicao: true,
          motivoContingencia: true,
          dataEmissao: true,
          dataAutorizacao: true,
          dataContingencia: true,
          valorNota: true,
          xmlProc: true,
          xmlContingencia: true,
        }
      });

      if (!nota) {
        return reply.status(404).send({ success: false, error: 'NFC-e não encontrada' });
      }

      // Define qual XML o PDV deve usar para impressão
      let xmlImpressao: string | null = null;
      if (nota.status === 'AUTORIZADA' && nota.xmlProc) {
        xmlImpressao = nota.xmlProc;
      } else if (nota.status === 'CONTINGENCIA' && nota.xmlContingencia) {
        xmlImpressao = nota.xmlContingencia;
      }

      return reply.send({
        success: true,
        nota: {
          id: nota.id,
          numero: nota.numero,
          serie: nota.serie,
          status: nota.status,
          chaveAcesso: nota.chaveAcesso,
          protocolo: nota.protocolo,
          tpEmis: nota.tpEmis,
          motivoRejeicao: nota.motivoRejeicao,
          motivoContingencia: nota.motivoContingencia,
          dataEmissao: nota.dataEmissao,
          dataAutorizacao: nota.dataAutorizacao,
          dataContingencia: nota.dataContingencia,
          valorNota: nota.valorNota,
          xmlImpressao,
        }
      });
    } catch (error) {
      console.error('Erro ao consultar NFC-e:', error);
      return reply.status(500).send({ success: false, error: 'Erro interno do servidor' });
    }
  });
}