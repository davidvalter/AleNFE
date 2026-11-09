// src/utils/certificado.ts
import fs from "fs";
import path from "path";
import forge from "node-forge";

export function carregarCertificado(
  caminhoPfx: string,
  senha: string
) {
  const caminhoCompleto = path.isAbsolute(caminhoPfx)
    ? caminhoPfx
    : path.resolve(process.cwd(), caminhoPfx);

  if (!fs.existsSync(caminhoCompleto)) {
    throw new Error(`Certificado não encontrado em: ${caminhoCompleto}`);
  }

  // ✅ Ler como buffer e converter para binary sem perda
  const pfxBuffer = fs.readFileSync(caminhoCompleto);
  const pfxBinary = pfxBuffer.toString("latin1");

  const pfxAsn1 = forge.asn1.fromDer(pfxBinary);
  const p12 = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, false, senha);

  let privateKey: forge.pki.PrivateKey | null = null;
  let certificate: forge.pki.Certificate | null = null;

  // Extrair chave privada
  for (const safeContent of p12.safeContents) {
    for (const safeBag of safeContent.safeBags) {
      if (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag) {
        if (safeBag.key) {
          privateKey = safeBag.key;
        }
      }
    }
  }

  if (!privateKey) {
    throw new Error("Private key não encontrada no certificado");
  }

  // Encontrar certificado correspondente à chave
  for (const safeContent of p12.safeContents) {
    for (const safeBag of safeContent.safeBags) {
      if (safeBag.type === forge.pki.oids.certBag) {
        const certObj = safeBag.cert;
        if (!certObj) continue;
        try {
          const publicKey = certObj.publicKey;
          const test = forge.pki.setRsaPublicKey(
            (publicKey as any).n,
            (publicKey as any).e
          );
          const priv = privateKey as any;
          if (test.n.compareTo(priv.n) === 0) {
            certificate = certObj;
            break;
          }
        } catch {
          continue;
        }
      }
    }
    if (certificate) break;
  }

  if (!certificate) {
    throw new Error("Certificado correspondente à chave privada não encontrado");
  }

  const privateKeyPem = forge.pki.privateKeyToPem(privateKey);
  const publicKeyPem = forge.pki.publicKeyToPem(certificate.publicKey);
  const cert = forge.util.encode64(
    forge.asn1.toDer(
      forge.pki.certificateToAsn1(certificate)
    ).getBytes()
  );

  return {
    privateKeyPem,
    publicKeyPem,
    cert
  };
}