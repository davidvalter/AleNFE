// src/modules/fiscal/nfce/services/nfce-logger.ts
import pino from 'pino';
import { prisma } from '../../../../config/database';

const baseLogger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
        }
    }
});

export class NfceLogger {
    private logger: pino.Logger;
    private jobId: string;
    private nfceId: number;

    constructor(jobId?: string, nfceId?: number) {
        this.jobId = jobId || '';
        this.nfceId = nfceId || 0;
        this.logger = baseLogger.child({ jobId: this.jobId, nfceId: this.nfceId });
    }

    // =========================
    // PERSISTÊNCIA NO BANCO (fire-and-forget)
    // =========================
    private async persistLog(logData: {
        step: string;
        status?: string;
        level?: string;
        message: string;
        source?: string;
        data?: any;
        details?: string;
        responseCode?: string;
        nfceNumber?: number;
        protocoloSefaz?: string;
        context?: any;
        cStatLote?: string;
        cStatProt?: string;
        xMotivo?: string;
        chaveAcesso?: string;
        protocolo?: string;
        recibo?: string;
        digVal?: string;
        dhRecbto?: string;
        verAplic?: string;
        cUF?: string;
    }): Promise<void> {
        try {
            await prisma.nFCeLog.create({
                data: {
                    nfceId: this.nfceId,
                    jobId: this.jobId || null,
                    step: logData.step,
                    status: logData.status || null,
                    level: logData.level || 'INFO',
                    message: logData.message,
                    source: logData.source || null,
                    data: logData.data || undefined,
                    details: logData.details || null,
                    responseCode: logData.responseCode || null,
                    nfceNumber: logData.nfceNumber || null,
                    protocoloSefaz: logData.protocoloSefaz || null,
                    context: logData.context || undefined,
                    cStatLote: logData.cStatLote || null,
                    cStatProt: logData.cStatProt || null,
                    xMotivo: logData.xMotivo || null,
                    chaveAcesso: logData.chaveAcesso || null,
                    protocolo: logData.protocolo || null,
                    recibo: logData.recibo || null,
                    digVal: logData.digVal || null,
                    dhRecbto: logData.dhRecbto ? new Date(logData.dhRecbto) : null,
                    verAplic: logData.verAplic || null,
                    cUF: logData.cUF || null,
                }
            });
        } catch (err) {
            this.logger.warn({ err: (err as Error).message }, 'Falha ao persistir log no banco');
        }
    }

    recebido(source: string, data?: any): void {
        this.logger.info({ step: 'RECEBIDO', source, data }, 'NFC-e recebida');
        this.persistLog({
            step: 'RECEBIDO',
            status: 'iniciado',
            level: 'INFO',
            message: 'NFC-e recebida',
            source,
            data
        });
    }

    validacao(status: 'iniciada' | 'ok' | 'erro', details?: string): void {
        this.logger.info({ step: 'VALIDACAO', status, details }, 'Validação da NFC-e');
        this.persistLog({
            step: 'VALIDACAO',
            status,
            level: status === 'erro' ? 'ERROR' : 'INFO',
            message: 'Validação da NFC-e',
            details
        });
    }

    gerandoXml(status: 'iniciado' | 'sucesso' | 'erro', details?: string): void {
        this.logger.info({ step: 'GERANDO_XML', status, details }, 'Geração do XML da NFC-e');
        this.persistLog({
            step: 'GERANDO_XML',
            status,
            level: status === 'erro' ? 'ERROR' : 'INFO',
            message: 'Geração do XML da NFC-e',
            details
        });
    }

    assinandoXml(status: 'iniciado' | 'sucesso' | 'erro', details?: string): void {
        this.logger.info({ step: 'ASSINANDO_XML', status, details }, 'Assinatura do XML da NFC-e');
        this.persistLog({
            step: 'ASSINANDO_XML',
            status,
            level: status === 'erro' ? 'ERROR' : 'INFO',
            message: 'Assinatura do XML da NFC-e',
            details
        });
    }

    enviadoSefaz(status: 'iniciado' | 'sucesso' | 'erro', responseCode?: string, details?: string): void {
        this.logger.info({ step: 'ENVIADO_SEFAZ', status, responseCode, details }, 'Envio da NFC-e para SEFAZ');
        this.persistLog({
            step: 'ENVIADO_SEFAZ',
            status,
            level: status === 'erro' ? 'ERROR' : 'INFO',
            message: 'Envio da NFC-e para SEFAZ',
            responseCode,
            details
        });
    }

    sefazResponse(response: {
        cStatLote?: string;
        cStatProt?: string;
        xMotivo?: string;
        chaveAcesso?: string;
        protocolo?: string;
        recibo?: string;
        digVal?: string;
        dhRecbto?: string;
        verAplic?: string;
        cUF?: string;
    }): void {
        const isAuthorized = response.cStatProt === '100';
        const isRejected = response.cStatProt && response.cStatProt !== '100';

        this.logger.info(
            {
                step: 'SEFAZ_RESPONSE',
                cStatLote: response.cStatLote,
                cStatProt: response.cStatProt,
                xMotivo: response.xMotivo,
                chaveAcesso: response.chaveAcesso,
                protocolo: response.protocolo,
                recibo: response.recibo,
                digVal: response.digVal,
                dhRecbto: response.dhRecbto,
                verAplic: response.verAplic,
                cUF: response.cUF
            },
            isAuthorized
                ? `NFC-e AUTORIZADA (protocolo ${response.protocolo})`
                : isRejected
                    ? `NFC-e REJEITADA (cStat: ${response.cStatProt})`
                    : `NFC-e PROCESSANDO (recibo: ${response.recibo || 'null'})`
        );

        this.persistLog({
            step: 'SEFAZ_RESPONSE',
            status: isAuthorized ? 'sucesso' : isRejected ? 'erro' : 'processando',
            level: isRejected ? 'ERROR' : 'INFO',
            message: isAuthorized
                ? `NFC-e AUTORIZADA (protocolo ${response.protocolo})`
                : isRejected
                    ? `NFC-e REJEITADA (cStat: ${response.cStatProt})`
                    : `NFC-e PROCESSANDO (recibo: ${response.recibo || 'null'})`,
            cStatLote: response.cStatLote,
            cStatProt: response.cStatProt,
            xMotivo: response.xMotivo,
            chaveAcesso: response.chaveAcesso,
            protocolo: response.protocolo,
            recibo: response.recibo,
            digVal: response.digVal,
            dhRecbto: response.dhRecbto,
            verAplic: response.verAplic,
            cUF: response.cUF,
            details: response.xMotivo
        });
    }

    processado(nfceNumber?: number, protocoloSefaz?: string): void {
        this.logger.info(
            { step: 'PROCESSADO', jobId: this.jobId, nfceId: this.nfceId, nfceNumber, protocoloSefaz },
            'NFC-e processada com sucesso'
        );
        this.persistLog({
            step: 'PROCESSADO',
            status: 'sucesso',
            level: 'INFO',
            message: 'NFC-e processada com sucesso',
            nfceNumber,
            protocoloSefaz
        });
    }

    erro(step: string, error: Error | string | unknown, context?: any): void {
        let errorMessage: string;
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        } else {
            errorMessage = String(error);
        }
        this.logger.error({ step, error: errorMessage, context }, 'Erro durante processamento da NFC-e');
        this.persistLog({
            step,
            status: 'erro',
            level: 'ERROR',
            message: 'Erro durante processamento da NFC-e',
            details: errorMessage,
            context
        });
    }
}