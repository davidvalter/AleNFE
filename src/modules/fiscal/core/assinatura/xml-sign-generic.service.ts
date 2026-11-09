// src/modules/fiscal/core/assinatura/xml-sign-generic.service.ts
import { carregarCertificado } from "../../../../utils/certificado";
import { SignedXml } from "xml-crypto";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";

/**
 * Assina um elemento XML pelo seu atributo Id.
 * Genérico — funciona para infInut (inutilização) e infEvento (cancelamento).
 */
export async function assinarXmlGeneric(
    xml: string,
    idElemento: string,
    certificadoPath: string,
    certificadoSenha: string
): Promise<string> {
    const cert = carregarCertificado(certificadoPath, certificadoSenha);

    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "text/xml");

    // Encontra o elemento com o Id
    const elementos = doc.getElementsByTagName("*");
    let elementoAssinavel: any = null;
    for (let i = 0; i < elementos.length; i++) {
        if (elementos[i].getAttribute("Id") === idElemento) {
            elementoAssinavel = elementos[i];
            break;
        }
    }
    if (!elementoAssinavel) {
        throw new Error(`Elemento com Id="${idElemento}" não encontrado no XML`);
    }

    // Configura assinatura
    const sig = new SignedXml();
    sig.canonicalizationAlgorithm = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
    sig.signatureAlgorithm = "http://www.w3.org/2000/09/xmldsig#rsa-sha1";
    (sig as any).privateKey = cert.privateKeyPem;

    sig.addReference({
        xpath: `//*[@Id="${idElemento}"]`,
        transforms: [
            "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
            "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"
        ],
        digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1"
    });

    (sig as any).keyInfoProvider = {
        getKeyInfo: () => {
            return `<X509Data><X509Certificate>${cert.cert}</X509Certificate></X509Data>`;
        }
    };

    // Assina — coloca Signature após o elemento com Id (dentro do mesmo parent)
    sig.computeSignature(xml, {
        location: {
            reference: `//*[@Id='${idElemento}']`,
            action: "after"
        },
        prefix: ""
    });

    let xmlAssinado = sig.getSignedXml();

    // =========================
    // LIMPEZA — namespace cirúrgico
    // NÃO troca xmlns:ds por xmlns= (isso corrompe o namespace default do documento)
    // =========================
    xmlAssinado = xmlAssinado
        .replace(/^\uFEFF/, "")
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
        .replace(/^[^\<]+/, "");

    // 1. Adiciona xmlns SOMENTE no elemento Signature
    xmlAssinado = xmlAssinado.replace(
        /<ds:Signature/,
        '<Signature xmlns="http://www.w3.org/2000/09/xmldsig#"'
    );

    // 2. Remove o prefixo ds: de todos os elementos
    xmlAssinado = xmlAssinado
        .replace(/<ds:/g, '<')
        .replace(/<\/ds:/g, '</');

    // 3. Remove a declaração xmlns:ds (apenas remove, NÃO troca por xmlns=)
    xmlAssinado = xmlAssinado.replace(
        / xmlns:ds="http:\/\/www.w3.org\/2000\/09\/xmldsig#"/g,
        ''
    );

    // 4. KeyInfo com namespace correto se não existir
    if (!xmlAssinado.includes('<KeyInfo')) {
        xmlAssinado = xmlAssinado.replace(
            /<\/SignatureValue>/,
            `</SignatureValue><KeyInfo xmlns="http://www.w3.org/2000/09/xmldsig#"><X509Data><X509Certificate>${cert.cert}</X509Certificate></X509Data></KeyInfo>`
        );
    }

    return xmlAssinado;
}