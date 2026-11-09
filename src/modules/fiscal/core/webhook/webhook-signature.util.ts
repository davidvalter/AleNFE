// src/modules/fiscal/core/webhook/webhook-signature.util.ts
import crypto from 'crypto';

/**
 * Assina o payload do webhook com HMAC-SHA256.
 * O PDV usa o mesmo secret para verificar a assinatura.
 */
export function signWebhookPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

/**
 * Verifica a assinatura recebida (uso no lado do PDV ou para validação interna).
 * Usa timingSafeEqual para evitar timing attacks.
 */
export function verifyWebhookSignature(
  payload: string,
  secret: string,
  signature: string
): boolean {
  const expected = signWebhookPayload(payload, secret);
  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(signature);

  if (expectedBuf.length !== receivedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}