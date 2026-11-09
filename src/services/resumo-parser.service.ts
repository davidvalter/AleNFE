// src/services/resumo-parser.service.ts

import { parseStringPromise } from "xml2js";

export async function parseResumoNFe(xml: string) {
  const parsed = await parseStringPromise(xml, {
    explicitArray: false,
    mergeAttrs: true,
    trim: true
  });

  const res = parsed.resNFe || parsed;

  return {
    chaveAcesso: String(res.chNFe || ""),
    numero: String(res.nNF || "0"),
    serie: String(res.serie || "0"),
    fornecedorCNPJ: String(res.CNPJ || res.CPF || ""),
    fornecedorNome: String(res.xNome || ""),
    dataEmissao: res.dhEmi ? new Date(res.dhEmi) : null,
    valorNota: res.vNF ? Number(res.vNF) : 0
  };
}