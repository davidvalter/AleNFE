import { RecepcaoEvento } from "@vexta-systems/node-mde";

/**
 * Ambiente FIXO em produção.
 * Notas de compra não existem em homologação — não deve vir do .env.
 */
export const TP_AMB_SEFAZ = "1" as const;

const EVENTO_CIENCIA = 210210;
const TAMANHO_LOTE_EVENTOS = 20; // máximo aceito pela SEFAZ por lote de eventos

export interface ResultadoManifestacao {
  enviadas: number;
  lotesEnviados: number;
  falhas: { chave: string; motivo: string }[];
  erros: string[];
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Envia ciência da operação (210210) em LOTES de até 20 eventos —
 * nunca 1 requisição por nota. Best-effort: erro em um lote é
 * registrado e o processo segue (nota com +90 dias rejeita ciência,
 * é esperado e não bloqueia nada).
 */
export async function manifestarCienciaLote({
  pfx,
  senha,
  cnpj,
  chaves
}: {
  pfx: Buffer;
  senha: string;
  cnpj: string;
  chaves: string[];
}): Promise<ResultadoManifestacao> {
  const resultado: ResultadoManifestacao = {
    enviadas: 0,
    lotesEnviados: 0,
    falhas: [],
    erros: []
  };

  if (!chaves || chaves.length === 0) return resultado;

  if (!pfx || !senha) {
    resultado.erros.push("Certificado digital ou senha ausentes no cadastro da empresa.");
    return resultado;
  }

  const recepcao = new RecepcaoEvento({
    pfx,
    passphrase: senha,
    cnpj,
    tpAmb: TP_AMB_SEFAZ as "1" | "2"
  });

  for (const lote of chunk(chaves, TAMANHO_LOTE_EVENTOS)) {
    try {
      const resposta: any = await recepcao.enviarEvento({
        idLote: Date.now().toString().slice(-15),
        lote: lote.map((chNFe) => ({ chNFe, tipoEvento: EVENTO_CIENCIA }))
      });

      resultado.lotesEnviados++;
      resultado.enviadas += lote.length;

      // Interpretação tolerante ao formato de retorno da lib
      const retorno = resposta?.data ?? resposta ?? {};
      const cStat = String(retorno.cStat ?? "");
      const xMotivo = String(retorno.xMotivo ?? "");

      // 128 = lote processado com falhas parciais | 129/135/136 = processado
      if (cStat && !["128", "129", "135", "136"].includes(cStat)) {
        resultado.erros.push(`Lote rejeitado (cStat ${cStat}): ${xMotivo}`);
        for (const chave of lote) {
          resultado.falhas.push({ chave, motivo: `cStat ${cStat}: ${xMotivo}` });
        }
      }
    } catch (err: any) {
      const motivo = err?.message ?? String(err);
      resultado.erros.push(`Falha no envio do lote: ${motivo}`);
      for (const chave of lote) {
        resultado.falhas.push({ chave, motivo });
      }
    }
  }

  return resultado;
}

/**
 * Compatibilidade: manifestação de uma única chave.
 */
export async function manifestarCiencia({
  pfx,
  senha,
  cnpj,
  chave
}: {
  pfx: Buffer;
  senha: string;
  cnpj: string;
  chave: string;
}) {
  return manifestarCienciaLote({ pfx, senha, cnpj, chaves: [chave] });
}