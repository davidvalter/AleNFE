// src/modules/fiscal/core/soap/soap-client.ts
import https from "https";

export async function enviarSoap(
  url: string,
  xml: string,
  httpsAgent: any,
  soapAction?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = Buffer.from(xml, "utf8");

    // ✅ SOAPAction default = autorização (compatibilidade)
    const action = soapAction || "http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote";

    const options: https.RequestOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: "POST",
      port: urlObj.port ? Number(urlObj.port) : 443,
      agent: httpsAgent,
      timeout: 8000,
      headers: {
        "Content-Type": `application/soap+xml; charset=utf-8; action="${action}"`,
        "SOAPAction": action
      }
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk: string) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          const err: any = new Error(`HTTP ${res.statusCode}`);
          err.response = {
            status: res.statusCode,
            headers: res.headers,
            data
          };
          reject(err);
        }
      });
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      const err: any = new Error("timeout");
      err.code = "ETIMEDOUT";
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}