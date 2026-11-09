import { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '../config/database';
import { createXmlZip, XmlZipEntry } from '../utils/xml-zip';

const MAX_DOCUMENTS = 10000;
const VALID_FILTERS = ['autorizadas', 'canceladas', 'erro', 'inutilizadas'];

interface DownloadQuery {
  dataInicio?: string;
  dataFim?: string;
  filtros?: string;
}

function parseLocalDate(value: string): Date | null {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return null;
  const parts = value.split('-').map(Number);
  const check = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  if (
    check.getUTCFullYear() !== parts[0] ||
    check.getUTCMonth() + 1 !== parts[1] ||
    check.getUTCDate() !== parts[2]
  ) return null;
  return new Date(value + 'T00:00:00.000-03:00');
}

function addOneDay(date: Date): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function safeFilePart(value: string | number): string {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '') || 'documento';
}

function appendXml(entries: XmlZipEntry[], name: string, xml: string | null | undefined) {
  if (xml && xml.trim()) entries.push({ name, content: xml });
}

export async function nfceXmlDownloadRoutes(app: FastifyInstance) {
  app.get<{ Querystring: DownloadQuery }>('/nfce/xml/download', async (
    request: FastifyRequest<{ Querystring: DownloadQuery }>,
    reply
  ) => {
    const inicioTexto = request.query.dataInicio || '';
    const fimTexto = request.query.dataFim || '';
    const inicio = parseLocalDate(inicioTexto);
    const fim = parseLocalDate(fimTexto);

    if (!inicio || !fim || inicioTexto > fimTexto) {
      return reply.status(400).send({
        success: false,
        message: 'Informe um período válido, com data inicial menor ou igual à data final.'
      });
    }

    const filtros = (request.query.filtros || '').split(',').filter(Boolean);
    if (filtros.length === 0 || filtros.some(filtro => !VALID_FILTERS.includes(filtro))) {
      return reply.status(400).send({
        success: false,
        message: 'Selecione ao menos um filtro válido para o download.'
      });
    }

    const fimExclusivo = addOneDay(fim);
    const statuses: string[] = [];
    if (filtros.includes('autorizadas')) statuses.push('AUTORIZADA', 'PROCESSADO');
    if (filtros.includes('canceladas')) statuses.push('CANCELADA');
    if (filtros.includes('erro')) statuses.push('ERRO', 'REJEITADA');

    const dataNota = {
      OR: [
        { dataEmissao: { gte: inicio, lt: fimExclusivo } },
        { dataEmissao: null, createdAt: { gte: inicio, lt: fimExclusivo } }
      ]
    };
    const dataInutilizacao = {
      OR: [
        { dhRecbto: { gte: inicio, lt: fimExclusivo } },
        { dhRecbto: null, createdAt: { gte: inicio, lt: fimExclusivo } }
      ]
    };

    try {
      const [notas, inutilizacoes] = await Promise.all([
        statuses.length
          ? prisma.nFeSaida.findMany({
              where: { modelo: '65', status: { in: statuses }, ...dataNota },
              select: {
                id: true,
                numero: true,
                chaveAcesso: true,
                status: true,
                xmlProc: true,
                xmlContingencia: true,
                xmlAssinado: true,
                xmlEnvio: true,
                xmlRetorno: true
              },
              take: MAX_DOCUMENTS + 1
            })
          : Promise.resolve([]),
        filtros.includes('inutilizadas')
          ? prisma.inutilizacao.findMany({
              where: { modelo: '65', sucesso: true, ...dataInutilizacao },
              select: {
                id: true,
                idInut: true,
                xmlEnvio: true,
                xmlRetorno: true
              },
              take: MAX_DOCUMENTS + 1
            })
          : Promise.resolve([])
      ]);

      if (notas.length > MAX_DOCUMENTS || inutilizacoes.length > MAX_DOCUMENTS) {
        return reply.status(413).send({
          success: false,
          message: 'O período selecionado retorna muitos documentos. Reduza o intervalo de datas.'
        });
      }

      const arquivos: XmlZipEntry[] = [];
      for (const nota of notas) {
        const identificador = safeFilePart(nota.chaveAcesso || 'NFCe-' + nota.id);
        if (nota.status === 'CANCELADA') {
          appendXml(arquivos, 'canceladas/NFCe-' + identificador + '-NFe.xml', nota.xmlProc || nota.xmlAssinado || nota.xmlEnvio);
          appendXml(arquivos, 'canceladas/NFCe-' + identificador + '-cancelamento-retorno.xml', nota.xmlRetorno);
        } else if (nota.status === 'ERRO' || nota.status === 'REJEITADA') {
          appendXml(arquivos, 'com-erro/NFCe-' + identificador + '-envio.xml', nota.xmlAssinado || nota.xmlEnvio);
          appendXml(arquivos, 'com-erro/NFCe-' + identificador + '-retorno.xml', nota.xmlRetorno);
        } else {
          appendXml(arquivos, 'autorizadas/NFCe-' + identificador + '.xml', nota.xmlProc || nota.xmlAssinado || nota.xmlContingencia || nota.xmlEnvio);
        }
      }

      for (const inutilizacao of inutilizacoes) {
        const identificador = safeFilePart(inutilizacao.idInut || 'Inutilizacao-' + inutilizacao.id);
        appendXml(arquivos, 'inutilizadas/Inutilizacao-' + identificador + '-envio.xml', inutilizacao.xmlEnvio);
        appendXml(arquivos, 'inutilizadas/Inutilizacao-' + identificador + '-retorno.xml', inutilizacao.xmlRetorno);
      }

      if (arquivos.length === 0) {
        return reply.status(404).send({
          success: false,
          message: 'Nenhum XML foi encontrado para os filtros e o período informados.'
        });
      }

      const zip = createXmlZip(arquivos);
      const nomeArquivo = 'NFCe-XML-' + inicioTexto + '-a-' + fimTexto + '.zip';
      return reply
        .header('Content-Type', 'application/zip')
        .header('Content-Disposition', 'attachment; filename="' + nomeArquivo + '"')
        .send(zip);
    } catch (error) {
      app.log.error(error, 'Erro ao gerar download de XMLs NFC-e');
      return reply.status(500).send({
        success: false,
        message: 'Não foi possível gerar o arquivo de XMLs.'
      });
    }
  });
}
