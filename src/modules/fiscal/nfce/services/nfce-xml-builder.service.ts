// src/modules/fiscal/nfce/services/nfce-xml-builder.service.ts
import { create } from "xmlbuilder2";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../../../../config/database";
import { gerarQRCodeNFCe } from "../utils/nfce-qrcode";
import { debugSignature } from "../../core/debug/signature-debug";
import {
  gerarCodigoNumerico,
  gerarChaveAcesso
} from "../../core/utils/nfe-chave";

export async function gerarXMLNFCe(nfeId: number) {

  const nota = await prisma.nFeSaida.findUnique({
    where: { id: nfeId },
    include: {
      itens: true,
      pagamentos: true,
      empresa: {
        include: { fiscalConfig: true }
      }
    }
  });

  if (!nota) {
    throw new Error("Nota não encontrada");
  }

  const empresa = nota.empresa!;
  const fiscal = empresa.fiscalConfig!;

  if (!fiscal.csc || !fiscal.cscId) {
    throw new Error("CSC não configurado");
  }

  if (!nota.itens.length) {
    throw new Error("Nota sem itens");
  }

  // =========================
  // HELPERS
  // =========================
  function formatarDataNFe(date: Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}-03:00`;
  }

  function formatarValor(valor: any): string {
    if (valor instanceof Decimal) {
      return valor.toNumber().toFixed(2);
    }
    return Number(valor || 0).toFixed(2);
  }

  function somenteNumeros(valor: string = ""): string {
    return valor.replace(/\D/g, "");
  }

  // =========================
  // NUMERAÇÃO
  // =========================
  const numero = fiscal.ultimaNFe + 1;
  const serie = fiscal.seriePadrao || 1;
  const dataEmissao = new Date();

  // =========================
  // UF
  // =========================
  const ufToCodigo: Record<string, string> = {
    RO: "11", AC: "12", AM: "13", RR: "14", PA: "15", AP: "16", TO: "17",
    MA: "21", PI: "22", CE: "23", RN: "24", PB: "25", PE: "26", AL: "27",
    SE: "28", BA: "29", MG: "31", ES: "32", RJ: "33", SP: "35", PR: "41",
    SC: "42", RS: "43", MS: "50", MT: "51", GO: "52", DF: "53"
  };

  const cUF = ufToCodigo[empresa.uf!];
  if (!cUF) {
    throw new Error("UF inválida");
  }

  // =========================
  // CHAVE
  // =========================
  const codigoNumerico = gerarCodigoNumerico();
  const chaveData = gerarChaveAcesso({
    cUF,
    dataEmissao,
    cnpj: somenteNumeros(empresa.cnpj!),
    modelo: nota.modelo || "65",
    serie,
    numero,
    tpEmis: "1",
    codigoNumerico
  });
  const chaveAcesso = chaveData.chave;

  const urlConsulta =
    fiscal.ambiente === 1
      ? "https://www.sefaz.df.gov.br/nfce/consulta"
      : "https://dec.fazenda.df.gov.br/ConsultarNFCe.aspx";

  // =========================
  // DESTINATÁRIO
  // =========================
  const doc = somenteNumeros(nota.clienteDocumento || "");
  const tagDoc = doc.length === 14 ? "CNPJ" : "CPF";

  // =========================
  // TOTAIS
  // =========================
  const vProd = nota.itens.reduce((total, item) => {
    return total + Number(item.valorTotal || 0);
  }, 0);
  const vNF = vProd;

  // =========================
  // XML — infNFe CAPTURADO EM VARIÁVEL PRÓPRIA
  // =========================
  const xml = create({ version: "1.0", encoding: "UTF-8" });
  const nfeNode = xml.ele("NFe", { xmlns: "http://www.portalfiscal.inf.br/nfe" });

  // CRÍTICO: capturar infNFe em variável — TODOS os filhos encadeiam a partir dela
  const infNFeNode = nfeNode.ele("infNFe", { versao: "4.00", Id: chaveData.idNFe });

  // =========================
  // IDE
  // =========================
  const ide = infNFeNode.ele("ide");
  ide.ele("cUF").txt(cUF).up();
  ide.ele("cNF").txt(codigoNumerico).up();
  ide.ele("natOp").txt(fiscal.naturezaOperacao || "VENDA").up();
  ide.ele("mod").txt(nota.modelo || "65").up();
  ide.ele("serie").txt(String(serie)).up();
  ide.ele("nNF").txt(String(numero)).up();
  ide.ele("dhEmi").txt(formatarDataNFe(dataEmissao)).up();
  ide.ele("tpNF").txt("1").up();
  ide.ele("idDest").txt("1").up();
  ide.ele("cMunFG").txt(empresa.codigoMunicipio || "").up();
  ide.ele("tpImp").txt("4").up();
  ide.ele("tpEmis").txt("1").up();
  ide.ele("cDV").txt(String(chaveData.dv)).up();
  ide.ele("tpAmb").txt(String(fiscal.ambiente)).up();
  ide.ele("finNFe").txt("1").up();
  ide.ele("indFinal").txt("1").up();
  ide.ele("indPres").txt("1").up();
  ide.ele("procEmi").txt("0").up();
  ide.ele("verProc").txt("ALENFE1.0").up();
  ide.up();

  // =========================
  // EMITENTE
  // =========================
  const emit = infNFeNode.ele("emit");
  emit.ele("CNPJ").txt(somenteNumeros(empresa.cnpj!)).up();
  emit.ele("xNome").txt(empresa.razaoSocial || "").up();
  emit.ele("xFant").txt(empresa.nomeFantasia || empresa.razaoSocial || "").up();
  const enderEmit = emit.ele("enderEmit");
  enderEmit.ele("xLgr").txt(empresa.logradouro || "").up();
  enderEmit.ele("nro").txt(empresa.numero || "SN").up();
  enderEmit.ele("xBairro").txt(empresa.bairro || "").up();
  enderEmit.ele("cMun").txt(empresa.codigoMunicipio || "").up();
  enderEmit.ele("xMun").txt(empresa.cidade || "").up();
  enderEmit.ele("UF").txt(empresa.uf || "").up();
  enderEmit.ele("CEP").txt(somenteNumeros(empresa.cep || "")).up();
  enderEmit.ele("cPais").txt("1058").up();
  enderEmit.ele("xPais").txt("Brasil").up();
  enderEmit.up();
  emit.ele("IE").txt(somenteNumeros(fiscal.ie || "")).up();
  emit.ele("CRT").txt(String(fiscal.crt)).up();
  emit.up();

  // =========================
  // DESTINATÁRIO
  // =========================
  const dest = infNFeNode.ele("dest");
  dest.ele(tagDoc).txt(doc).up();
  dest.ele("xNome").txt(nota.clienteNome || "CONSUMIDOR").up();
  dest.ele("indIEDest").txt("9").up();
  dest.up();

  // =========================
  // ITENS (det DENTRO de infNFe)
  // =========================
  nota.itens.forEach((item) => {
    const det = infNFeNode.ele("det", { nItem: String(item.itemNumero) });

    // PRODUTO
    const prod = det.ele("prod");
    prod.ele("cProd").txt(item.codigo || "").up();
    prod.ele("cEAN").txt("SEM GTIN").up();
    prod.ele("xProd").txt(item.descricao || "").up();
    prod.ele("NCM").txt(item.ncm || "00000000").up();
    if (item.cest) {
      prod.ele("CEST").txt(item.cest).up();
    }
    prod.ele("CFOP").txt(item.cfop || "5102").up();
    prod.ele("uCom").txt(item.unidade || "UN").up();
    prod.ele("qCom").txt(formatarValor(item.quantidade)).up();
    prod.ele("vUnCom").txt(formatarValor(item.valorUnitario)).up();
    prod.ele("vProd").txt(formatarValor(item.valorTotal)).up();
    prod.ele("cEANTrib").txt("SEM GTIN").up();
    prod.ele("uTrib").txt(item.unidade || "UN").up();
    prod.ele("qTrib").txt(formatarValor(item.quantidade)).up();
    prod.ele("vUnTrib").txt(formatarValor(item.valorUnitario)).up();
    prod.ele("indTot").txt("1").up();
    prod.up();

    // IMPOSTOS
    const imposto = det.ele("imposto");

    // ICMS
    const icms = imposto.ele("ICMS");
    const icmsSn = icms.ele("ICMSSN102");
    const orig = item.orig || "0";
    const csosn = item.csosn || fiscal.csosnPadrao || "102";
    icmsSn.ele("orig").txt(orig).up();
    icmsSn.ele("CSOSN").txt(csosn).up();
    icmsSn.up();
    icms.up();

    // PIS — CST hierárquico: produto → empresa → default
    const cstPIS = item.cstPIS || fiscal.cstPisPadrao || "07";
    const pis = imposto.ele("PIS");
    const pisNt = pis.ele("PISNT");
    pisNt.ele("CST").txt(cstPIS).up();
    pisNt.up();
    pis.up();

    // COFINS — CST hierárquico: produto → empresa → default
    const cstCOFINS = item.cstCOFINS || fiscal.cstCofinsPadrao || "07";
    const cofins = imposto.ele("COFINS");
    const cofinsNt = cofins.ele("COFINSNT");
    cofinsNt.ele("CST").txt(cstCOFINS).up();
    cofinsNt.up();
    cofins.up();

    imposto.up();
    det.up();
  }
);

  // =========================
  // TOTAL (DENTRO de infNFe)
  // =========================
  const total = infNFeNode.ele("total");
  const icmsTot = total.ele("ICMSTot");
  icmsTot.ele("vBC").txt("0.00").up();
  icmsTot.ele("vICMS").txt("0.00").up();
  icmsTot.ele("vICMSDeson").txt("0.00").up();
  icmsTot.ele("vFCP").txt("0.00").up();
  icmsTot.ele("vBCST").txt("0.00").up();
  icmsTot.ele("vST").txt("0.00").up();
  icmsTot.ele("vFCPST").txt("0.00").up();
  icmsTot.ele("vFCPSTRet").txt("0.00").up();
  icmsTot.ele("vProd").txt(formatarValor(vProd)).up();
  icmsTot.ele("vFrete").txt("0.00").up();
  icmsTot.ele("vSeg").txt("0.00").up();
  icmsTot.ele("vDesc").txt("0.00").up();
  icmsTot.ele("vII").txt("0.00").up();
  icmsTot.ele("vIPI").txt("0.00").up();
  icmsTot.ele("vIPIDevol").txt("0.00").up();
  icmsTot.ele("vPIS").txt("0.00").up();
  icmsTot.ele("vCOFINS").txt("0.00").up();
  icmsTot.ele("vOutro").txt("0.00").up();
  icmsTot.ele("vNF").txt(formatarValor(vNF)).up();
  icmsTot.up();
  total.up();

  // =========================
  // TRANSPORTE (DENTRO de infNFe)
  // =========================
  const transp = infNFeNode.ele("transp");
  transp.ele("modFrete").txt("9").up();
  transp.up();

  // =========================
  // PAGAMENTO (DENTRO de infNFe)
  // =========================
  const pag = infNFeNode.ele("pag");
  if (nota.pagamentos.length > 0) {
    nota.pagamentos.forEach((pagamento) => {
      const detPag = pag.ele("detPag");
      detPag.ele("tPag").txt(String(pagamento.formaPagamento || "01")).up();
      detPag.ele("vPag").txt(formatarValor(pagamento.valor)).up();
      detPag.up();
    });
  } else {
    const detPag = pag.ele("detPag");
    detPag.ele("tPag").txt("01").up();
    detPag.ele("vPag").txt(formatarValor(vNF)).up();
    detPag.up();
  }
  pag.ele("vTroco").txt("0.00").up();
  pag.up();

  // =========================
  // QR CODE
  // =========================
  // Extrair dia da data de emissão (2 dígitos com zero à esquerda)
  const diaEmissao = String(dataEmissao.getDate()).padStart(2, "0");

  const qrCode = gerarQRCodeNFCe({
    chave: chaveAcesso,
    versao: "3",
    tpAmb: fiscal.ambiente,
    csc: fiscal.csc || "",
    cscId: fiscal.cscId || "000001",
    uf: empresa.uf || "DF",
    dia: diaEmissao,
    valorTotal: vNF.toFixed(2)
  });

  // =========================
  // INFORMAÇÕES SUPLEMENTARES
  // (FORA de infNFe — irmão dela dentro de NFe)
  // =========================
  const infNFeSupl = nfeNode.ele("infNFeSupl");
  infNFeSupl.ele("qrCode").dat(qrCode).up();
  infNFeSupl.ele("urlChave").txt(urlConsulta).up();
  infNFeSupl.up();

  const xmlString = xml.end({ prettyPrint: false });

  // ✅ DEBUGAR ASSINATURA
  debugSignature(xmlString, "XML_GERADO_ANTES_ASSINATURA");

  // =========================
  // SALVA
  // =========================
  await prisma.empresaFiscalConfig.update({
    where: { empresaId: empresa.id },
    data: { ultimaNFe: numero }
  });

  await prisma.nFeSaida.update({
    where: { id: nota.id },
    data: {
      numero,
      serie,
      chaveAcesso,
      dataEmissao,
      xmlEnvio: xmlString,
      status: "XML_GERADO"
    }
  });

  return xmlString;
}