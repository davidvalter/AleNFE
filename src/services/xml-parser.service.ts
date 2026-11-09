// src/services/xml-parser.service.ts

import { parseStringPromise } from "xml2js";
import { getValue } from "../utils/xml.util";

// ==============================
// Helpers
// ==============================

function toNumber(val: any): number | null {
  if (val === undefined || val === null || val === "") return null;
  return Number(val);
}

function safeString(val: any): string {
  return val ? String(val) : "";
}

// ==============================
// IMPOSTOS DINÂMICOS
// ==============================

function getICMSValue(icms: any): number | null {
  if (!icms) return null;

  for (const tipo of Object.keys(icms)) {
    const node = icms[tipo];

    if (node?.vICMS) return toNumber(getValue(node.vICMS));
    if (node?.vICMSST) return toNumber(getValue(node.vICMSST));
    if (node?.vICMSSTRet) return toNumber(getValue(node.vICMSSTRet));
    if (node?.vICMSSubstituto) return toNumber(getValue(node.vICMSSubstituto));
  }

  return null;
}

function getPISValue(pis: any): number | null {
  if (!pis) return null;

  for (const tipo of Object.keys(pis)) {
    const node = pis[tipo];
    if (node?.vPIS) return toNumber(getValue(node.vPIS));
  }

  return null;
}

function getCOFINSValue(cofins: any): number | null {
  if (!cofins) return null;

  for (const tipo of Object.keys(cofins)) {
    const node = cofins[tipo];
    if (node?.vCOFINS) return toNumber(getValue(node.vCOFINS));
  }

  return null;
}

function getIPIValue(ipi: any): number | null {
  if (!ipi) return null;

  for (const tipo of Object.keys(ipi)) {
    const node = ipi[tipo];
    if (node?.vIPI) return toNumber(getValue(node.vIPI));
  }

  return null;
}

// ==============================
// PARSER PRINCIPAL
// ==============================

export async function parseNFeXML(xml: string) {
  const parsed = await parseStringPromise(xml, {
    explicitArray: false,
    mergeAttrs: true,
    tagNameProcessors: [
      (name) => name.replace("ns0:", "").replace("ns1:", "")
    ]
  });

  // 🔥 garante estrutura independente de namespace
  const proc =
    parsed.nfeProc ||
    parsed["nfeProc"] ||
    parsed.procNFe ||
    parsed.NFe ||
    parsed;

  const infNFe =
    proc?.NFe?.infNFe ||
    proc?.infNFe ||
    proc?.["NFe"]?.["infNFe"];

  if (!infNFe) {
    throw new Error("Estrutura inválida de NFe");
  }

  const ide = infNFe.ide || {};
  const emit = infNFe.emit || {};
  const total = infNFe.total?.ICMSTot || {};

  // ==============================
  // ITENS
  // ==============================
  const det = Array.isArray(infNFe.det)
    ? infNFe.det
    : [infNFe.det].filter(Boolean);

  const itens = det.map((item: any) => ({
    itemNumero: Number(item?.nItem || 0),

    codigo: safeString(getValue(item.prod?.cProd)),
    descricao: safeString(getValue(item.prod?.xProd)),
    ncm: safeString(getValue(item.prod?.NCM)),
    cfop: safeString(getValue(item.prod?.CFOP)),
    unidade: safeString(getValue(item.prod?.uCom)),

    quantidade: toNumber(getValue(item.prod?.qCom)),
    valorUnitario: toNumber(getValue(item.prod?.vUnCom)),
    valorTotal: toNumber(getValue(item.prod?.vProd)),

    icmsValor: getICMSValue(item.imposto?.ICMS),
    ipiValor: getIPIValue(item.imposto?.IPI),
    pisValor: getPISValue(item.imposto?.PIS),
    cofinsValor: getCOFINSValue(item.imposto?.COFINS)
  }));

  // ==============================
  // CAMPOS PRINCIPAIS
  // ==============================

  const numero = safeString(getValue(ide.nNF));
  const serie = safeString(getValue(ide.serie));
  const modelo = safeString(getValue(ide.mod));

  const dhEmi = getValue(ide.dhEmi);

  const dataEmissao =
    dhEmi && !isNaN(Date.parse(dhEmi))
      ? new Date(dhEmi)
      : null;

  return {
    chaveAcesso:
      safeString(getValue(infNFe.Id)).replace("NFe", ""),

    numero,
    serie,
    modelo,

    fornecedorCNPJ:
      safeString(getValue(emit.CNPJ)) ||
      safeString(getValue(emit.CPF)),

    fornecedorNome: safeString(getValue(emit.xNome)),

    dataEmissao,

    valorProdutos: toNumber(getValue(total.vProd)),
    valorNota: toNumber(getValue(total.vNF)),
    valorFrete: toNumber(getValue(total.vFrete)),
    valorDesconto: toNumber(getValue(total.vDesc)),

    valorICMS: toNumber(getValue(total.vICMS)),
    valorIPI: toNumber(getValue(total.vIPI)),
    valorPIS: toNumber(getValue(total.vPIS)),
    valorCOFINS: toNumber(getValue(total.vCOFINS)),

    itens,
    xmlOriginal: xml
  };
}