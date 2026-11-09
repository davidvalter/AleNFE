// src/modules/fiscal/nfce/services/nfce-send.service.ts
import path from "path";
import { prisma } from "../../../../config/database";
import * as fs from 'fs';
import { getSefazUrl } from "../../core/sefaz/sefaz-url";
import { criarHttpsAgent } from "../../core/certificado/certificado.service";
import { montarSoapEnvelope } from "../../core/soap/soap-builder";
import { enviarSoap } from "../../core/soap/soap-client";
import { XmlParser } from "../../core/parsers/xml-parser";
import { validarXml } from "../../core/validators/xml-validator";
import { consultarReciboNFCe } from "./nfce-consulta-recibo.service";
import { debugSignature } from "../../core/debug/signature-debug";
import { NfceLogger } from "./nfce-logger";
import { dispatchWebhook } from "../../core/webhook/webhook-dispatcher.service";
import { gerarContingencia } from "./nfce-contingencia.service";

const UF_CODIGO: Record<string, string> = {
  RO: "11", AC: "12", AM: "13", RR: "14", PA: "15", AP: "16", TO: "17",
  MA: "21", PI: "22", CE: "23", RN: "24", PB: "25", PE: "26", AL: "27",
  SE: "28", BA: "29", MG: "31", ES: "32", RJ: "33", SP: "35", PR: "41",
  SC: "42", RS: "43", MS: "50", MT: "51", GO: "52", DF: "53"
};

export async function enviarNFCe(nfeId: number, logger?: NfceLogger) {
  const log = logger || new NfceLogger(undefined, nfeId);

  const nota = await prisma.nFeSaida.findUnique({
    where: { id: nfeId },
    include: { empresa: { include: { fiscalConfig: true } } }
  });

  if (!nota || !nota.xmlEnvio) {
    throw new Error("NFC-e inválida ou XML não gerado");
  }

  const empresa = nota.empresa!;
  const fiscal = empresa.fiscalConfig!;

  const ambiente = Number(fiscal.ambiente) === 1 ? "producao" : "homologacao";

  const ufSigla = (empresa.uf || "DF").toUpperCase();
  const uf = UF_CODIGO[ufSigla];
  if (!uf) {
    throw new Error(`UF inválida: ${ufSigla}`);
  }

  const url = getSefazUrl(ambiente, uf);

  const idLote = String(Date.now()).slice(-15);

  if (!nota.xmlAssinado) {
    throw new Error("NFC-e ainda não possui XML assinado. Verifique o fluxo do Worker.");
  }

  const xmlAssinadoLimpo = nota.xmlAssinado
    .replace(/<\?xml.*?\?>/, "")
    .replace(/^\uFEFF/, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim();

  const xmlFinal = `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><idLote>${idLote}</idLote><indSinc>1</indSinc>${xmlAssinadoLimpo}</enviNFe>`;

  debugSignature(xmlFinal, "XML_FINAL_ANTES_SOAP");

  const schemaPath = path.resolve(__dirname, "../../../../schemas/enviNFe_v4.00.xsd");

  if (!fs.existsSync(schemaPath)) {
    console.warn(`⚠️  Arquivo XSD não encontrado em: ${schemaPath}`);
    console.warn("   Continuando sem validação local (SEFAZ validará)");
  } else {
    const valid = validarXml(xmlFinal, schemaPath);
    if (!valid.valido) {
      console.warn("⚠️  Validação XSD local falhou:");
      valid.erros.forEach((e: any) => {
        const msg = typeof e === 'string' ? e : (e?.message || JSON.stringify(e));
        console.warn(`   - ${msg}`);
      });
      console.warn("   (SEFAZ fará a validação final)");
    }
  }

  const soap = montarSoapEnvelope(xmlFinal, uf);

  debugSignature(soap, "SOAP_ANTES_ENVIO");

  const tempSoapFile = `/tmp/soap-enviado-${Date.now()}.xml`;
  try {
    fs.writeFileSync(tempSoapFile, soap);
  } catch (writeErr) {
    console.warn("⚠️  Não foi possível gravar arquivo SOAP temporário:", (writeErr as Error).message);
  }

  const httpsAgent = criarHttpsAgent(
    empresa.certificadoPath!,
    empresa.certificadoSenha!
  );

  let xmlRetorno = "";

  try {
    xmlRetorno = await enviarSoap(url, soap, httpsAgent);
  } catch (error: any) {
    console.error("🔥 ERRO COMPLETO SEFAZ:");
    if (error.response) {
      console.error("STATUS:", error.response.status);
      console.error("HEADERS:", error.response.headers);
      console.error("BODY:", error.response.data);
    } else {
      console.error(error.message);
    }

    const errMsg = (error as Error).message || String(error);

    // ✅ Erro de certificado — NÃO ativa contingência
    const isErroCertificado =
      errMsg.includes('PKCS12') ||
      errMsg.includes('Unsupported') ||
      errMsg.includes('certificado') ||
      errMsg.includes('private key') ||
      errMsg.includes('Certificado não encontrado') ||
      errMsg.includes('Chave privada não encontrada') ||
      errMsg.includes('x509') ||
      errMsg.includes('mismatch') ||
      errMsg.includes('key values') ||
      errMsg.includes('PFX') ||
      errMsg.includes('Certificado PFX');

    if (isErroCertificado) {
      console.error("[ERRO_CERTIFICADO] Falha ao acessar certificado:", errMsg);
      log.enviadoSefaz('erro', 'ERRO_CERTIFICADO', errMsg.substring(0, 200));

      await prisma.nFeSaida.update({
        where: { id: nota.id },
        data: {
          status: 'ERRO',
          motivoRejeicao: `Erro de certificado: ${errMsg.substring(0, 500)}`
        }
      });

      dispatchWebhook(empresa.id, {
        evento: "NFC_E_ERRO_CERTIFICADO",
        nfceId: nota.id,
        chaveAcesso: null,
        protocolo: null,
        motivoRejeicao: errMsg.substring(0, 500),
        xmlProc: null,
        xmlContingencia: null,
        motivo: `Erro de certificado: ${errMsg}`,
        dataAutorizacao: null,
        dataContingencia: null
      }).catch(err => console.error('[Webhook] Erro ao notificar erro de certificado:', err));

      return { success: false, status: 'ERRO', chaveAcesso: null, protocolo: null };
    }

    log.enviadoSefaz('erro', 'FALHA_COMUNICACAO', errMsg.substring(0, 200));

    // ✅ Detecta SEFAZ indisponível e entra em contingência
    const isSefazIndisponivel =
      !error.response ||
      (error.response && [500, 502, 503, 504].includes(error.response.status)) ||
      ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'].includes(error.code) ||
      (errMsg.toLowerCase().includes('timeout'));

    if (isSefazIndisponivel) {
      console.log("[CONTINGÊNCIA] SEFAZ indisponível, ativando contingência offline...");
      const resultado = await gerarContingencia(nota.id, log);
      return { success: false, ...resultado, contingencia: true };
    }

    throw new Error("Erro ao comunicar com SEFAZ");
  }

  // =========================
  // PARSE DA RESPOSTA
  // =========================
  const xmlParser = new XmlParser();
  const dados = xmlParser.parseSefazResponse(xmlRetorno);

  console.log("📊 DADOS PARSEADOS:");
  console.log(JSON.stringify(dados, null, 2));

  const infProtMatch = xmlRetorno.match(/<infProt[^>]*>([\s\S]*?)<\/infProt>/);
  const infProtContent = infProtMatch ? infProtMatch[1] : '';

  const protXMotivo = infProtContent.match(/<xMotivo>([^<]+)<\/xMotivo>/)?.[1] || undefined;
  const digVal = infProtContent.match(/<digVal>([^<]+)<\/digVal>/)?.[1] || undefined;
  const dhRecbto = infProtContent.match(/<dhRecbto>([^<]+)<\/dhRecbto>/)?.[1] || undefined;
  const verAplic = infProtContent.match(/<verAplic>([^<]+)<\/verAplic>/)?.[1] || undefined;
  const cUF = xmlRetorno.match(/<cUF>([^<]+)<\/cUF>/)?.[1] || undefined;

  const isRejected = dados.cStatProt && dados.cStatProt !== '100';
  const xMotivoFinal = (isRejected && protXMotivo) ? protXMotivo : (dados.xMotivo ?? undefined);

  console.log("[SEFAZ RESPONSE] Resposta completa da SEFAZ:");
  console.log("  cStatLote:", dados.cStatLote);
  console.log("  cStatProt:", dados.cStatProt);
  console.log("  xMotivo (lote):", dados.xMotivo);
  console.log("  xMotivo (prot):", protXMotivo);
  console.log("  xMotivo (final):", xMotivoFinal);
  console.log("  recibo:", dados.recibo);
  console.log("  protocolo:", dados.protocolo);
  console.log("  chaveAcesso:", dados.chaveAcesso);
  console.log("  digVal:", digVal);
  console.log("  dhRecbto:", dhRecbto);

  log.sefazResponse({
    cStatLote: dados.cStatLote ?? undefined,
    cStatProt: dados.cStatProt ?? undefined,
    xMotivo: xMotivoFinal,
    chaveAcesso: dados.chaveAcesso ?? undefined,
    protocolo: dados.protocolo ?? undefined,
    recibo: dados.recibo ?? undefined,
    digVal,
    dhRecbto,
    verAplic,
    cUF
  });

  let status = "REJEITADA";

  if (dados.cStatLote === "100") {
    status = "AUTORIZADA";
    console.log("[SEFAZ RESPONSE] ✅ NFC-e AUTORIZADA");
  } else if (dados.cStatLote === "104" && dados.cStatProt === "100") {
    status = "AUTORIZADA";
    console.log("[SEFAZ RESPONSE] ✅ NFC-e AUTORIZADA (protocolo 100)");
  } else if (dados.cStatLote === "104" && dados.cStatProt && dados.cStatProt !== "100") {
    status = "REJEITADA";
    console.error("[SEFAZ RESPONSE] ❌ NFC-e REJEITADA");
    console.error("  Motivo:", xMotivoFinal);
    console.error("  cStatProt:", dados.cStatProt);
  } else if (dados.cStatLote === "103") {
    status = "PROCESSANDO";
    console.log("[SEFAZ RESPONSE] ⏳ NFC-e PROCESSANDO (recibo:", dados.recibo, ")");
  } else {
    status = "REJEITADA";
    console.error("[SEFAZ RESPONSE] ❌ NFC-e REJEITADA");
    console.error("  Motivo:", xMotivoFinal);
    console.error("  cStatLote:", dados.cStatLote);
  }

  log.enviadoSefaz('sucesso', 'OK');

  // =========================
  // SALVA RETORNO NO BANCO
  // =========================
  await prisma.nFeSaida.update({
    where: { id: nota.id },
    data: {
      status,
      recibo: dados.recibo,
      protocolo: dados.protocolo,
      motivoRejeicao: xMotivoFinal,
      xmlRetorno
    }
  });

  // =========================
  // REJEITADA — dispara webhook e retorna
  // =========================
  if (status === "REJEITADA") {
    // ✅ Webhook de rejeição
    dispatchWebhook(empresa.id, {
      evento: "NFC_E_REJEITADA",
      nfceId: nota.id,
      chaveAcesso: dados.chaveAcesso ?? null,
      protocolo: null,
      motivoRejeicao: xMotivoFinal ?? null,
      xmlProc: null,
      xmlContingencia: null,
      motivo: null,
      dataAutorizacao: null,
      dataContingencia: null
    }).catch(err => console.error('[Webhook] Erro ao notificar rejeição:', err));

    return { success: false, status, motivoRejeicao: xMotivoFinal, ...dados };
  }

  // =========================
  // PROCESSANDO — consulta recibo automática
  // =========================
  if (status === "PROCESSANDO" && dados.recibo) {
    console.log("Consultando recibo automaticamente...");
    const resultadoConsulta = await consultarReciboNFCe(nota.id);
    return { success: true, consultaAutomatica: true, ...resultadoConsulta };
  }

  // =========================
  // AUTORIZADA — gera XML proc
  // =========================
  let xmlProc: string | null = null;

  if (status === "AUTORIZADA") {
    const nfeAssinada = nota.xmlAssinado;
    xmlProc = `<?xml version="1.0" encoding="UTF-8"?><nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">${nfeAssinada}${xmlRetorno}</nfeProc>`.trim();
    await prisma.nFeSaida.update({
      where: { id: nota.id },
      data: { xmlProc, dataAutorizacao: new Date() }
    });

    // ✅ Webhook de autorização (só quando cStat=100)
    dispatchWebhook(empresa.id, {
      evento: "NFC_E_AUTORIZADA",
      nfceId: nota.id,
      chaveAcesso: dados.chaveAcesso ?? null,
      protocolo: dados.protocolo ?? null,
      motivoRejeicao: null,
      xmlProc,
      xmlContingencia: null,
      motivo: null,
      dataAutorizacao: new Date().toISOString(),
      dataContingencia: null
    }).catch(err => console.error('[Webhook] Erro ao notificar autorização:', err));
  }

  return { success: true, status, ambiente, ...dados };
}