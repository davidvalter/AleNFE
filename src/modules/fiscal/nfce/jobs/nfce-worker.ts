// src/modules/fiscal/nfce/jobs/nfce-worker.ts
import { Job } from 'bullmq';
import { prisma } from '../../../../config/database';
import { gerarXMLNFCe } from '../services/nfce-xml-builder.service';
import { assinarXMLNFCe } from '../../core/assinatura/xml-sign.service';
import { enviarNFCe } from '../services/nfce-send.service';
import { NfceLogger } from '../services/nfce-logger';

// ✅ Erros que justificam retry (problemas temporários de rede/SEFAZ)
function isRetriableError(errMsg: string): boolean {
  const msg = errMsg.toLowerCase();
  return (
    msg.includes('timeout') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    msg.includes('etimedout') ||
    msg.includes('econnreset') ||
    msg.includes('erro ao comunicar com sefaz') ||
    msg.includes('socket hang up') ||
    msg.includes('network')
  );
}

async function processNFCeWorker(job: Job<{ nfceId: number }>): Promise<void> {
  const { nfceId } = job.data;
  const logger = new NfceLogger(job.id, nfceId);

  // ✅ LOCK ATÔMICO — aceita estados intermediários para retry idempotente
  const lockResult = await prisma.nFeSaida.updateMany({
    where: { id: nfceId, status: { in: ['PENDENTE', 'XML_GERADO', 'ASSINADA'] } },
    data: { status: 'PROCESSANDO' }
  });

  if (lockResult.count === 0) {
    const notaCheck = await prisma.nFeSaida.findUnique({
      where: { id: nfceId },
      select: { status: true }
    });
    if (notaCheck && ['AUTORIZADA', 'PROCESSADO', 'CONTINGENCIA', 'REJEITADA', 'ERRO'].includes(notaCheck.status)) {
      console.log(`[WORKER] NFC-e ${nfceId} já processada (status: ${notaCheck.status}), pulando...`);
      return;
    }
    console.log(`[WORKER] NFC-e ${nfceId} já em processamento por outro worker, pulando...`);
    return;
  }

  try {
    const nfeSaida = await prisma.nFeSaida.findUnique({
      where: { id: nfceId }
    });
    if (!nfeSaida) {
      throw new Error(`NFeSaida with id ${nfceId} not found`);
    }

    if (['AUTORIZADA', 'PROCESSADO', 'CONTINGENCIA', 'REJEITADA'].includes(nfeSaida.status)) {
      console.log(`[WORKER] NFC-e ${nfceId} já processada (status: ${nfeSaida.status}), pulando...`);
      return;
    }

    // ✅ Log de retry
    if (job.attemptsMade > 0) {
      console.log(`[WORKER] NFC-e ${nfceId} — tentativa ${job.attemptsMade + 1} de ${job.opts.attempts || 1}`);
    }

    logger.recebido('alesys', job.data);
    logger.validacao('iniciada');
    logger.validacao('ok');

    // ✅ IDEMPOTENTE — pula geração se XML já existe
    if (!nfeSaida.xmlEnvio) {
      logger.gerandoXml('iniciado');
      await gerarXMLNFCe(nfceId);
      logger.gerandoXml('sucesso');
    } else {
      console.log(`[WORKER] NFC-e ${nfceId} — XML já gerado, pulando geração`);
    }

    // ✅ IDEMPOTENTE — pula assinatura se XML assinado já existe
    if (!nfeSaida.xmlAssinado) {
      logger.assinandoXml('iniciado');
      await assinarXMLNFCe(nfceId);
      logger.assinandoXml('sucesso');
    } else {
      console.log(`[WORKER] NFC-e ${nfceId} — XML já assinado, pulando assinatura`);
    }

    logger.enviadoSefaz('iniciado');
    const resultado = await enviarNFCe(nfceId, logger);

    if (resultado.success) {
      await prisma.nFeSaida.update({
        where: { id: nfceId },
        data: { status: 'PROCESSADO' }
      });
      logger.processado(nfeSaida.numero, resultado.protocolo ?? undefined);
    } else if ('contingencia' in resultado && resultado.contingencia) {
      console.log(`[WORKER] NFC-e ${nfceId} em contingência — não será retentado`);
    } else {
      console.log(`[WORKER] NFC-e ${nfceId} rejeitada/erro — status mantido pelo send service`);
    }

  } catch (error) {
    const errMsg = (error as Error).message || String(error);

    if (isRetriableError(errMsg)) {
      // ✅ RETRIABLE — seta PENDENTE para retry, throw ativa backoff do BullMQ
      console.log(
        `[WORKER] NFC-e ${nfceId} — erro retriable ` +
        `(tentativa ${job.attemptsMade + 1}/${job.opts.attempts || 1}): ${errMsg}`
      );

      await prisma.nFeSaida.update({
        where: { id: nfceId },
        data: { status: 'PENDENTE' }
      });

      logger.erro('RETRY', error);
      throw error;

    } else {
      // ✅ NÃO RETRIABLE — seta ERRO, não throw (BullMQ não retenta)
      console.error(`[WORKER] NFC-e ${nfceId} — erro não retriable: ${errMsg}`);

      await prisma.nFeSaida.update({
        where: { id: nfceId },
        data: { status: 'ERRO' }
      });

      logger.erro('PROCESSAMENTO', error);
      // Não throw — BullMQ considera como concluído
    }
  }
}

export { processNFCeWorker };