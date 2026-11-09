// src/modules/fiscal/nfce/services/nfce-sync-contingencia.service.ts
import path from "path";
import { prisma } from "../../../../config/database";
import * as fs from 'fs';
import { getSefazUrl } from "../../core/sefaz/sefaz-url";
import { criarHttpsAgent } from "../../core/certificado/certificado.service";
import { montarSoapEnvelope } from "../../core/soap/soap-builder";
import { enviarSoap } from "../../core/soap/soap-client";
import { XmlParser } from "../../core/parsers/xml-parser";
import { dispatchWebhook } from "../../core/webhook/webhook-dispatcher.service";

const UF_CODIGO: Record<string, string> = {
    RO: "11", AC: "12", AM: "13", RR: "14", PA: "15", AP: "16", TO: "17",
    MA: "21", PI: "22", CE: "23", RN: "24", PB: "25", PE: "26", AL: "27",
    SE: "28", BA: "29", MG: "31", ES: "32", RJ: "33", SP: "35", PR: "41",
    SC: "42", RS: "43", MS: "50", MT: "51", GO: "52", DF: "53"
};

let syncInterval: NodeJS.Timeout | null = null;

/**
 * Inicia o worker de sincronização que roda a cada 60s.
 * Busca notas em CONTINGENCIA e tenta reenviar à SEFAZ.
 */
export function iniciarSyncContingencia(): void {
    if (syncInterval) {
        console.log('[SYNC-CONTINGÊNCIA] Já iniciado, pulando...');
        return;
    }

    console.log('[SYNC-CONTINGÊNCIA] Worker iniciado (intervalo: 60s)');

    // Roda imediatamente na primeira vez, depois a cada 60s
    sincronizarContingencias().catch(err =>
        console.error('[SYNC-CONTINGÊNCIA] Erro no ciclo inicial:', err)
    );

    syncInterval = setInterval(async () => {
        try {
            await sincronizarContingencias();
        } catch (err) {
            console.error('[SYNC-CONTINGÊNCIA] Erro no ciclo:', err);
        }
    }, 60000);
}

/**
 * Para o worker de sincronização (usado em shutdown).
 */
export function pararSyncContingencia(): void {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
        console.log('[SYNC-CONTINGÊNCIA] Worker parado');
    }
}

/**
 * Busca todas as notas em CONTINGENCIA e tenta sincronizar com a SEFAZ.
 */
async function sincronizarContingencias(): Promise<void> {
    const notas = await prisma.nFeSaida.findMany({
        where: { status: 'CONTINGENCIA' },
        include: { empresa: { include: { fiscalConfig: true } } },
        orderBy: { createdAt: 'asc' }
    });

    if (notas.length === 0) return;

    console.log(`[SYNC-CONTINGÊNCIA] ${notas.length} nota(s) em contingência para sincronizar`);

    for (const nota of notas) {
        try {
            await tentarSincronizarNota(nota);
        } catch (err) {
            console.error(`[SYNC-CONTINGÊNCIA] Erro ao sincronizar nota ${nota.id}:`, err);
        }
    }
}

/**
 * Tenta enviar uma nota de contingência para a SEFAZ.
 * Usa o xmlContingencia (já assinado com tpEmis=9).
 */
async function tentarSincronizarNota(nota: any): Promise<void> {
    const empresa = nota.empresa!;
    const fiscal = empresa.fiscalConfig!;

    if (!nota.xmlContingencia) {
        console.warn(`[SYNC-CONTINGÊNCIA] Nota ${nota.id} sem xmlContingencia, pulando...`);
        return;
    }

    const ambiente = Number(fiscal.ambiente) === 1 ? "producao" : "homologacao";
    const ufSigla = (empresa.uf || "DF").toUpperCase();
    const uf = UF_CODIGO[ufSigla];

    if (!uf) {
        console.error(`[SYNC-CONTINGÊNCIA] UF inválida para nota ${nota.id}: ${ufSigla}`);
        return;
    }

    const url = getSefazUrl(ambiente, uf);
    const idLote = String(Date.now()).slice(-15);

    // Limpar XML de contingência (mesmo tratamento do envio normal)
    const xmlLimpo = nota.xmlContingencia
        .replace(/<\?xml.*?\?>/, "")
        .replace(/^\uFEFF/, "")
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
        .trim();

    const xmlFinal = `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><idLote>${idLote}</idLote><indSinc>1</indSinc>${xmlLimpo}</enviNFe>`;

    const soap = montarSoapEnvelope(xmlFinal, uf);

    const httpsAgent = criarHttpsAgent(
        empresa.certificadoPath!,
        empresa.certificadoSenha!
    );

    let xmlRetorno: string;

    try {
        xmlRetorno = await enviarSoap(url, soap, httpsAgent);
    } catch (error: any) {
        // SEFAZ ainda fora — mantém em contingência, tenta no próximo ciclo
        const isSefazIndisponivel =
            !error.response ||
            (error.response && [500, 502, 503, 504].includes(error.response.status)) ||
            ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'].includes(error.code) ||
            (error.message && error.message.toLowerCase().includes('timeout'));

        if (isSefazIndisponivel) {
            console.log(`[SYNC-CONTINGÊNCIA] Nota ${nota.id}: SEFAZ ainda indisponível, tentará novamente em 60s`);
        } else {
            console.error(`[SYNC-CONTINGÊNCIA] Nota ${nota.id}: Erro inesperado:`, error.message);
        }
        return;
    }

    // =========================
    // PARSE DA RESPOSTA
    // =========================
    const xmlParser = new XmlParser();
    const dados = xmlParser.parseSefazResponse(xmlRetorno);

    const infProtMatch = xmlRetorno.match(/<infProt[^>]*>([\s\S]*?)<\/infProt>/);
    const infProtContent = infProtMatch ? infProtMatch[1] : '';

    const protXMotivo = infProtContent.match(/<xMotivo>([^<]+)<\/xMotivo>/)?.[1] || undefined;
    const dhRecbto = infProtContent.match(/<dhRecbto>([^<]+)<\/dhRecbto>/)?.[1] || undefined;

    const isRejected = dados.cStatProt && dados.cStatProt !== '100';
    const xMotivoFinal = (isRejected && protXMotivo) ? protXMotivo : (dados.xMotivo ?? undefined);

    console.log(`[SYNC-CONTINGÊNCIA] Nota ${nota.id}: cStatLote=${dados.cStatLote}, cStatProt=${dados.cStatProt}, motivo=${xMotivoFinal}`);

    // =========================
    // AUTORIZADA (cStat=100)
    // =========================
    if (
        (dados.cStatLote === "100") ||
        (dados.cStatLote === "104" && dados.cStatProt === "100")
    ) {
        // Gerar xmlProc definitivo
        const xmlProc = `<?xml version="1.0" encoding="UTF-8"?><nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">${nota.xmlContingencia}${xmlRetorno}</nfeProc>`.trim();

        await prisma.nFeSaida.update({
            where: { id: nota.id },
            data: {
                status: 'AUTORIZADA',
                protocolo: dados.protocolo,
                motivoRejeicao: null,
                xmlRetorno,
                xmlProc,
                dataAutorizacao: new Date()
            }
        });

        console.log(`[SYNC-CONTINGÊNCIA] ✅ Nota ${nota.id} AUTORIZADA pela SEFAZ`);

        // Webhook — contingência autorizada
        dispatchWebhook(empresa.id, {
            evento: 'NFC_E_CONTINGENCIA_AUTORIZADA',
            nfceId: nota.id,
            chaveAcesso: dados.chaveAcesso ?? nota.chaveAcesso,
            protocolo: dados.protocolo ?? null,
            motivoRejeicao: null,
            xmlProc,
            xmlContingencia: null,
            motivo: null,
            dataAutorizacao: new Date().toISOString(),
            dataContingencia: nota.dataContingencia?.toISOString() ?? null
        }).catch(err => console.error('[Webhook] Erro ao notificar contingência autorizada:', err));

        return;
    }

    // =========================
    // PROCESSANDO (cStat=103) — consulta recibo
    // =========================
    if (dados.cStatLote === "103" && dados.recibo) {
        console.log(`[SYNC-CONTINGÊNCIA] Nota ${nota.id}: SEFAZ processando (recibo: ${dados.recibo})`);
        // Não muda o status — o próximo ciclo tentará consultar novamente
        // Ou você pode chamar consultarReciboNFCe aqui se preferir
        return;
    }

    // =========================
    // REJEITADA
    // =========================
    await prisma.nFeSaida.update({
        where: { id: nota.id },
        data: {
            status: 'REJEITADA',
            protocolo: dados.protocolo,
            motivoRejeicao: xMotivoFinal,
            xmlRetorno
        }
    });

    console.error(`[SYNC-CONTINGÊNCIA] ❌ Nota ${nota.id} REJEITADA: ${xMotivoFinal}`);

    // Webhook — contingência rejeitada
    dispatchWebhook(empresa.id, {
        evento: 'NFC_E_CONTINGENCIA_REJEITADA',
        nfceId: nota.id,
        chaveAcesso: dados.chaveAcesso ?? nota.chaveAcesso,
        protocolo: null,
        motivoRejeicao: xMotivoFinal ?? null,
        xmlProc: null,
        xmlContingencia: null,
        motivo: nota.motivoContingencia,
        dataAutorizacao: null,
        dataContingencia: nota.dataContingencia?.toISOString() ?? null
    }).catch(err => console.error('[Webhook] Erro ao notificar contingência rejeitada:', err));
}