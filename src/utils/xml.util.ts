// src/services/fiscal/core/utils/xml.util.ts

export function getValue(value: any): any {
  if (value === undefined || value === null) return null;

  // xml2js geralmente retorna assim:
  // { _: "valor" }
  if (typeof value === "object" && "_" in value) {
    return value._;
  }

  return value;
}