// src/modules/fiscal/nfce/services/nfce-saida.service.ts
import { prisma } from "../../../../config/database";
import { NFCeInputDTO } from "../../dto/nfce-input.dto";
import { enqueueNfceEmission } from "../queues/nfce-queue";

export async function criarNFCeSaida(data: NFCeInputDTO) {
  if (!data.empresaId) throw new Error('empresaId é obrigatório');

  const valorTotal = data.itens.reduce((total, item) => {
    return total + item.valorTotal;
  }, 0);

  const nota = await prisma.nFeSaida.create({
    data: {
      empresaId: data.empresaId,
      modelo: "65",
      numero: 0,
      serie: 1,
      clienteNome: data.cliente.nome,
      clienteDocumento: data.cliente.cpfCnpj,
      valorProdutos: valorTotal,
      valorNota: valorTotal,
      status: "PENDENTE",
      itens: {
        create: data.itens.map((item, index) => ({
          itemNumero: index + 1,
          codigo: item.codigo,
          descricao: item.descricao,
          ncm: item.ncm,
          cfop: item.cfop,
          unidade: item.unidade,
          quantidade: item.quantidade,
          valorUnitario: item.valorUnitario,
          valorTotal: item.valorTotal,
          // ✅ CAMPOS FISCAIS OPCIONAIS (null se PDV não enviar)
          cest: item.cest || null,
          csosn: item.csosn || null,
          orig: item.orig || null,
          cstPIS: item.cstPIS || null,
          cstCOFINS: item.cstCOFINS || null,
          aliquotaICMS: item.aliquotaICMS || null,
        }))
      }
    },
    include: {
      itens: true
    }
  });

  await enqueueNfceEmission(nota.id);
  return nota;
}