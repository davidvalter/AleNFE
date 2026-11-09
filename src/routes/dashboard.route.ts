import { FastifyInstance } from 'fastify';
import { prisma } from '../config/database';

const NFC_E_STATUSES_FINALIZADOS = ['AUTORIZADA', 'PROCESSADO', 'CANCELADA'];

export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/dashboard/stats', async (_request, reply) => {
    const [
      empresasTotal,
      empresasComCertificado,
      nfceTotal,
      nfcePendentes,
      notasCompraTotal,
      notasCompraResumo
    ] = await Promise.all([
      prisma.empresa.count(),
      prisma.empresa.count({
        where: {
          AND: [
            { certificadoPath: { not: null } },
            { certificadoPath: { not: '' } }
          ]
        }
      }),
      prisma.nFeSaida.count({ where: { modelo: '65' } }),
      prisma.nFeSaida.count({
        where: {
          modelo: '65',
          status: { notIn: NFC_E_STATUSES_FINALIZADOS }
        }
      }),
      prisma.nFe.count(),
      prisma.nFe.count({ where: { situacao: 'RESUMO' } })
    ]);

    return reply.send({
      empresas: {
        total: empresasTotal,
        semCertificado: empresasTotal - empresasComCertificado
      },
      nfce: {
        total: nfceTotal,
        pendentes: nfcePendentes
      },
      notasCompra: {
        total: notasCompraTotal,
        semXmlCompleto: notasCompraResumo
      }
    });
  });
}
