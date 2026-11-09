// src/modules/fiscal/nfce/services/nfce-cancelamento.service.ts
import { prisma } from "../../../../config/database";
import { getSefazUrl } from "../../core/sefaz/sefaz-url";
import { criarHttpsAgent } from "../../core/certificado/certificado.service";
import { enviarSoap } from "../../core/soap/soap-client";
import { montarSoapEnvelope } from "../../core/soap/soap-builder";
import { dispatchWebhook } from "../../core/webhook/webhook-dispatcher.service";
import { assinarXmlGeneric } from "../../core/assinatura/xml-sign-generic.service";
import fs from "fs";

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

export async function cancelarNFCe(
    nfceId: number,
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

    // =========================
    // BUSCA NFC-e
    // =========================
    const nota = await prisma.nFeSaida.findUnique({
        where: { id: nfceId },
        include: { empresa: { include: { fiscalConfig: true } } }
    });
    if (!nota) throw new Error("NFC-e não encontrada");

    const empresa = nota.empresa!;
    const fiscal = empresa.fiscalConfig!;

    if (!empresa.certificadoPath || !empresa.certificadoSenha) {
        throw new Error("Certificado não configurado para a empresa");
    }
    if (!nota.chaveAcesso) throw new Error("NFC-e sem chave de acesso");
    if (!nota.protocolo) throw new Error("NFC-e sem protocolo de autorização");
    if (!["AUTORIZADA", "PROCESSADO"].includes(nota.status)) {
        throw new Error(`NFC-e não pode ser cancelada (status atual: ${nota.status}). Apenas notas AUTORIZADAS podem ser canceladas.`);
    }

    const ambiente = Number(fiscal.ambiente) === 1 ? "producao" : "homologacao";
    const ufSigla = (empresa.uf || "DF").toUpperCase();
    const cUF = UF_CODIGO[ufSigla];
    if (!cUF) throw new Error(`UF inválida: ${ufSigla}`);

    const cnpj = (empresa.cnpj || "").replace(/\D/g, "");
    if (!cnpj) throw new Error("CNPJ não configurado na empresa");

    // =========================
    // MONTA EVENTO DE CANCELAMENTO
    // =========================
    const tpEvento = "110111"; // Cancelamento
    const nSeqEvento = "1";
    const idEvento = `ID${tpEvento}${nota.chaveAcesso}${nSeqEvento.padStart(2, "0")}`;
    const dhEvento = getDhEvento();

    const xmlEvento = `<?xml version="1.0" encoding="UTF-8"?><evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><infEvento Id="${idEvento}"><cOrgao>${cUF}</cOrgao><tpAmb>${Number(fiscal.ambiente)}</tpAmb><CNPJ>${cnpj}</CNPJ><chNFe>${nota.chaveAcesso}</chNFe><dhEvento>${dhEvento}</dhEvento><tpEvento>${tpEvento}</tpEvento><nSeqEvento>${nSeqEvento}</nSeqEvento><verEvento>1.00</verEvento><detEvento versao="1.00"><descEvento>Cancelamento</descEvento><nProt>${nota.protocolo}</nProt><xJust>${xJust}</xJust></detEvento></infEvento></evento>`;

    // =========================
    // ASSINA XML
    // =========================
    console.log(`[CANCELAMENTO] Assinando evento para NFC-e ${nfceId}...`);
    const xmlAssinado = await assinarXmlGeneric(
        xmlEvento,
        idEvento,
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
    // MONTA envEvento + SOAP
    // =========================
    const idLote = String(Date.now()).slice(-15);
    const xmlEnvEvento = `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><idLote>${idLote}</idLote>${xmlLimpo}</envEvento>`;

    // ✅ DEBUG — salvar XML em arquivo
    fs.writeFileSync('/tmp/cancelamento-xml.txt', xmlEnvEvento);

    const soap = montarSoapEnvelope(xmlEnvEvento, cUF, "NFeRecepcaoEvento4", "1.00");

    const url = getSefazUrl(ambiente, cUF, "recepcaoEvento");
    const httpsAgent = criarHttpsAgent(empresa.certificadoPath, empresa.certificadoSenha);

    // SOAPAction específico para recepção de evento
    const soapAction = "http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento";

    let xmlRetorno = "";
    try {
        console.log(`[CANCELAMENTO] Enviando para ${url}`);
        xmlRetorno = await enviarSoap(url, soap, httpsAgent, soapAction);
    } catch (error: any) {
        console.error("[CANCELAMENTO] Erro ao enviar:", error.message);
        throw new Error(`Erro ao comunicar com SEFAZ: ${error.message}`);
    }

    // =========================
    // PARSE DA RESPOSTA
    // =========================
    // cStat do LOTE (128 = processado) — NÃO indica sucesso do evento
    const cStatLote = xmlRetorno.match(/<cStat>([^<]+)<\/cStat>/)?.[1] || "";

    // cStat do EVENTO (dentro de retEvento/infEvento) — ESTE é o que importa
    const retEventoMatch = xmlRetorno.match(/<retEvento[^>]*>[\s\S]*?<infEvento[^>]*>([\s\S]*?)<\/infEvento>/);
    const retEventoInner = retEventoMatch ? retEventoMatch[1] : "";
    const cStat = retEventoInner.match(/<cStat>([^<]+)<\/cStat>/)?.[1] || cStatLote;
    const xMotivo = retEventoInner.match(/<xMotivo>([^<]+)<\/xMotivo>/)?.[1] || "";
    const dhRecbto = retEventoInner.match(/<dhRegEvento>([^<]+)<\/dhRegEvento>/)?.[1] || "";
    const nProtCancel = retEventoInner.match(/<nProt>([^<]+)<\/nProt>/)?.[1] || "";

    // 135 = Evento homologado / 155 = Cancelamento homologado
    // 128 = apenas o lote foi processado, NÃO significa que o evento foi aceito
    const sucesso = ["135", "155"].includes(cStat);

    console.log(`[CANCELAMENTO] cStat: ${cStat} — ${xMotivo}`);

    // =========================
    // ATUALIZA NFC-e NO BANCO
    // =========================
    if (sucesso) {
        await prisma.nFeSaida.update({
            where: { id: nfceId },
            data: {
                status: "CANCELADA",
                motivoRejeicao: `Cancelada: ${xJust}`,
                xmlRetorno
            }
        });

        // =========================
        // WEBHOOK
        // =========================
        dispatchWebhook(empresa.id, {
            evento: "NFC_E_CANCELADA",
            nfceId,
            chaveAcesso: nota.chaveAcesso,
            protocolo: nProtCancel || nota.protocolo,
            motivoRejeicao: null,
            xmlProc: null,
            xmlContingencia: null,
            motivo: `NFC-e cancelada — Justificativa: ${xJust}`,
            dataAutorizacao: null,
            dataContingencia: null
        }).catch(err => console.error("[Webhook] Erro cancelamento:", err));
    }

    return {
        success: sucesso,
        cStat,
        xMotivo,
        nProt: sucesso ? nProtCancel : null,
        dhRecbto: sucesso ? dhRecbto : null,
        idEvento,
        xmlRetorno
    };
}