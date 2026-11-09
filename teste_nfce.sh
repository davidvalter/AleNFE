#!/bin/bash

# Script para teste de emissao de NFC-e
# Substitua localhost:3000 pela URL correta da sua API

curl -X POST https://backend.alenfe.alecriminteligente.com.br/nfce/criar \
  -H "Content-Type: application/json" \
  -H "x-api-key: ak_d074c14dceebf3adf9ff66b63c4966b3" \
  -d '{
    "cliente": {
      "cpfCnpj": "04719829112",
      "nome": "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL",
      "endereco": {
        "logradouro": "Nao Informado",
        "numero": "SN",
        "bairro": "Centro",
        "cidade": "Brasilia",
        "uf": "DF",
        "cep": "00000000"
      }
    },
    "itens": [
      {
        "codigo": "001",
        "descricao": "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL",
        "ncm": "22021000",
        "cfop": "5102",
        "unidade": "UN",
        "quantidade": 1,
        "valorUnitario": 8.50,
        "valorTotal": 8.50,
        "cest": "0305100",
        "csosn": "102",
        "orig": "0",
        "cstPIS": "07",
        "cstCOFINS": "07"
      }
    ],
    "pagamentos": [
      { "formaPagamento": "01", "valor": 8.50 }
    ]
  }'
