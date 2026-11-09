// src/modules/fiscal/core/soap/soap-builder.ts
export function montarSoapEnvelope(
  xmlFinal: string,
  cUF: string = "53",
  servico: string = "NFeAutorizacao4",
  versaoDados: string = "4.00"
): string {
  return `<?xml version="1.0" encoding="UTF-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Header><nfeCabecMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/${servico}"><cUF>${cUF}</cUF><versaoDados>${versaoDados}</versaoDados></nfeCabecMsg></soap12:Header><soap12:Body><nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/${servico}">${xmlFinal}</nfeDadosMsg></soap12:Body></soap12:Envelope>`;
}