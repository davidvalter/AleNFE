# AleNFE

Serviço de integração fiscal entre sistemas ERP e a SEFAZ, com foco atual na emissão e no acompanhamento de NFC-e (modelo 65).

## Visão geral

O AleNFE expõe uma API REST e uma interface web para operações fiscais. No fluxo de emissão, a API registra a nota e a coloca em uma fila; um worker processa a solicitação, monta e assina o XML, valida o documento e o transmite à SEFAZ. Os dados, XMLs e estados de processamento são persistidos para consulta e acompanhamento.

O projeto é descrito em sua documentação técnica como um gateway fiscal para integração com o ERP ALESYS, com arquitetura que pode atender outros sistemas consumidores da API.

## Propósito

Centralizar a comunicação fiscal com a SEFAZ, reduzindo a necessidade de cada ERP implementar por conta própria a geração, assinatura, validação, transmissão e acompanhamento de documentos fiscais eletrônicos. O processamento em fila também desacopla as solicitações da API das respostas da SEFAZ, que podem ser demoradas ou assíncronas.

## Funcionalidades

- Cadastro e gerenciamento de empresas, configurações fiscais, certificados digitais PFX e chaves de API.
- Recebimento e processamento assíncrono de solicitações de NFC-e.
- Geração de XML fiscal, assinatura digital e validação por esquemas XSD.
- Comunicação SOAP/HTTPS com serviços da SEFAZ, incluindo consulta de recibo e tratamento de autorização, rejeição e erros.
- Operação de NFC-e em contingência e sincronização posterior.
- Consulta de notas, detalhes, logs de processamento e estado das filas.
- Configuração e envio de webhooks para notificar sistemas integrados sobre eventos.
- Interface web estática servida pelo próprio Fastify para operações e acompanhamento.

A documentação técnica cita NF-e modelo 55, cancelamento, inutilização, carta de correção e MDF-e como possibilidades de evolução. Ela não os apresenta como funcionalidades já implementadas neste projeto.

## Integração com o Alesys

O serviço oferece endpoints de leitura para importação manual de notas de compra pelo Alesys ERP. As rotas são independentes da autenticação JWT usada pelas rotas de interface e usam API Key no header `x-api-key`. A empresa autorizada é determinada pela própria chave ativa; não envie nem aceite `empresaId` como parâmetro para selecionar outra empresa.

- `GET /api/integracoes/alesys/notas-compras?page=1&limit=100`: lista notas e itens da empresa vinculada à chave. `limit` é limitado a 100 por página.
- `GET /api/integracoes/alesys/notas-compras/{id}/xml`: devolve o XML processado (ou original, se não houver processado) quando a nota estiver em `XML_COMPLETO`. O ID também é validado dentro do escopo da empresa da API Key; notas de outra empresa não são expostas.

Exemplo de consulta:

```bash
curl -H "x-api-key: SUA_API_KEY" \
  "https://SEU_ALE-NFE/api/integracoes/alesys/notas-compras?page=1&limit=100"
```

Essas rotas leem notas do modelo `NFe` e seus itens; não alteram notas, XML ou estoque. Se o XML ainda não estiver completo, a rota de download responde HTTP 404 para que o Alesys mantenha a nota pendente de revisão.

## Tecnologias

- **Runtime e linguagem:** Node.js (18 ou superior) e TypeScript.
- **Servidor HTTP/API:** Fastify 5.
- **Persistência:** MySQL, acessado por Prisma ORM.
- **Fila e processamento em segundo plano:** Redis e BullMQ.
- **Integração fiscal:** XML, XMLDSig, SOAP 1.2 e HTTPS/mTLS com certificado digital.
- **Validação e suporte a XML:** esquemas XSD, xmlbuilder2, xml-crypto, @xmldom/xmldom, fast-xml-parser e bibliotecas relacionadas.
- **Outras bibliotecas:** Pino para logs, JWT e bcrypt para recursos de autenticação, Axios e node-cron.

## Estrutura do projeto

A estrutura abaixo foi inferida dos arquivos e caminhos presentes no repositório:

    .
    ├── prisma/
    │   └── schema.prisma             # modelos e configuração do banco
    ├── schemas/                      # esquemas XSD usados na validação
    └── src/
        ├── app.ts                    # configuração do Fastify e registro de rotas
        ├── server.ts                 # inicialização do serviço e da fila
        ├── config/                   # acesso a banco e configurações
        ├── controllers/              # controladores HTTP
        ├── middlewares/              # autenticação e outros middlewares
        ├── routes/                   # rotas de empresas, SEFAZ, notas e usuários
        ├── services/                 # serviços de integração e processamento
        ├── modules/fiscal/
        │   ├── core/                 # componentes comuns de integração fiscal
        │   └── nfce/                 # rotas, filas, worker e serviços de NFC-e
        └── public/                   # arquivos da interface web

Os arquivos de build são gerados em dist/. A organização acima é representativa; consulte o repositório para a lista completa de arquivos e módulos.

## Requisitos

- Node.js 18 ou superior e npm.
- MySQL acessível e um banco configurado em DATABASE_URL.
- Redis acessível para a fila BullMQ.
- Certificado digital e configurações fiscais válidas para a empresa emissora.
- Acesso de rede aos serviços da SEFAZ correspondentes à UF e ao ambiente configurados.

## Instalação e execução

1. Clone o repositório e entre na pasta do projeto:

       git clone https://github.com/davidvalter/AleNFE.git
       cd AleNFE

2. Instale as dependências e configure as variáveis de ambiente:

       npm install
       cp .env.example .env

   Ajuste no arquivo .env os valores necessários, principalmente DATABASE_URL, REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, PORT e as configurações de ambiente/UF da SEFAZ. Não coloque credenciais ou certificados no controle de versão.

3. Gere o cliente Prisma e aplique as migrações no banco configurado:

       npx prisma generate
       npx prisma migrate deploy

4. Inicie em modo de desenvolvimento:

       npm run dev

Para compilar e iniciar a versão de produção:

    npm run build
    npm start

O serviço usa a porta definida em PORT (por padrão, 3001) e inicia o worker BullMQ junto com o processo HTTP. O repositório também documenta deploy com PM2; consulte README-DEPLOY.md.

## Observações

- O arquivo .env.example contém valores ilustrativos e deve ser ajustado ao ambiente. As credenciais e os segredos precisam ser tratados como dados sensíveis.
- A emissão fiscal depende do cadastro correto da empresa, das configurações tributárias, do certificado digital e da disponibilidade dos serviços da SEFAZ.
- O exemplo de ambiente indica SEFAZ_AMBIENTE=1; confirme cuidadosamente o ambiente de homologação ou produção antes de realizar transmissões.
- A API usa rotas com mecanismos de autenticação e chaves de API em diferentes módulos. Consulte as rotas e middlewares do projeto antes de expor o serviço publicamente.
- Este README resume o código e a documentação encontrados no repositório; endpoints, configurações e funcionalidades devem ser confirmados na implementação atual antes de uso operacional.


