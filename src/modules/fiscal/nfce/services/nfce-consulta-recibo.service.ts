// src/modules/fiscal/nfce/services/nfce-consulta-recibo.service.ts
import axios from "axios";
import https from "https";
import { XMLParser } from "fast-xml-parser";

import { prisma } from "../../../../config/database";
import { carregarCertificado } from "../../../../utils/certificado";

// =========================
// URLS SEFAZ
// =========================
const SEFAZ_RET_URL: Record<
  "homologacao" | "producao",
  Record<string, string>
> = {
  homologacao: {
    "53": "https://nfce-homologacao.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx"
  },
  producao: {
    "53": "https://nfce.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx"
  }
};

// =========================
// CONSULTAR RECIBO
// =========================
export async function consultarReciboNFCe(nfeId: number) {

  const nota = await prisma.nFeSaida.findUnique({
    where: { id: nfeId },
    include: {
      empresa: { include: { fiscalConfig: true } }
    }
  });

  if (!nota) throw new Error("Nota não encontrada");
  if (!nota.recibo) throw new Error("Nota sem recibo");

  const empresa = nota.empresa;
  const fiscal = empresa.fiscalConfig;

  if (!empresa || !fiscal) {
    throw new Error("Configuração fiscal não encontrada");
  }

  const ambiente = fiscal.ambiente === 1 ? "producao" : "homologacao";

  const ufMap: Record<string, string> = {
    DF: "53"
  };

  const uf = ufMap[(empresa.uf || "").toUpperCase()];

  if (!uf) {
    throw new Error(`UF inválida: ${empresa.uf}`);
  }

  const url = SEFAZ_RET_URL[ambiente][uf];

  // =========================
  // XML CONSULTA
  // =========================
  const xmlConsulta = `
<consReciNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <tpAmb>${fiscal.ambiente}</tpAmb>
  <nRec>${nota.recibo}</nRec>
</consReciNFe>
  `.trim();

  const soapXml = `<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Header><nfeCabecMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRetAutorizacao4"><cUF>${uf}</cUF><versaoDados>4.00</versaoDados></nfeCabecMsg></soap12:Header><soap12:Body><nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRetAutorizacao4">${xmlConsulta}</nfeDadosMsg></soap12:Body></soap12:Envelope>`;

  // =========================
  // CERTIFICADO
  // =========================
  const cert = carregarCertificado(
    empresa.certificadoPath!,
    empresa.certificadoSenha!
  );

  const httpsAgent = new https.Agent({
    cert: cert.publicKeyPem,
    key: cert.privateKeyPem,
    rejectUnauthorized: true
  });

  const response = await axios.post(url, soapXml, {
    httpsAgent,
    headers: {
      "Content-Type": "application/soap+xml; charset=utf-8"
    }
  });

  const parser = new XMLParser({
    ignoreAttributes: false
  });

  const obj = parser.parse(response.data);

  const ret =
    obj["soap12:Envelope"]?.["soap12:Body"]?.nfeResultMsg?.retConsReciNFe ||
    obj.retConsReciNFe;

  const cStat = ret?.cStat;
  const xMotivo = ret?.xMotivo;

  const prot = ret?.protNFe?.infProt;

  const cStatProt = prot?.cStat;
  const nProt = prot?.nProt;

  let status = "PROCESSANDO";

  if (cStat === "104") {
    if (cStatProt === "100") {
      status = "AUTORIZADA";
    } else {
      status = "REJEITADA";
    }
  }

  // =========================
  // SALVA
  // =========================
  await prisma.nFeSaida.update({
    where: { id: nota.id },
    data: {
      status,
      protocolo: nProt,
      motivoRejeicao: xMotivo,
      xmlRetorno: response.data,
      dataAutorizacao:
        status === "AUTORIZADA"
          ? new Date()
          : null
    }
  });

  return {
    status,
    cStat,
    cStatProt,
    xMotivo,
    protocolo: nProt
  };
}