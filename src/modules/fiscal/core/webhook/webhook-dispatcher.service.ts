// src/modules/fiscal/core/webhook/webhook-dispatcher.service.ts
import { prisma } from '../../../../config/database';
import { signWebhookPayload } from './webhook-signature.util';

export interface WebhookPayload {
  evento: string;
  nfceId: number;
  chaveAcesso: string | null;
  protocolo: string | null;
  motivoRejeicao: string | null;
  xmlProc: string | null;
  xmlContingencia: string | null;
  motivo: string | null;
  dataAutorizacao: string | null;
  dataContingencia: string | null;
}

// Exponential backoff: tentativa 1=imediato, 2=+30s, 3=+2min, 4=+10min
const BACKOFF_DELAYS = [0, 30000, 120000, 600000];

type WebhookConfig = {
  id: number;
  url: string;
  ativo: boolean;
  eventos: string;
  secret: string | null;
  tentativas: number;
};

/**
 * Busca a configuração de webhook da empresa e dispara o POST.
 * Se não houver webhook configurado ou ativo, sai silenciosamente.
 */
export async function dispatchWebhook(
  empresaId: number,
  payload: WebhookPayload
): Promise<void> {
  try {
    const config = await prisma.webhookConfig.findUnique({
      where: { empresaId }
    });

    if (!config || !config.ativo) return;

    // Filtra por eventos específicos (se não for "*")
    if (config.eventos !== '*') {
      const eventos = config.eventos.split(',').map(e => e.trim());
      if (!eventos.includes(payload.evento)) return;
    }

    await sendWithRetry(config, payload, 1);
  } catch (err) {
    console.error('[Webhook] Erro no dispatch:', err);
  }
}

async function sendWithRetry(
  config: WebhookConfig,
  payload: WebhookPayload,
  tentativa: number
): Promise<void> {
  const body = JSON.stringify(payload);
  const signature = config.secret
    ? signWebhookPayload(body, config.secret)
    : null;

  let httpStatus: number | null = null;
  let responseBody: string | null = null;
  let sucesso = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    // ✅ Headers: token de autenticação + assinatura HMAC (opcional)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Token simples — o PDV valida contra o valor do secret
    if (config.secret) {
      headers['x-webhook-token'] = config.secret;
    }

    // Assinatura HMAC — camada extra de segurança
    if (signature) {
      headers['x-webhook-signature'] = signature;
    }

    const res = await fetch(config.url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal
    });

    clearTimeout(timeout);
    httpStatus = res.status;
    responseBody = await res.text().catch(() => null);
    sucesso = res.status >= 200 && res.status < 300;
  } catch (err: any) {
    responseBody = err.message || 'Erro desconhecido';
    console.error(`[Webhook] Erro na tentativa ${tentativa}:`, err.message);
  }

  // Calcula próxima tentativa (se falhou e ainda há tentativas restantes)
  const proximaTentativa =
    !sucesso && tentativa < config.tentativas
      ? new Date(Date.now() + (BACKOFF_DELAYS[tentativa] ?? 30000))
      : null;

  // Registra no log de auditoria
  await prisma.webhookLog.create({
    data: {
      webhookConfigId: config.id,
      nfceId: payload.nfceId,
      evento: payload.evento,
      payload: body as any,
      httpStatus,
      responseBody,
      sucesso,
      tentativa,
      proximaTentativa
    }
  }).catch(e => console.error('[Webhook] Erro ao salvar log:', e));

  if (sucesso) {
    console.log(`[Webhook] Entregue: NF-e ${payload.nfceId} evento ${payload.evento} (tentativa ${tentativa})`);
    return;
  }

  // ✅ Log detalhado do erro
  console.warn(
    `[Webhook] Falha tentativa ${tentativa}/${config.tentativas} - NF-e ${payload.nfceId} ` +
    `evento ${payload.evento} - HTTP ${httpStatus} - Resposta: ${responseBody}`
  );

  // Agenda retry com backoff
  if (tentativa < config.tentativas) {
    const delay = BACKOFF_DELAYS[tentativa] ?? 30000;
    console.warn(
      `[Webhook] Retry em ${delay / 1000}s`
    );
    setTimeout(() => {
      sendWithRetry(config, payload, tentativa + 1).catch(err =>
        console.error('[Webhook] Erro no retry:', err)
      );
    }, delay);
  } else {
    console.error(
      `[Webhook] Falha permanente: NF-e ${payload.nfceId} após ${tentativa} tentativas`
    );
  }
}