// src/modules/fiscal/core/utils/nfe-chave.ts

export function gerarCodigoNumerico(): string {
    return String(Math.floor(Math.random() * 99999999)).padStart(8, "0");
}

function calcularDV(chaveSemDV: string): number {
    let peso = 2;
    let soma = 0;

    for (let i = chaveSemDV.length - 1; i >= 0; i--) {
        soma += Number(chaveSemDV[i]) * peso;
        peso = peso === 9 ? 2 : peso + 1;
    }

    const resto = soma % 11;

    return resto < 2 ? 0 : 11 - resto;
}

export function gerarChaveAcesso({
    cUF,
    dataEmissao,
    cnpj,
    modelo,
    serie,
    numero,
    tpEmis,
    codigoNumerico
}: {
    cUF: string;
    dataEmissao: Date;
    cnpj: string;
    modelo: string;
    serie: number;
    numero: number;
    tpEmis: string;
    codigoNumerico: string;
}) {
    const ano = String(dataEmissao.getFullYear()).slice(-2);
    const mes = String(dataEmissao.getMonth() + 1).padStart(2, "0");

    const chaveSemDV =
        cUF +
        ano +
        mes +
        cnpj.padStart(14, "0") +
        modelo +
        String(serie).padStart(3, "0") +
        String(numero).padStart(9, "0") +
        tpEmis +
        codigoNumerico;

    const dv = calcularDV(chaveSemDV);

    return {
        chave: chaveSemDV + dv,
        dv,
        idNFe: "NFe" + chaveSemDV + dv
    };
}