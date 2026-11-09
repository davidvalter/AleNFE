const https = require("https");
const fs = require("fs");

const cert = fs.readFileSync("certs/cert-completo.pem");
const key = fs.readFileSync("certs/key.pem");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeAutorizacaoLote xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
      <nfeDadosMsg>
        <enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
<idLote>999999999999999</idLote>
<indSinc>1</indSinc>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe versao="4.00" Id="NFe53260558300791000155650010000000301071720880"><ide><cUF>53</cUF><cNF>07172088</cNF><natOp>VENDA DE MERCADORIA</natOp><mod>65</mod><serie>1</serie><nNF>30</nNF><dhEmi>2026-05-12T18:43:44-03:00</dhEmi><tpNF>1</tpNF><idDest>1</idDest><cMunFG>5300108</cMunFG><tpImp>4</tpImp><tpEmis>1</tpEmis><cDV>0</cDV><tpAmb>2</tpAmb><finNFe>1</finNFe><indFinal>1</indFinal><indPres>1</indPres><procEmi>0</procEmi><verProc>ALENFE1.0</verProc></ide><emit><CNPJ>58300791000155</CNPJ><xNome>GOUVEIA RODRIGUES RESTAURANTE LTDA</xNome><xFant>ALECRIM INTELIGENTE</xFant><enderEmit><xLgr>SCS QUADRA 08 BLOCO B</xLgr><nro>SN</nro><xBairro>ASA SUL</xBairro><cMun>5300108</cMun><xMun>BRASILIA</xMun><UF>DF</UF><CEP>70333900</CEP></enderEmit><IE>0834818600131</IE><CRT>1</CRT></emit><dest><CPF>12345678909</CPF><xNome>CLIENTE TESTE</xNome><indIEDest>9</indIEDest></dest><det nItem="1"><prod><cProd>1</cProd><cEAN>SEM GTIN</cEAN><xProd>PRODUTO TESTE</xProd><NCM>22030000</NCM><CFOP>5102</CFOP><uCom>UN</uCom><qCom>1.00</qCom><vUnCom>10.00</vUnCom><vProd>10.00</vProd><cEANTrib>SEM GTIN</cEANTrib><uTrib>UN</uTrib><qTrib>1.00</qTrib><vUnTrib>10.00</vUnTrib><indTot>1</indTot></prod><imposto><ICMS><ICMSSN102><orig>0</orig><CSOSN>102</CSOSN></ICMSSN102></ICMS><PIS><PISNT><CST>07</CST></PISNT></PIS><COFINS><COFINSNT><CST>07</CST></COFINSNT></COFINS></imposto></det><total><ICMSTot><vBC>0.00</vBC><vICMS>0.00</vICMS><vICMSDeson>0.00</vICMSDeson><vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>0.00</vST><vFCPST>0.00</vFCPST><vFCPSTRet>0.00</vFCPSTRet><vProd>10.00</vProd><vFrete>0.00</vFrete><vSeg>0.00</vSeg><vDesc>0.00</vDesc><vII>0.00</vII><vIPI>0.00</vIPI><vIPIDevol>0.00</vIPIDevol><vPIS>0.00</vPIS><vCOFINS>0.00</vCOFINS><vOutro>0.00</vOutro><vNF>10.00</vNF></ICMSTot></total><pag><detPag><indPag>0</indPag><tPag>01</tPag><vPag>10.00</vPag></detPag><vTroco>0.00</vTroco></pag></infNFe><infNFeSupl><qrCode><![CDATA[https://nfce-homologacao.svrs.rs.gov.br/qrcode?chNFe=53260558300791000155650010000000301071720880&nVersao=2&tpAmb=2&cIdToken=1&cHashQRCode=FBA8CEE4BAB0FFB6270D9DF19357608538BCBC9D]]></qrCode><urlChave>https://dec.fazenda.df.gov.br/ConsultarNFCe.aspx</urlChave></infNFeSupl><Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignedInfo><CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/><SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/><Reference URI="#NFe53260558300791000155650010000000301071720880"><Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/><Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/></Transforms><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><DigestValue>FlP4zI4K8pY5Bt8jq6zH/SEt0s47QQ4UxtBpTVJcARs=</DigestValue></Reference></SignedInfo><SignatureValue>PxfkgGccz17I4YyboyQ+iavRhU92+z1rWu41DGzmsk1zefnpPADxe/P2l7H87A8M4iJMRABQ99g3wi2WX3UfiUJlQHLmK3vocF5E84eEZJ0XilDqLEqr7c+gA/Y3DeC1lSBdvnsIOpeTH4pYBLnQ4VunKE9XZmJI0bWMxWIEBoSY1cCyg6XKguOlifIYc3KXcFvklO4HGCk5KGBaAvDpcJL52poLMJv3z6qcLQK3soXsdbUHwDUuGNdNVopyXaNituYlFrefpp5pRwAgwhbIOfeqVVlnBdRkibc4X0Gl3xxQhABWDE6r8tChpyiWs7+p7/0WWt0jrX4jpOvpy8uDLQ==</SignatureValue></Signature></NFe>
</enviNFe>
      </nfeDadosMsg>
    </nfeAutorizacaoLote>
  </soap12:Body>
</soap12:Envelope>`;

const postData = Buffer.from(xml, "utf8");

const req = https.request({
    hostname: "nfce-homologacao.svrs.rs.gov.br",
    path: "/ws/NFeAutorizacao/NFeAutorizacao4.asmx",
    method: "POST",
    port: 443,
    cert,
    key,
    rejectUnauthorized: false,
    headers: {
        "Content-Type": 'application/soap+xml; charset=utf-8; action="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote"',
        "Content-Length": postData.length
    }
}, (res) => {
    console.log("STATUS:", res.statusCode);
    console.log("HEADERS:", JSON.stringify(res.headers));
    let data = "";
    res.on("data", chunk => data += chunk);
    res.on("end", () => {
        console.log("BODY (first 500 chars):", data.substring(0, 500));
        if (res.statusCode === 200) {
            console.log("✅ SOAP POST FUNCIONOU - problema está no axios");
        } else {
            console.log("❌ SOAP POST falhou - problema está no envelope/headers");
        }
    });
});

req.on("error", e => console.error("ERRO:", e.message));
req.write(postData);
req.end();