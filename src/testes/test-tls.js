const https = require("https");
const fs = require("fs");

const cert = fs.readFileSync("certs/cert-completo.pem");
const key = fs.readFileSync("certs/key.pem");

const req = https.request({
  host: "nfce-homologacao.svrs.rs.gov.br",
  path: "/ws/NFeAutorizacao/NFeAutorizacao4.asmx",
  method: "GET",
  port: 443,
  cert,
  key,
  rejectUnauthorized: false
}, res => {
  console.log("STATUS:", res.statusCode);
  res.on("data", d => process.stdout.write(d));
});

req.on("error", e => console.error("ERRO TLS:", e));
req.end();