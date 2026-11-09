// src/modules/fiscal/core/sefaz/sefaz-url.ts

type Ambiente = "producao" | "homologacao";

export type SefazServico =
    | "autorizacao"
    | "retAutorizacao"
    | "inutilizacao"
    | "consultaProtocolo"
    | "statusServico"
    | "consultaCadastro"
    | "recepcaoEvento";

type SefazProvider = "SVRS" | "SVAN" | "SP" | "PR" | "RS" | "MT";

// =========================
// MAPA: cUF → Provider (NFC-e)
// =========================
const UF_PROVIDER_NFCE: Record<string, SefazProvider> = {
    // SVRS — SEFAZ Virtual Rio Grande do Sul
    "12": "SVRS", // AC
    "27": "SVRS", // AL
    "16": "SVRS", // AP
    "29": "SVRS", // BA
    "23": "SVRS", // CE
    "53": "SVRS", // DF
    "32": "SVRS", // ES
    "52": "SVRS", // GO
    "21": "SVRS", // MA
    "50": "SVRS", // MS
    "15": "SVRS", // PA
    "25": "SVRS", // PB
    "22": "SVRS", // PI
    "33": "SVRS", // RJ
    "24": "SVRS", // RN
    "11": "SVRS", // RO
    "14": "SVRS", // RR
    "42": "SVRS", // SC
    "28": "SVRS", // SE
    "17": "SVRS", // TO
    // Outros providers
    "35": "SP",    // SP — própria
    "41": "PR",    // PR — própria
    "43": "RS",    // RS — própria
    "31": "SVAN",  // MG — SVAN
    "13": "SVAN",  // AM — SVAN
    "51": "MT",    // MT — própria
};

// =========================
// URLs POR PROVIDER
// =========================
const PROVIDER_URLS: Partial<
    Record<SefazProvider, Record<Ambiente, Partial<Record<SefazServico, string>>>>
> = {
    // =========================
    // SVRS — SEFAZ Virtual RS
    // =========================
    SVRS: {
        producao: {
            autorizacao: "https://nfce.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
            retAutorizacao: "https://nfce.svrs.rs.gov.br/ws/NfeRetAutorizacao/NfeRetAutorizacao4.asmx",
            inutilizacao: "https://nfce.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx",
            consultaProtocolo: "https://nfce.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx",
            statusServico: "https://nfce.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
            consultaCadastro: "https://cad.svrs.rs.gov.br/ws/cadconsultacadastro/cadconsultacadastro4.asmx",
            recepcaoEvento: "https://nfce.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
        },
        homologacao: {
            autorizacao: "https://nfce-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
            retAutorizacao: "https://nfce-homologacao.svrs.rs.gov.br/ws/NfeRetAutorizacao/NfeRetAutorizacao4.asmx",
            inutilizacao: "https://nfce-homologacao.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx",
            consultaProtocolo: "https://nfce-homologacao.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx",
            statusServico: "https://nfce-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
            consultaCadastro: "https://cad.svrs.rs.gov.br/ws/cadconsultacadastro/cadconsultacadastro4.asmx",
            recepcaoEvento: "https://nfce-homologacao.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
        },
    },

    // =========================
    // SVAN — SEFAZ Virtual AN (NF-e, não NFC-e)
    // =========================
    // SVAN não hospeda NFC-e — estados SVAN usam SVRS para NFC-e
    // Por isso não há entrada SVAN aqui

    // =========================
    // SP — própria (SEFAZ SP)
    // =========================
    SP: {
        producao: {
            autorizacao: "https://nfce.fazenda.sp.gov.br/ws/NFeAutorizacao4.asmx",
            retAutorizacao: "https://nfce.fazenda.sp.gov.br/ws/NFeRetAutorizacao4.asmx",
            inutilizacao: "https://nfce.fazenda.sp.gov.br/ws/NfeInutilizacao4.asmx",
            consultaProtocolo: "https://nfce.fazenda.sp.gov.br/ws/NFeConsultaProtocolo4.asmx",
            statusServico: "https://nfce.fazenda.sp.gov.br/ws/NFeStatusServico4.asmx",
            recepcaoEvento: "https://nfce.fazenda.sp.gov.br/ws/NFeRecepcaoEvento4.asmx",
        },
        homologacao: {
            autorizacao: "https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeAutorizacao4.asmx",
            retAutorizacao: "https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeRetAutorizacao4.asmx",
            inutilizacao: "https://homologacao.nfce.fazenda.sp.gov.br/ws/NfeInutilizacao4.asmx",
            consultaProtocolo: "https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeConsultaProtocolo4.asmx",
            statusServico: "https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeStatusServico4.asmx",
            recepcaoEvento: "https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeRecepcaoEvento4.asmx",
        },
    },

    // =========================
    // PR — própria (SEFAZ PR)
    // =========================
    PR: {
        producao: {
            autorizacao: "https://nfce.sefa.pr.gov.br/nfce/NFeAutorizacao4",
            retAutorizacao: "https://nfce.sefa.pr.gov.br/nfce/NFeRetAutorizacao4",
            inutilizacao: "https://nfce.sefa.pr.gov.br/nfce/NFeInutilizacao4",
            consultaProtocolo: "https://nfce.sefa.pr.gov.br/nfce/NFeConsulta4",
            statusServico: "https://nfce.sefa.pr.gov.br/nfce/NFeStatusServico4",
            recepcaoEvento: "https://nfce.sefa.pr.gov.br/nfce/NFeRecepcaoEvento4",
        },
        homologacao: {
            autorizacao: "https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeAutorizacao4",
            retAutorizacao: "https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeRetAutorizacao4",
            inutilizacao: "https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeInutilizacao4",
            consultaProtocolo: "https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeConsulta4",
            statusServico: "https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeStatusServico4",
            recepcaoEvento: "https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeRecepcaoEvento4",
        },
    },

    // =========================
    // RS — própria (SEFAZ RS)
    // =========================
    RS: {
        producao: {
            autorizacao: "https://nfce.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
            retAutorizacao: "https://nfce.sefazrs.rs.gov.br/ws/NfeRetAutorizacao/NfeRetAutorizacao4.asmx",
            inutilizacao: "https://nfce.sefazrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx",
            consultaProtocolo: "https://nfce.sefazrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx",
            statusServico: "https://nfce.sefazrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
            consultaCadastro: "https://cad.sefazrs.rs.gov.br/ws/cadconsultacadastro/cadconsultacadastro4.asmx",
            recepcaoEvento: "https://nfce.sefazrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
        },
        homologacao: {
            autorizacao: "https://nfce-homologacao.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
            retAutorizacao: "https://nfce-homologacao.sefazrs.rs.gov.br/ws/NfeRetAutorizacao/NfeRetAutorizacao4.asmx",
            inutilizacao: "https://nfce-homologacao.sefazrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx",
            consultaProtocolo: "https://nfce-homologacao.sefazrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx",
            statusServico: "https://nfce-homologacao.sefazrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
            recepcaoEvento: "https://nfce-homologacao.sefazrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
        },
    },

    // =========================
    // MT — própria (SEFAZ MT)
    // =========================
    MT: {
        producao: {
            autorizacao: "https://nfce.sefaz.mt.gov.br/nfcews/v2/NFeAutorizacao4",
            retAutorizacao: "https://nfce.sefaz.mt.gov.br/nfcews/v2/NFeRetAutorizacao4",
            inutilizacao: "https://nfce.sefaz.mt.gov.br/nfcews/v2/NFeInutilizacao4",
            consultaProtocolo: "https://nfce.sefaz.mt.gov.br/nfcews/v2/NFeConsulta4",
            statusServico: "https://nfce.sefaz.mt.gov.br/nfcews/v2/NFeStatusServico4",
            recepcaoEvento: "https://nfce.sefaz.mt.gov.br/nfcews/v2/NFeRecepcaoEvento4",
        },
        homologacao: {
            autorizacao: "https://homologacao.sefaz.mt.gov.br/nfcews/v2/NFeAutorizacao4",
            retAutorizacao: "https://homologacao.sefaz.mt.gov.br/nfcews/v2/NFeRetAutorizacao4",
            inutilizacao: "https://homologacao.sefaz.mt.gov.br/nfcews/v2/NFeInutilizacao4",
            consultaProtocolo: "https://homologacao.sefaz.mt.gov.br/nfcews/v2/NFeConsulta4",
            statusServico: "https://homologacao.sefaz.mt.gov.br/nfcews/v2/NFeStatusServico4",
            recepcaoEvento: "https://homologacao.sefaz.mt.gov.br/nfcews/v2/NFeRecepcaoEvento4",
        },
    },
};

// =========================
// FUNÇÃO PRINCIPAL
// =========================
export function getSefazUrl(
    ambiente: Ambiente,
    uf: string,
    servico: SefazServico = "autorizacao"
): string {
    const provider = UF_PROVIDER_NFCE[uf];
    if (!provider) {
        throw new Error(`UF ${uf} não mapeada para nenhum webservice NFC-e`);
    }

    const providerUrls = PROVIDER_URLS[provider];
    if (!providerUrls) {
        throw new Error(`Provider ${provider} não configurado`);
    }

    const ambienteUrls = providerUrls[ambiente];
    if (!ambienteUrls) {
        throw new Error(`Ambiente ${ambiente} não configurado para provider ${provider}`);
    }

    const url = ambienteUrls[servico];
    if (!url) {
        throw new Error(
            `Serviço "${servico}" não disponível para ${provider} (${ambiente})`
        );
    }

    return url;
}

// =========================
// HELPER: lista serviços disponíveis
// =========================
export function getServicosDisponiveis(
    uf: string,
    ambiente: Ambiente
): SefazServico[] {
    const provider = UF_PROVIDER_NFCE[uf];
    if (!provider) return [];

    const urls = PROVIDER_URLS[provider]?.[ambiente];
    if (!urls) return [];

    return Object.keys(urls).filter(
        (k) => urls[k as SefazServico]
    ) as SefazServico[];
}