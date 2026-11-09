// src/modules/fiscal/nfce/services/nfce-inutilizacao.service.ts
import { prisma } from "../../../../config/database";
import { getSefazUrl } from "../../core/sefaz/sefaz-url";
import { criarHttpsAgent } from "../../core/certificado/certificado.service";
import { enviarSoap } from "../../core/soap/soap-client";
import { dispatchWebhook } from "../../core/webhook/webhook-dispatcher.service";
import { assinarXmlGeneric } from "../../core/assinatura/xml-sign-generic.service";
import { montarSoapEnvelope } from "../../core/soap/soap-builder";

const UF_CODIGO: Record<string, string> = {
    RO: "11", AC: "12", AM: "13", RR: "14", PA: "15", AP: "16", TO: "17",
    MA: "21", PI: "22", CE: "23", RN: "24", PB: "25", PE: "26", AL: "27",
    SE: "28", BA: "29", MG: "31", ES: "32", RJ: "33", SP: "35", PR: "41",
    SC: "42", RS: "43", MS: "50", MT: "51", GO: "52", DF: "53"
};

function getDhEvento(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}-03:00`;
}

export async function inutilizarNumeracao(
    empresaId: number,
    ano: number,
    modelo: number,
    serie: number,
    nNFIni: number,
    nNFFin: number,
    xJust: string
) {
    // =========================
    // VALIDAÇÕES
    // =========================
    if (!xJust || xJust.length < 15) {
        throw new Error("Justificativa deve ter no mínimo 15 caracteres");
    }
    if (xJust.length > 255) {
        throw new Error("Justificativa deve ter no máximo 255 caracteres");
    }
    if (nNFIni > nNFFin) {
        throw new Error("Número inicial não pode ser maior que o final");
    }

    // =========================
    // BUSCA EMPRESA
    // =========================
    const empresa = await prisma.empresa.findUnique({
        where: { id: empresaId },
        include: { fiscalConfig: true }
    });
    if (!empresa) throw new Error("Empresa não encontrada");
    if (!empresa.certificadoPath || !empresa.certificadoSenha) {
        throw new Error("Certificado não configurado para a empresa");
    }

    const fiscal = empresa.fiscalConfig!;
    const ambiente = Number(fiscal.ambiente) === 1 ? "producao" : "homologacao";
    const ufSigla = (empresa.uf || "DF").toUpperCase();
    const cUF = UF_CODIGO[ufSigla];
    if (!cUF) throw new Error(`UF inválida: ${ufSigla}`);

    const cnpj = (empresa.cnpj || "").replace(/\D/g, "");
    if (!cnpj) throw new Error("CNPJ não configurado na empresa");

    // =========================
    // MONTA ID DA INUTILIZAÇÃO
    // ID{cUF}{AA}{CNPJ}{mod}{serie}{nIni}{nFin}
    // =========================
    const anoStr = String(ano).padStart(2, "0");
    const modStr = String(modelo).padStart(2, "0");
    const serieStr = String(serie).padStart(3, "0");
    const nIniStr = String(nNFIni).padStart(9, "0");
    const nFinStr = String(nNFFin).padStart(9, "0");

    const idInut = `ID${cUF}${anoStr}${cnpj}${modStr}${serieStr}${nIniStr}${nFinStr}`;

    // =========================
    // MONTA XML DA INUTILIZAÇÃO
    // =========================
    const xml = `<?xml version="1.0" encoding="UTF-8"?><inutNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><infInut Id="${idInut}"><tpAmb>${Number(fiscal.ambiente)}</tpAmb><cUF>${cUF}</cUF><ano>${anoStr}</ano><CNPJ>${cnpj}</CNPJ><mod>${modelo}</mod><serie>${serie}</serie><nNFIni>${nNFIni}</nNFIni><nNFFin>${nNFFin}</nNFFin><xJust>${xJust}</xJust></infInut></inutNFe>`;

    // =========================
    // ASSINA XML
    // =========================
    console.log("[INUTILIZAÇÃO] Assinando XML...");
    const xmlAssinado = await assinarXmlGeneric(
        xml,
        idInut,
        empresa.certificadoPath,
        empresa.certificadoSenha
    );

    // Limpeza
    const xmlLimpo = xmlAssinado
        .replace(/<\?xml.*?\?>/, "")
        .replace(/^\uFEFF/, "")
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
        .trim();

    // =========================
    // MONTA SOAP ENVELOPE
    // =========================
    // ✅ Usa montarSoapEnvelope com namespace correto do serviço de inutilização
    const soap = montarSoapEnvelope(xmlLimpo, cUF, "NFeInutilizacao4", "4.00");

    const url = getSefazUrl(ambiente, cUF, "inutilizacao");
    const httpsAgent = criarHttpsAgent(empresa.certificadoPath, empresa.certificadoSenha);

    // ✅ SOAPAction específico para inutilização
    const soapAction = "http://www.portalfiscal.inf.br/nfe/wsdl/NFeInutilizacao4/nfeInutilizacaoNF";

    let xmlRetorno = "";
    try {
        console.log(`[INUTILIZAÇÃO] Enviando para ${url}`);
        xmlRetorno = await enviarSoap(url, soap, httpsAgent, soapAction);
    } catch (error: any) {
        console.error("[INUTILIZAÇÃO] Erro ao enviar:", error.message);
        throw new Error(`Erro ao comunicar com SEFAZ: ${error.message}`);
    }

    // =========================
    // PARSE DA RESPOSTA
    // =========================
    const cStat = xmlRetorno.match(/<cStat>([^<]+)<\/cStat>/)?.[1] || "";
    const xMotivo = xmlRetorno.match(/<xMotivo>([^<]+)<\/xMotivo>/)?.[1] || "";
    const dhRecbto = xmlRetorno.match(/<dhRecbto>([^<]+)<\/dhRecbto>/)?.[1] || "";
    const nProt = xmlRetorno.match(/<nProt>([^<]+)<\/nProt>/)?.[1] || "";

    // 102 = Inutilização homologada
    const sucesso = cStat === "102";

    console.log(`[INUTILIZAÇÃO] cStat: ${cStat} — ${xMotivo}`);

    // =========================
    // SALVA NO BANCO
    // =========================
    await prisma.inutilizacao.create({
        data: {
            empresaId,
            ano: anoStr,
            modelo: String(modelo),
            serie: String(serie),
            nNFIni,
            nNFFin,
            xJust,
            idInut,
            cStat,
            xMotivo,
            nProt: sucesso ? nProt : null,
            dhRecbto: sucesso && dhRecbto ? new Date(dhRecbto) : null,
            xmlEnvio: xmlAssinado,
            xmlRetorno,
            sucesso
        }
    }).catch(e => console.error("[INUTILIZAÇÃO] Erro ao salvar no banco:", e));

    // =========================
    // WEBHOOK
    // =========================
    if (sucesso) {
        dispatchWebhook(empresaId, {
            evento: "NFC_E_INUTILIZACAO_HOMOLOGADA",
            nfceId: 0,
            chaveAcesso: null,
            protocolo: nProt || null,
            motivoRejeicao: null,
            xmlProc: null,
            xmlContingencia: null,
            motivo: `Inutilização ${nNFIni}-${nNFFin} homologada — Protocolo: ${nProt}`,
            dataAutorizacao: dhRecbto || null,
            dataContingencia: null
        }).catch(err => console.error("[Webhook] Erro inutilização:", err));
    }

    return {
        success: sucesso,
        cStat,
        xMotivo,
        nProt: sucesso ? nProt : null,
        dhRecbto: sucesso ? dhRecbto : null,
        idInut,
        xmlRetorno
    };
}