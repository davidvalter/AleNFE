// src/modules/fiscal/core/assinatura/xml-sign.service.ts
import { prisma } from "../../../../config/database";
import { carregarCertificado } from "../../../../utils/certificado";
import { SignedXml } from "xml-crypto";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";

export async function assinarXMLNFCe(nfeId: number) {
    // =========================
    // BUSCA NFE
    // =========================
    const nota = await prisma.nFeSaida.findUnique({
        where: { id: nfeId },
        include: { empresa: { include: { fiscalConfig: true } } }
    });

    if (!nota) throw new Error("NFC-e não encontrada");
    if (!nota.xmlEnvio) throw new Error("XML não gerado");

    const empresa = nota.empresa;
    if (!empresa?.certificadoPath || !empresa.certificadoSenha) {
        throw new Error("Certificado não configurado");
    }

    // =========================
    // CARREGA CERTIFICADO
    // =========================
    const cert = carregarCertificado(
        empresa.certificadoPath,
        empresa.certificadoSenha
    );

    // =========================
    // PREPARA XML
    // =========================
    const xml = nota.xmlEnvio;
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "text/xml");
    const infNFe = doc.getElementsByTagName("infNFe")[0];

    if (!infNFe) throw new Error("Tag infNFe não encontrada");

    const id = infNFe.getAttribute("Id");
    if (!id) throw new Error("infNFe sem Id");

    // =========================
    // ASSINATURA
    // =========================
    const sig = new SignedXml();
    sig.canonicalizationAlgorithm = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
    sig.signatureAlgorithm = "http://www.w3.org/2000/09/xmldsig#rsa-sha1";
    (sig as any).privateKey = cert.privateKeyPem;

    sig.addReference({
        xpath: `//*[@Id="${id}"]`,
        transforms: [
            "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
            "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"
        ],
        digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1"
    });

    // ✅ CONFIGURAÇÃO CORRETA DO KEYINFO (Programática)
    (sig as any).keyInfoProvider = {
        getKeyInfo: () => {
            return `<X509Data><X509Certificate>${cert.cert}</X509Certificate></X509Data>`;
        }
    };

    // ✅ ASSINAR SEM PREFIXO (Para evitar erro 404)
    sig.computeSignature(xml, {
        location: {
            reference: "//*[local-name()='infNFe']",
            action: "after"
        },
        prefix: "" // Mantenha vazio!
    });

    let xmlAssinado = sig.getSignedXml();

    // =========================
    // REALOCAR A ASSINATURA
    // =========================
    const signedDoc = parser.parseFromString(xmlAssinado, "text/xml");

    let signatureNode =
        signedDoc.getElementsByTagName("Signature")[0] ||
        signedDoc.getElementsByTagName("ds:Signature")[0] ||
        signedDoc.getElementsByTagNameNS("*", "Signature")[0];

    if (!signatureNode) {
        throw new Error("Falha: Signature não encontrada após assinatura.");
    }

    const parent = signatureNode.parentNode;
    if (parent) {
        parent.removeChild(signatureNode);
    }

    const nfeNode = signedDoc.getElementsByTagName("NFe")[0];

    // ✅ Ordem exigida pelo XSD 4.00: infNFe → infNFeSupl → Signature
    // Signature deve ser o ÚLTIMO filho de NFe (após infNFeSupl, se existir)
    nfeNode.appendChild(signatureNode);

    // =========================
    // SERIALIZAR
    // =========================
    const serializer = new XMLSerializer();
    let xmlLimpo = serializer.serializeToString(signedDoc);

    // =========================
    // LIMPEZA
    // =========================
    xmlLimpo = xmlLimpo.replace(/^\uFEFF/, "");
    xmlLimpo = xmlLimpo.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
    xmlLimpo = xmlLimpo.replace(/^[^\<]+/, "");

    // =========================
    // REMOVER PREFIXO ds:
    // =========================
    xmlLimpo = xmlLimpo
        .replace(/ xmlns:ds="http:\/\/www.w3.org\/2000\/09\/xmldsig#"/g, ' xmlns="http://www.w3.org/2000/09/xmldsig#"')
        .replace(/<ds:/g, '<')
        .replace(/<\/ds:/g, '</');


    // =========================
    // RE-INSERIR CDATA NO QRCODE
    // @xmldom/xmldom remove CDATA durante parse/serialize
    // =========================
    if (xmlLimpo.includes("<qrCode>") && !xmlLimpo.includes("<qrCode><![CDATA[")) {
        xmlLimpo = xmlLimpo.replace(
            /<qrCode>([^<]*)<\/qrCode>/g,
            (_match, content) => {
                // Desescapar entidades que XMLSerializer adicionou
                content = content
                    .replace(/&amp;/g, "&")
                    .replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">");
                return `<qrCode><![CDATA[${content}]]></qrCode>`;
            }
        );
    }
    // =========================
    // 🔥 ADICIONAR <KeyInfo> UMA VEZ APENAS - NO FINAL
    // =========================
    // ✅ Verifica se KeyInfo NÃO existe (sem prefixo ds:)
    if (!xmlLimpo.includes("<KeyInfo>")) {
        xmlLimpo = xmlLimpo.replace(
            /<\/SignatureValue>/,
            `</SignatureValue><KeyInfo xmlns="http://www.w3.org/2000/09/xmldsig#"><X509Data><X509Certificate>${cert.cert}</X509Certificate></X509Data></KeyInfo>`
        );
    }

    // =========================
    // SALVA
    // =========================
    await prisma.nFeSaida.update({
        where: { id: nota.id },
        data: { xmlAssinado: xmlLimpo, status: "ASSINADA" }
    });

    return { success: true, status: "ASSINADA" };
}