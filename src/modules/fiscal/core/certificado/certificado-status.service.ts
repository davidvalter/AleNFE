import fs from 'fs';
import forge from 'node-forge';

export type EstadoCertificado = 'PENDENTE' | 'ARQUIVO_AUSENTE' | 'INVALIDO' | 'EXPIRADO' | 'NAO_VIGENTE' | 'VALIDO';

export interface StatusCertificado {
  status: EstadoCertificado;
  validoDesde: string | null;
  validoAte: string | null;
}

function status(status: EstadoCertificado, validoDesde: Date | null = null, validoAte: Date | null = null): StatusCertificado {
  return {
    status,
    validoDesde: validoDesde?.toISOString() || null,
    validoAte: validoAte?.toISOString() || null
  };
}

/**
 * Lê o PFX cadastrado e verifica a validade temporal do certificado associado à chave privada.
 * Não valida revogação nem a cadeia de confiança da autoridade certificadora.
 */
export function obterStatusCertificado(caminhoPfx: string | null, senha: string | null, agora = new Date()): StatusCertificado {
  if (!caminhoPfx || !senha) return status('PENDENTE');
  if (!fs.existsSync(caminhoPfx)) return status('ARQUIVO_AUSENTE');

  try {
    const pfxBuffer = fs.readFileSync(caminhoPfx);
    const pfxAsn1 = forge.asn1.fromDer(pfxBuffer.toString('latin1'));
    const p12 = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, false, senha);

    let privateKey: forge.pki.PrivateKey | null = null;
    const certificados: forge.pki.Certificate[] = [];

    for (const safeContent of p12.safeContents) {
      for (const safeBag of safeContent.safeBags) {
        if (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag && safeBag.key) {
          privateKey = safeBag.key;
        }
        if (safeBag.type === forge.pki.oids.certBag && safeBag.cert) {
          certificados.push(safeBag.cert);
        }
      }
    }

    if (!privateKey) return status('INVALIDO');

    let certificadoCorrespondente: forge.pki.Certificate | null = null;
    for (const certificado of certificados) {
      try {
        const publicN = (certificado.publicKey as any).n;
        const privateN = (privateKey as any).n;
        if (publicN && privateN && publicN.compareTo(privateN) === 0) {
          certificadoCorrespondente = certificado;
          break;
        }
      } catch {
        // Certificado não correspondente; tenta o próximo da cadeia.
      }
    }

    if (!certificadoCorrespondente) return status('INVALIDO');

    const validoDesde = certificadoCorrespondente.validity.notBefore;
    const validoAte = certificadoCorrespondente.validity.notAfter;
    if (validoAte.getTime() <= agora.getTime()) return status('EXPIRADO', validoDesde, validoAte);
    if (validoDesde.getTime() > agora.getTime()) return status('NAO_VIGENTE', validoDesde, validoAte);
    return status('VALIDO', validoDesde, validoAte);
  } catch {
    return status('INVALIDO');
  }
}
