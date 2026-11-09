// src/modules/fiscal/nfce/utils/nfce-qrcode.ts

type QRCodeParams = {
  chave: string;
  versao?: string;       // obsoleto (mantido para compatibilidade)
  tpAmb: number;          // 1 produção / 2 homologação
  csc?: string;           // obsoleto na v3
  cscId?: string;         // obsoleto na v3
  uf: string;
  dia?: string;           // obsoleto na v3 online
  valorTotal?: string;    // obsoleto na v3 online
};

// =========================
// URL BASE (por UF)
// DF tem URL própria; demais UFs usam SVRS
// =========================
function getQrCodeBaseUrl(tpAmb: number, uf: string) {
  // Distrito Federal tem URL própria para QR Code
  if (uf.toUpperCase() === "DF") {
    return "http://www.fazenda.df.gov.br/nfce/qrcode";
  }

  // SVRS (demais UFs que usam SVRS)
  if (tpAmb === 1) {
    return "https://nfce.svrs.rs.gov.br/qrcode";
  }
  return "https://nfce-homologacao.svrs.rs.gov.br/qrcode";
}

// =========================
// GERA QR CODE NFC-e
// Versão 3.0 ONLINE (sem CSC, sem hash)
// Formato: base?p=chave|3|tpAmb
// =========================
export function gerarQRCodeNFCe({
  chave,
  tpAmb,
  uf
}: QRCodeParams) {

  const baseUrl = getQrCodeBaseUrl(tpAmb, uf);

  // Versão 3.0 do QR Code (NT 2025.001)
  const versaoQR = "3";

  // Online: apenas chave|3|tpAmb
  const urlFinal = `${baseUrl}?p=${chave}|${versaoQR}|${tpAmb}`;

  return urlFinal;
}