// src/modules/fiscal/core/certificado.service.ts
import https from "https";
import fs from "fs";
import forge from "node-forge";

export function criarHttpsAgent(caminhoPfx: string, senha: string) {
  if (!fs.existsSync(caminhoPfx)) {
    throw new Error(`Certificado PFX não encontrado em: ${caminhoPfx}`);
  }

  const pfxBuffer = fs.readFileSync(caminhoPfx);
  const pfxBinary = pfxBuffer.toString("latin1");

  const pfxAsn1 = forge.asn1.fromDer(pfxBinary);
  const p12 = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, false, senha);

  let privateKey: forge.pki.PrivateKey | null = null;
  let certPem: string | null = null;
  const certChain: string[] = [];

  // 1. Extrair chave privada
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
    throw new Error("Chave privada não encontrada no certificado PFX");
  }

  // 2. Encontrar o certificado que CORRESPONDE à chave privada
  for (const safeContent of p12.safeContents) {
    for (const safeBag of safeContent.safeBags) {
      if (safeBag.type === forge.pki.oids.certBag && safeBag.cert) {
        const certPemStr = forge.pki.certificateToPem(safeBag.cert);
        certChain.push(certPemStr);

        // Comparar módulo da chave pública com a chave privada
        if (!certPem) {
          try {
            const pubN = (safeBag.cert.publicKey as any).n;
            const privN = (privateKey as any).n;
            if (pubN && privN && pubN.compareTo(privN) === 0) {
              certPem = certPemStr;
            }
          } catch {
            // não corresponde — continua procurando
          }
        }
      }
    }
  }

  if (!certPem) {
    throw new Error("Certificado correspondente à chave privada não encontrado no PFX");
  }

  const privateKeyPem = forge.pki.privateKeyToPem(privateKey);

  return new https.Agent({
    cert: certPem,
    key: privateKeyPem,
    passphrase: senha,
    ca: certChain,
    rejectUnauthorized: false,
    keepAlive: true
  });
}