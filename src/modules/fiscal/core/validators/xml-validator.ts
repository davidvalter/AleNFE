// src/modules/fiscal/core/validators/xml-validator.ts
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import * as os from "os";

export function validarXml(
  xmlString: string,
  xsdPath: string
): { valido: boolean; erros: string[] } {
  // ========================= 
  // ARQUIVO TEMPORÁRIO
  // ========================= 
  const tempFile = path.join(
    os.tmpdir(),
    `nfe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.xml`
  );

  try {
    // ========================= 
    // ESCREVER XML TEMPORÁRIO
    // ========================= 
    console.log(`📝 Salvando XML temporário em: ${tempFile}`);
    fs.writeFileSync(tempFile, xmlString, "utf-8");

    // ========================= 
    // EXECUTAR XMLLINT
    // ========================= 
    console.log(`🔍 Validando contra XSD: ${xsdPath}`);
    
    try {
      execSync(`xmllint --noout --schema "${xsdPath}" "${tempFile}"`, {
        stdio: "pipe",
        encoding: "utf-8"
      });

      console.log("✅ XML válido contra XSD!");
      return {
        valido: true,
        erros: []
      };
    } catch (error: any) {
      // xmllint retorna exit code != 0 se houver erro
      const stderr = error.stderr?.toString() || error.message || "";
      const stdout = error.stdout?.toString() || "";
      const output = (stderr + stdout).trim();

      if (!output) {
        console.warn("⚠️  Validação XSD falhou (sem mensagem de erro)");
        return {
          valido: false,
          erros: ["Erro de validação XSD sem detalhes"]
        };
      }

      // Parsear erros do xmllint
      const erros = output
        .split("\n")
        .filter((line: string) => line.trim().length > 0)
        .map((line: string) => line.trim());

      console.warn("⚠️  Validação XSD falhou:");
      erros.forEach((e: string) => console.warn(`   - ${e}`));

      return {
        valido: false,
        erros
      };
    }
  } catch (error: any) {
    // Erro ao escrever arquivo temporário ou outro erro
    console.error(`❌ Erro ao validar XML: ${error.message}`);
    return {
      valido: false,
      erros: [`Erro ao validar: ${error.message}`]
    };
  } finally {
    // ========================= 
    // LIMPAR ARQUIVO TEMPORÁRIO
    // ========================= 
    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
        console.log("🗑️  Arquivo temporário removido");
      }
    } catch (cleanupError) {
      console.warn(`⚠️  Erro ao limpar arquivo temporário: ${cleanupError}`);
    }
  }
}