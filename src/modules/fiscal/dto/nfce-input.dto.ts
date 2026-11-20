// src/modules/fiscal/dto/nfce-input.dto.ts
import { Type, Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

export const EnderecoSchema = Type.Object({
  logradouro: Type.String(),
  numero: Type.String(),
  bairro: Type.String(),
  cidade: Type.String(),
  uf: Type.String({ minLength: 2, maxLength: 2 }),
  cep: Type.String({ pattern: '^\\d{8}$' })
}, { additionalProperties: false });

export const ClienteSchema = Type.Object({
  cpfCnpj: Type.String({ pattern: '^\\d{11}$|^\\d{14}$' }),
  nome: Type.String({ minLength: 1 }),
  endereco: EnderecoSchema
}, { additionalProperties: false });

export const ItemSchema = Type.Object({
  // OBRIGATÓRIOS
  codigo: Type.String(),
  descricao: Type.String(),
  ncm: Type.String({ pattern: '^\\d{8}$' }),
  cfop: Type.String({ pattern: '^\\d{4}$' }),
  unidade: Type.String(),
  quantidade: Type.Number({ exclusiveMinimum: 0 }),
  valorUnitario: Type.Number({ exclusiveMinimum: 0 }),
  valorTotal: Type.Number({ exclusiveMinimum: 0 }),
  // OPCIONAIS — tributação por produto (se não enviado, usa defaults da empresa)
  cest: Type.Optional(Type.String({ pattern: '^\\d{7}$' })),
  csosn: Type.Optional(Type.String({ pattern: '^\\d{3}$' })),
  orig: Type.Optional(Type.String({ pattern: '^[0-2]$' })),
  cstPIS: Type.Optional(Type.String({ pattern: '^\\d{2}$' })),
  cstCOFINS: Type.Optional(Type.String({ pattern: '^\\d{2}$' })),
  aliquotaICMS: Type.Optional(Type.Number({ minimum: 0, maximum: 100 })),
  valorDesconto: Type.Optional(Type.Number({ minimum: 0 }))
}, { additionalProperties: false });

export const PagamentoSchema = Type.Object({
  formaPagamento: Type.String({ pattern: '^(0[1-9]|[1-9][0-9])$' }),
  valor: Type.Number({ exclusiveMinimum: 0 })
}, { additionalProperties: false });

export const NFCeInputSchema = Type.Object({
  empresaId: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
  cliente: ClienteSchema,
  itens: Type.Array(ItemSchema, { minItems: 1 }),
  pagamentos: Type.Array(PagamentoSchema, { minItems: 1 })
}, { additionalProperties: false });

export type NFCeInputDTO = Static<typeof NFCeInputSchema>;

export function validateNFeInput(data: unknown): { success: false; errors: string[] } | null {
  const checkResult = Value.Check(NFCeInputSchema, data);
  if (!checkResult) {
    const errors = [...Value.Errors(NFCeInputSchema, data)].map(e => e.message);
    return { success: false, errors };
  }
  const input = data as NFCeInputDTO;
  const errors: string[] = [];

  // Validate item valorTotal = quantidade * valorUnitario (- desconto se houver)
  input.itens.forEach((item, index) => {
    const expectedTotal = item.quantidade * item.valorUnitario;
    const desconto = item.valorDesconto || 0;
    if (Math.abs(item.valorTotal - (expectedTotal - desconto)) > 0.001) {
      errors.push(`Item[${index}]: valorTotal (${item.valorTotal}) difere de (quantidade * valorUnitario - desconto) (${expectedTotal - desconto})`);
    }
  });

  // Validate sum of pagamentos >= sum of itens
  const sumItens = input.itens.reduce((sum, item) => sum + item.valorTotal, 0);
  const sumPagamentos = input.pagamentos.reduce((sum, pag) => sum + pag.valor, 0);
  if (sumPagamentos + 0.001 < sumItens) {
    errors.push(`Soma dos pagamentos (${sumPagamentos}) é menor que a soma dos itens (${sumItens})`);
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }
  return null;
}