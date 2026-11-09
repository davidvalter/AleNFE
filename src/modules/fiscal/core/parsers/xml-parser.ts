// src/modules/fiscal/core/parsers/xml-parser.ts
import { XMLParser } from 'fast-xml-parser';

export interface SefazResponse {
  cStatLote: string;
  xMotivo: string;
  chaveAcesso: string | null;
  cStatProt: string | null;
  protocolo: string | null;
  recibo: string | null;
}

export class XmlParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      parseTagValue: false,
      ignoreAttributes: false,
      removeNSPrefix: false
    });
  }

  public parseSefazResponse(xmlData: string): SefazResponse {
    try {
      const obj = this.parser.parse(xmlData);
      console.debug('Parsed XML Object:', JSON.stringify(obj, null, 2));

      const body = obj?.['soap:Envelope']?.['soap:Body']?.nfeResultMsg?.retEnviNFe;

      if (!body) {
        throw new Error('Estrutura do XML SOAP inválida ou não encontrada.');
      }

      const protNFe = body.protNFe;
      const infProt = protNFe?.infProt;

      const result: SefazResponse = {
        cStatLote: String(body.cStat || ''),
        xMotivo: String(body.xMotivo || ''),
        chaveAcesso: infProt?.chNFe ? String(infProt.chNFe) : null,
        cStatProt: infProt?.cStat ? String(infProt.cStat) : null,
        protocolo: infProt?.nProt ? String(infProt.nProt) : null,
        recibo: body.infRec?.nRec ? String(body.infRec.nRec) : null
      };

      console.debug('Extracted Sefaz Data:', result);
      return result;
    } catch (error) {
      console.error('Erro ao processar XML da SEFAZ:', error);
      throw error;
    }
  }
}