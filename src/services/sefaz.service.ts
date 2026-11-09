import { DistribuicaoNFe } from "@vexta-systems/node-mde";
import fs from "fs";
import { parseStringPromise } from "xml2js";
import { prisma } from "../config/database";
import { parseNFeXML } from "./xml-parser.service";
import { manifestarCienciaLote, ResultadoManifestacao, TP_AMB_SEFAZ } from "./manifestacao.service";

const ULT_NSU_INICIAL = "000000000000000";

// Código IBGE da UF do emitente da consulta (cUFAutor) — vem do cadastro da empresa
const UF_CODIGO: Record<string, string> = {
  AC: "12", AL: "27", AP: "16", AM: "13", BA: "29", CE: "23", DF: "53",
  ES: "32", GO: "52", MA: "21", MT: "51", MS: "50", MG: "31", PA: "15",
  PB: "25", PR: "41", PE: "26", PI: "22", RJ: "33", RN: "24", RS: "43",
  RO: "11", RR: "14", SC: "42", SP: "35", SE: "28", TO: "17"
};

/** Parser leve para resNFe (resumo sem XML completo) */
async function parseResumoNFe(xml: string) {
  const parsed = await parseStringPromise(xml, {
    explicitArray: false,
    mergeAttrs: true,
    tagNameProcessors: [(name) => name.replace("ns0:", "").replace("ns1:", "")]
  });

  const res = parsed.resNFe || parsed.nfeProc?.resNFe || parsed || {};
  const dhEmi = res.dhEmi || res.dEmi;

  return {
    chaveAcesso: String(res.chNFe ?? "").trim(),
    numero: String(res.nNF ?? "0"),
    serie: String(res.serie ?? "0"),
    fornecedorCNPJ: String(res.CNPJ ?? res.CPF ?? ""),
    fornecedorNome: String(res.xNome ?? ""),
    dataEmissao: dhEmi && !isNaN(Date.parse(dhEmi)) ? new Date(dhEmi) : null,
    valorNota: res.vNF !== undefined && res.vNF !== "" ? Number(res.vNF) : 0
  };
}

export async function importarNotas(empresaId: number) {
  const logs: string[] = [];
  const addLog = (msg: string) => {
    const linha = `[${new Date().toISOString()}] ${msg}`;
    logs.push(linha);
    console.log(linha);
  };

  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa) throw new Error("Empresa não encontrada");

  if (!empresa.certificadoPath || !empresa.certificadoSenha) {
    throw new Error(
      "Empresa sem certificado digital ou senha cadastrados. Complete o cadastro antes de importar."
    );
  }

  const logExec = await prisma.importacaoLog.create({
    data: {
      empresaId,
      status: "PROCESSANDO",
      nsuInicial: empresa.ultNSU
    }
  });

  try {
    const pfx = fs.readFileSync(empresa.certificadoPath);

    const cUFAutor = empresa.uf ? UF_CODIGO[empresa.uf.toUpperCase()] : undefined;

    const dist = new DistribuicaoNFe({
      pfx,
      passphrase: empresa.certificadoSenha || undefined,
      cnpj: empresa.cnpj,
      tpAmb: TP_AMB_SEFAZ as "1" | "2", // produção FIXO — não vem do env
      cUFAutor: (cUFAutor || "42") as any
    });

    let ultNSU = empresa.ultNSU || ULT_NSU_INICIAL;
    let maxNSU = empresa.maxNSU || ULT_NSU_INICIAL;

    let totalDocumentos = 0;
    const chavesParaManifestar: string[] = [];
    const falhas: string[] = [];

    let continuar = true;

    while (continuar) {
      const nsuAntes = ultNSU;
      addLog(`Iniciando consulta NSU: ${ultNSU}`);

      const consulta = await dist.consultaUltNSU(ultNSU);
      if (consulta.error) throw new Error(consulta.error);

      const data = consulta.data;
      addLog(
        `SEFAZ retorno: cStat=${data.cStat} | xMotivo=${data.xMotivo} | ultNSU=${data.ultNSU} | maxNSU=${data.maxNSU}`
      );

      const cStat = String(data.cStat);

      // 656 — consumo indevido: janela de 1 hora por CNPJ
      if (cStat === "656") {
        throw new Error("Consumo indevido - aguarde 1 hora para nova consulta");
      }

      // 589 — NSU armazenado acima da base do AN (base trocada/resetada).
      // Reseta a posição e encerra: a próxima execução parte do zero.
      if (cStat === "589") {
        addLog(`cStat 589 detectado: resetando ultNSU para ${ULT_NSU_INICIAL}...`);
        await prisma.empresa.update({
          where: { id: empresaId },
          data: {
            ultNSU: ULT_NSU_INICIAL,
            maxNSU: String(data.maxNSU || ULT_NSU_INICIAL),
            ultimoSync: new Date()
          }
        });
        throw new Error(
          "NSU superior à base do AN (cStat 589). ultNSU resetado — execute a importação novamente."
        );
      }

      if (!["137", "138"].includes(cStat)) {
        throw new Error(`Erro SEFAZ: ${data.cStat} - ${data.xMotivo}`);
      }

      ultNSU = String(data.ultNSU || ultNSU);
      maxNSU = String(data.maxNSU || maxNSU);

      // Persiste a posição ANTES de processar os documentos:
      // se algo falhar adiante, o NSU não é perdido e a base
      // continua alinhada com a SEFAZ.
      await prisma.empresa.update({
        where: { id: empresaId },
        data: { ultNSU, maxNSU, ultimoSync: new Date() }
      });

      const docs: any[] = Array.isArray(data.docZip)
        ? data.docZip
        : data.docZip
          ? [data.docZip]
          : [];

      if (docs.length === 0 && cStat === "137") {
        addLog("Nenhum documento localizado para o NSU informado.");
      }

      for (const doc of docs) {
        // A lib entrega o XML decodificado em doc.xml; fallback para base64
        const xml: string =
          doc.xml ||
          (doc.value ? Buffer.from(doc.value, "base64").toString("utf-8") : "");
        const schema = String(doc.schema || "");

        if (!xml) {
          addLog("XML vazio, ignorado");
          continue;
        }

        try {
          // =========================
          // XML COMPLETO
          // =========================
          if (xml.includes("<nfeProc") || xml.includes("<NFe")) {
            const parsed = await parseNFeXML(xml);
            if (!parsed.chaveAcesso || !parsed.numero) {
              addLog("XML ignorado - dados obrigatórios ausentes");
              continue;
            }
            if (parsed.fornecedorCNPJ === empresa.cnpj) {
              addLog(`Ignorado XML próprio: ${parsed.chaveAcesso}`);
              continue;
            }

            addLog(`Processando XML completo: ${parsed.chaveAcesso}`);

            const nota = await prisma.nFe.upsert({
              where: { chaveAcesso: parsed.chaveAcesso },
              update: {
                numero: parsed.numero,
                serie: parsed.serie || null,
                modelo: parsed.modelo || null,
                fornecedorCNPJ: parsed.fornecedorCNPJ || null,
                fornecedorNome: parsed.fornecedorNome || null,
                dataEmissao: parsed.dataEmissao,
                valorProdutos: parsed.valorProdutos ?? undefined,
                valorNota: parsed.valorNota ?? undefined,
                valorFrete: parsed.valorFrete ?? undefined,
                valorDesconto: parsed.valorDesconto ?? undefined,
                valorICMS: parsed.valorICMS ?? undefined,
                valorIPI: parsed.valorIPI ?? undefined,
                valorPIS: parsed.valorPIS ?? undefined,
                valorCOFINS: parsed.valorCOFINS ?? undefined,
                situacao: "XML_COMPLETO",
                xmlBaixado: true
              },
              create: {
                empresaId,
                chaveAcesso: parsed.chaveAcesso,
                numero: parsed.numero,
                serie: parsed.serie || null,
                modelo: parsed.modelo || null,
                fornecedorCNPJ: parsed.fornecedorCNPJ || null,
                fornecedorNome: parsed.fornecedorNome || null,
                dataEmissao: parsed.dataEmissao,
                valorProdutos: parsed.valorProdutos ?? undefined,
                valorNota: parsed.valorNota ?? 0,
                valorFrete: parsed.valorFrete ?? undefined,
                valorDesconto: parsed.valorDesconto ?? undefined,
                valorICMS: parsed.valorICMS ?? undefined,
                valorIPI: parsed.valorIPI ?? undefined,
                valorPIS: parsed.valorPIS ?? undefined,
                valorCOFINS: parsed.valorCOFINS ?? undefined,
                situacao: "XML_COMPLETO",
                xmlBaixado: true,
                itens: {
                  create: parsed.itens
                }
              }
            });

            // Itens em update: recarrega do zero para refletir exatamente o XML
            for (const item of parsed.itens) {
              await prisma.nFeItem.upsert({
                where: {
                  nfeId_itemNumero: {
                    nfeId: nota.id,
                    itemNumero: item.itemNumero
                  }
                },
                update: item,
                create: {
                  nfeId: nota.id,
                  ...item
                }
              });
            }

            await prisma.nFeXMLStorage.upsert({
              where: { nfeId: nota.id },
              update: { xmlOriginal: parsed.xmlOriginal },
              create: {
                nfeId: nota.id,
                xmlOriginal: parsed.xmlOriginal
              }
            });

            totalDocumentos++;
            continue;
          }

          // =========================
          // RESUMO
          // =========================
          if (xml.includes("<resNFe")) {
            const resumo = await parseResumoNFe(xml);
            if (!resumo.chaveAcesso) {
              addLog("Resumo ignorado - sem chave");
              continue;
            }
            if (resumo.fornecedorCNPJ === empresa.cnpj) {
              addLog(`Ignorado (emitido pela própria empresa): ${resumo.chaveAcesso}`);
              continue;
            }

            addLog(`Resumo salvo: ${resumo.chaveAcesso}`);

            await prisma.nFe.upsert({
              where: { chaveAcesso: resumo.chaveAcesso },
              update: {
                valorNota: resumo.valorNota || undefined,
                situacao: "RESUMO"
                // não toca em xmlBaixado: se já existe XML completo, mantém
              },
              create: {
                empresaId,
                chaveAcesso: resumo.chaveAcesso,
                numero: resumo.numero,
                serie: resumo.serie || null,
                fornecedorCNPJ: resumo.fornecedorCNPJ || null,
                fornecedorNome: resumo.fornecedorNome || null,
                dataEmissao: resumo.dataEmissao,
                valorNota: resumo.valorNota,
                situacao: "RESUMO",
                xmlBaixado: false
              }
            });

            chavesParaManifestar.push(resumo.chaveAcesso);
            totalDocumentos++;
            continue;
          }

          addLog(`Ignorado - não é NFe válida (schema: ${schema})`);
        } catch (docErr: any) {
          // Falha em UM documento não aborta o ciclo — loga e segue
          const msg = `${schema || "sem-schema"}: ${docErr?.message ?? docErr}`;
          falhas.push(msg);
          addLog(`Falha ao processar documento: ${msg}`);
        }
      }

      // Segurança anti-loop: se o NSU não avançou, encerra
      if (ultNSU === nsuAntes) {
        addLog("NSU não avançou neste ciclo — encerrando para evitar loop.");
        break;
      }

      // comparação lexicográfica segura: NSU sempre tem 15 dígitos fixos
      continuar = ultNSU < maxNSU;
    }

    // Manifestação em lote único, best-effort — NUNCA derruba a importação
    let resultadoManifestacao: ResultadoManifestacao | null = null;
    if (chavesParaManifestar.length > 0) {
      addLog(`Enviando ciência de ${chavesParaManifestar.length} nota(s) em lote...`);
      try {
        resultadoManifestacao = await manifestarCienciaLote({
          pfx,
          senha: empresa.certificadoSenha!,
          cnpj: empresa.cnpj,
          chaves: chavesParaManifestar
        });
        if (resultadoManifestacao.erros.length > 0) {
          addLog(`Manifestação com erros (não bloqueia): ${resultadoManifestacao.erros.join(" | ")}`);
        }
      } catch (mfErr: any) {
        addLog(`Falha na manifestação (não bloqueia importação): ${mfErr?.message ?? mfErr}`);
      }
    }

    const mensagem = `${totalDocumentos} documento(s) processado(s) | ultNSU=${ultNSU} | maxNSU=${maxNSU}`;
    if (falhas.length > 0) {
      addLog(`Documentos com falha (${falhas.length}): ${falhas.join(" | ")}`);
    }
    addLog(mensagem);

    await prisma.importacaoLog.update({
      where: { id: logExec.id },
      data: {
        status: falhas.length > 0 ? "CONCLUIDO_COM_FALHAS" : "SUCESSO",
        mensagem,
        nsuFinal: ultNSU,
        documentos: totalDocumentos,
        logDetalhado: logs.join("\n"),
        finishedAt: new Date()
      }
    });

    return {
      message: "Importação concluída",
      documentos: totalDocumentos,
      manifestacao: resultadoManifestacao,
      falhas
    };
  } catch (error: any) {
    await prisma.importacaoLog.update({
      where: { id: logExec.id },
      data: {
        status: "ERRO",
        mensagem: error.message,
        logDetalhado: logs.join("\n"),
        finishedAt: new Date()
      }
    });
    throw error;
  }
}