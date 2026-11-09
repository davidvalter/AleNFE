import fs from "fs";
import path from "path";
import libxml from "libxmljs2";

export function validarXmlNFe(
  xml: string,
  xsdPath: string
) {

  const xsdContent =
    fs.readFileSync(
      path.resolve(xsdPath),
      "utf8"
    );

  const xsdDoc =
    libxml.parseXml(xsdContent);

  const xmlDoc =
    libxml.parseXml(xml);

  const valido =
    xmlDoc.validate(xsdDoc);

  return {

    valido,

    erros:
      xmlDoc.validationErrors.map(
        (e) => e.message
      )
  };
}