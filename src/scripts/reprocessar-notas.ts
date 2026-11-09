import { prisma } from "../config/database";
import { parseNFeXML } from "../services/xml-parser.service";

const PAUSA_MS = 50;
const LOTE_PAUSA = 20;

/**
 * Reprocessa notas que já têm XML original salvo em NFeXMLStorage.
 * Consulta a tabela de storage diretamente (amarrando pelo nfeId),
 * sem depender do nome da relação inversa no model NFe.
 * Resiliente: falha em uma nota é registrada e o ciclo continua.
 */
export async function reprocessarNotas() {
  console.log("Iniciando reprocessamento de notas...");

  // Busca os XMLs armazenados (NOT null — campo pode ser nullable)
  const storages = await prisma.nFeXMLStorage.findMany({});

  console.log(`${storages.length} XML(s) encontrados no storage`);

  if (storages.length === 0) {
    console.log("Nada a reprocessar.");
    return { processadas: 0, erros: 0 };
  }

  // Carrega as notas correspondentes e monta um índice por id
  const notas = await prisma.nFe.findMany({
    where: { id: { in: storages.map((s) => s.nfeId) } }
  });
  const notaPorId = new Map(notas.map((n) => [n.id, n]));

  let processadas = 0;
  let erros = 0;

  for (const storage of storages) {
    const nota = notaPorId.get(storage.nfeId);

    if (!nota) {
      console.log(`Storage ${storage.id} sem NFe correspondente (nfeId=${storage.nfeId})`);
      erros++;
      continue;
    }

    try {
      const xml = storage.xmlOriginal;
      if (!xml) {
        console.log(`Nota ${nota.id} sem XML no storage`);
        continue;
      }

      const parsed = await parseNFeXML(xml);
      if (!parsed.chaveAcesso) {
        console.log(`Nota ${nota.id} sem chave válida`);
        continue;
      }

      console.log(`Reprocessando: ${parsed.chaveAcesso}`);

      await prisma.$transaction([
        prisma.nFe.update({
          where: { id: nota.id },
          data: {
            numero: parsed.numero || nota.numero,
            serie: parsed.serie || nota.serie,
            modelo: parsed.modelo || nota.modelo,
            fornecedorCNPJ: parsed.fornecedorCNPJ || nota.fornecedorCNPJ,
            fornecedorNome: parsed.fornecedorNome || nota.fornecedorNome,
            dataEmissao: parsed.dataEmissao ?? nota.dataEmissao,
            valorProdutos: parsed.valorProdutos ?? nota.valorProdutos,
            valorNota: parsed.valorNota ?? nota.valorNota,
            valorFrete: parsed.valorFrete ?? nota.valorFrete,
            valorDesconto: parsed.valorDesconto ?? nota.valorDesconto,
            valorICMS: parsed.valorICMS ?? nota.valorICMS,
            valorIPI: parsed.valorIPI ?? nota.valorIPI,
            valorPIS: parsed.valorPIS ?? nota.valorPIS,
            valorCOFINS: parsed.valorCOFINS ?? nota.valorCOFINS,
            situacao: "XML_COMPLETO",
            xmlBaixado: true
          }
        }),
        prisma.nFeItem.deleteMany({ where: { nfeId: nota.id } }),
        prisma.nFeItem.createMany({
          data: parsed.itens.map((item: any) => ({ ...item, nfeId: nota.id }))
        })
      ]);

      processadas++;

      if (processadas % LOTE_PAUSA === 0) {
        await new Promise((resolve) => setTimeout(resolve, PAUSA_MS));
      }
    } catch (error: any) {
      erros++;
      console.error(`Erro na nota ${nota.id} (${nota.chaveAcesso}):`, error.message);
    }
  }

  console.log("=================================");
  console.log(`Processadas: ${processadas}`);
  console.log(`Erros: ${erros}`);
  console.log("Finalizado");

  return { processadas, erros };
}