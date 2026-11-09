// src/modules/fiscal/nfce/services/nfce-contingencia.service.ts
import { prisma } from "../../../../config/database";
import { NfceLogger } from "./nfce-logger";
import { dispatchWebhook } from "../../core/webhook/webhook-dispatcher.service";
import { assinarXMLNFCe } from "../../core/assinatura/xml-sign.service";
import { carregarCertificado } from "../../../../utils/certificado";
import crypto from "crypto";

/**
 * Calcula o dígito verificador (módulo 11) da chave de acesso.
 */
function calcularDV(chave43: string): string {
  const pesos = [2, 3, 4, 5, 6, 7, 8, 9];
  let soma = 0;
  let pesoIdx = 0;

  for (let i = chave43.length - 1; i >= 0; i--) {
    soma += parseInt(chave43[i]) * pesos[pesoIdx];
    pesoIdx = (pesoIdx + 1) % 8;
  }

  const resto = soma % 11;
  return String(resto < 2 ? 0 : 11 - resto);
}

/**
 * Gera a assinatura RSA-SHA1 (base64) para o QR Code versão 3 em contingência.
 * Assina a concatenação dos parâmetros: chave|3|tpAmb|dia_emissao|vNF|tp_idDest|idDest
 */
function assinarQrCode(
  stringToSign: string,
  privateKeyPem: string
): string {
  const signer = crypto.createSign('RSA-SHA1');
  signer.update(stringToSign);
  return signer.sign(privateKeyPem, 'base64');
}

/**
 * Regenera o QR Code no XML para o formato de contingência (tpEmis=9).
 * Formato versão 3 contingência:
 * p=<chave>|3|<tpAmb>|<dia_emissao>|<vNF>|<tp_idDest>|<idDest>|<assinatura>
 */
function regenerarQrCodeContingencia(
  xml: string,
  novaChave: string,
  privateKeyPem: string
): string {
  // Extrair tpAmb do XML
  const tpAmb = xml.match(/<tpAmb>(\d)<\/tpAmb>/)?.[1] || '2';

  // Extrair dia da emissão (DD) de dhEmi
  const dhEmi = xml.match(/<dhEmi>([^<]+)<\/dhEmi>/)?.[1] || '';
  const diaEmissao = dhEmi.substring(8, 10); // extrai "DD" de "2026-08-10T..."

  // Extrair vNF
  const vNF = xml.match(/<vNF>([^<]+)<\/vNF>/)?.[1] || '0.00';

  // Extrair destinatário (CPF ou CNPJ)
  const cpfDest = xml.match(/<dest>[\s\S]*?<CPF>([^<]+)<\/CPF>/)?.[1];
  const cnpjDest = xml.match(/<dest>[\s\S]*?<CNPJ>([^<]+)<\/CNPJ>/)?.[1];

  // Montar string para assinar
  let params: string[];
  if (cnpjDest) {
    // CNPJ = tipo 1
    params = [novaChave, '3', tpAmb, diaEmissao, vNF, '1', cnpjDest];
  } else if (cpfDest) {
    // CPF = tipo 2
    params = [novaChave, '3', tpAmb, diaEmissao, vNF, '2', cpfDest];
  } else {
    // Sem destinatário — omitir tp_idDest e idDest
    params = [novaChave, '3', tpAmb, diaEmissao, vNF];
  }

  const stringToSign = params.join('|');
  const assinatura = assinarQrCode(stringToSign, privateKeyPem);

  // Montar URL completa do QR Code
  const qrCodeUrl = `http://www.fazenda.df.gov.br/nfce/qrcode?p=${stringToSign}|${assinatura}`;

  console.log(`[CONTINGÊNCIA] QR Code regenerado: ${qrCodeUrl.substring(0, 80)}...`);

  // Substituir o QR Code antigo pelo novo
  // O QR Code está dentro de <![CDATA[...]]> em <qrCode>
  xml = xml.replace(
    /<qrCode><!\[CDATA\[([^\]]*)\]\]><\/qrCode>/,
    `<qrCode><![CDATA[${qrCodeUrl}]]></qrCode>`
  );

  // Fallback: se não tinha CDATA (improvável mas seguro)
  if (!xml.includes(qrCodeUrl)) {
    xml = xml.replace(
      /<qrCode>([^<]*)<\/qrCode>/,
      `<qrCode><![CDATA[${qrCodeUrl}]]></qrCode>`
    );
  }

  return xml;
}

/**
 * Gera a contingência da NFC-e.
 */
export async function gerarContingencia(
  nfeId: number,
  logger?: NfceLogger
): Promise<{ status: string; chaveAcesso: string; protocolo: null }> {
  const log = logger || new NfceLogger(undefined, nfeId);

  const nota = await prisma.nFeSaida.findUnique({
    where: { id: nfeId },
    include: { empresa: { include: { fiscalConfig: true } } }
  });

  if (!nota || !nota.xmlEnvio) {
    throw new Error("NFC-e inválida ou XML de envio não encontrado para contingência");
  }

  const empresa = nota.empresa!;
  let xml = nota.xmlEnvio;

  // 1. Extrair chave de acesso atual
  const chaveMatch = xml.match(/Id="NFe(\d{44})"/);
  if (!chaveMatch) {
    throw new Error("Chave de acesso não encontrada no XML de envio");
  }
  const chaveAtual = chaveMatch[1];

  // 2. Trocar tpEmis (posição 34, 0-indexed) de 1 para 9
  const chave43 = chaveAtual.substring(0, 43);
  const novaChave43 = chave43.substring(0, 34) + '9' + chave43.substring(35);

  // 3. Recalcular dígito verificador
  const novoDV = calcularDV(novaChave43);
  const novaChave = novaChave43 + novoDV;

  // 4. Substituir no XML: Id, tpEmis, cDV, dhCont e xJust
  xml = xml.replace(`Id="NFe${chaveAtual}"`, `Id="NFe${novaChave}"`);
  xml = xml.replace(/<tpEmis>1<\/tpEmis>/, '<tpEmis>9</tpEmis>');
  xml = xml.replace(/<cDV>\d<\/cDV>/, `<cDV>${novoDV}</cDV>`);

  // Tags obrigatórias em contingência (tpEmis=9)
  const dhCont = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, '') + '-03:00';
  const xJust = 'SEFAZ indisponivel - contingencia offline';

  if (xml.includes('<dhCont>')) {
    xml = xml.replace(/<dhCont>[^<]*<\/dhCont>/, `<dhCont>${dhCont}</dhCont>`);
    xml = xml.replace(/<xJust>[^<]*<\/xJust>/, `<xJust>${xJust}</xJust>`);
  } else {
    xml = xml.replace(/<\/ide>/, `<dhCont>${dhCont}</dhCont><xJust>${xJust}</xJust></ide>`);
  }

  // 5. Atualizar chave antiga no QR Code e demais ocorrências
  xml = xml.split(chaveAtual).join(novaChave);

  // 6. Regenerar QR Code para formato de contingência (versão 3)
  const cert = carregarCertificado(
    empresa.certificadoPath!,
    empresa.certificadoSenha!
  );
  xml = regenerarQrCodeContingencia(xml, novaChave, cert.privateKeyPem);

  console.log(
    `[CONTINGÊNCIA] NFC-e ${nfeId} — recalculando chave:\n` +
    `  Chave anterior: ${chaveAtual}\n` +
    `  Nova chave:     ${novaChave}\n` +
    `  tpEmis: 1 → 9`
  );

  // 7. Salvar XML modificado em xmlEnvio
  await prisma.nFeSaida.update({
    where: { id: nota.id },
    data: { xmlEnvio: xml }
  });

  // 8. Reusar a função existente de assinatura
  await assinarXMLNFCe(nota.id);

  // 9. Ler o xmlAssinado recém-gerado
  const notaAssinada = await prisma.nFeSaida.findUnique({
    where: { id: nota.id },
    select: { xmlAssinado: true }
  });

  if (!notaAssinada || !notaAssinada.xmlAssinado) {
    throw new Error("Falha ao obter XML assinado de contingência");
  }

  const motivo = "SEFAZ indisponível - contingência offline";

  // 10. Salvar xmlContingencia + atualizar status
  await prisma.nFeSaida.update({
    where: { id: nota.id },
    data: {
      status: "CONTINGENCIA",
      tpEmis: 9,
      motivoContingencia: motivo,
      dataContingencia: new Date(),
      xmlContingencia: notaAssinada.xmlAssinado,
      chaveAcesso: novaChave
    }
  });

  log.enviadoSefaz('erro', 'CONTINGENCIA', motivo);

  // 11. Disparar webhook
  dispatchWebhook(empresa.id, {
    evento: "NFC_E_SEFAZ_INDISPONIVEL",
    nfceId: nota.id,
    chaveAcesso: novaChave,
    protocolo: null,
    motivoRejeicao: null,
    xmlProc: null,
    xmlContingencia: null,
    motivo,
    dataAutorizacao: null,
    dataContingencia: new Date().toISOString()
  }).catch(err => console.error('[Webhook] Erro ao notificar contingência:', err));

  console.log(`[CONTINGÊNCIA] NFC-e ${nfeId} em contingência offline — XML pronto para impressão`);

  return { status: "CONTINGENCIA", chaveAcesso: novaChave, protocolo: null };
}