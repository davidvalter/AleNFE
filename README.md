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

O serviço usa a porta definida em PORT (por padrão, 3001), inicia o worker BullMQ junto com o processo HTTP e, por padrão, escuta apenas em 127.0.0.1. A interface do host pode ser configurada por HOST. O repositório também documenta deploy com PM2; consulte README-DEPLOY.md.

## Deploy atrás do Nginx (aaPanel)

Há dois modelos de virtual host de referência em `deploy/nginx/`:

- `alenfe.conf`: serve a interface PHP de `src/public` e encaminha `/api/` e `/sefaz/` para o Fastify. O painel usa o domínio principal como mesma origem para suas chamadas de API.
- `backend.alenfe.conf`: encaminha todas as rotas do domínio de backend para o Fastify, incluindo os endpoints de integração externa. As rotas de integração Alesys usam `x-api-key`; outros endpoints externos também devem ser avaliados pelo middleware definido em cada rota.

### Instalação

1. Configure o processo Node/PM2 com `PORT=3001` e `HOST=127.0.0.1`. O servidor agora usa loopback por padrão. Mantenha a porta 3001 bloqueada para conexões externas no firewall; o Nginx local é quem deve acessá-la.
2. Copie os blocos `server` do arquivo correspondente para a configuração de cada site no aaPanel. Ajuste o diretório `root`, os caminhos dos certificados e o socket PHP-FPM (o exemplo usa `/tmp/php-cgi-83.sock`). Preserve os includes de validação ACME/Let's Encrypt que o aaPanel gerar e não inclua o arquivo completo dentro de um diretório de extensões que espere apenas diretivas de `location`.
3. Confirme que os certificados cobrem os respectivos nomes DNS e que ambos apontam para o servidor. O tráfego HTTP é redirecionado para HTTPS; as configurações usam TLS 1.2 ou 1.3 e não armazenam respostas do proxy em cache.
4. Valide a configuração com `nginx -t` e recarregue o Nginx pelo aaPanel após a validação.
5. Confirme que a interface PHP acessa o Fastify em `127.0.0.1:3001`, e que os sistemas externos usam o domínio de backend e enviam suas credenciais conforme o contrato da rota.

Os arquivos são modelos para este servidor aaPanel, não configurações universais: revise caminhos, portas, certificados, limites de upload e includes antes de ativá-los. O domínio principal encaminha somente `/api/` e `/sefaz/`; o domínio `backend` encaminha toda a árvore Fastify. Portanto, o domínio de backend é um ponto de entrada público para todas as rotas do Node, não um controle de acesso por si só. A porta 3001 precisa permanecer inacessível pela rede externa.

### Limite de segurança atual a revisar

O Nginx termina TLS e encaminha requisições; ele não autentica usuários nem substitui a autorização das rotas. A implementação atual inclui endpoints sem autenticação explícita, entre eles a leitura de NFC-e por ID (`/nfce/:id` e `/nfce/:id/consulta`), as rotas de consulta/logs em `/api/nfce`, o cancelamento web `/api/nfce/:id/cancelar-web`, monitoramento de fila e configuração de webhooks. Isso permite acesso pela rede a dados ou ações conforme a rota, mesmo com a porta 3001 fechada, pois os domínios encaminham as chamadas ao Node.

Também há registros em `src/app.ts` que passam `preHandler` como opção de `register`; no Fastify, essa opção é entregue ao plugin, mas não instala um hook automaticamente. A proteção deve ser aplicada como hook no escopo do plugin ou como `preHandler` de cada rota. Antes de expor esses virtual hosts, revise e corrija a autenticação/autorização das rotas sensíveis, preservando as rotas de integração externa necessárias e protegidas por chave de API. Consulte a [documentação de plugins do Fastify](https://fastify.dev/docs/latest/Reference/Plugins/) e a [documentação de hooks](https://fastify.dev/docs/latest/Reference/Hooks/).

## Observações

- O arquivo .env.example contém valores ilustrativos e deve ser ajustado ao ambiente. As credenciais e os segredos precisam ser tratados como dados sensíveis.
- A emissão fiscal depende do cadastro correto da empresa, das configurações tributárias, do certificado digital e da disponibilidade dos serviços da SEFAZ.
- O exemplo de ambiente indica SEFAZ_AMBIENTE=1; confirme cuidadosamente o ambiente de homologação ou produção antes de realizar transmissões.
- A API usa rotas com mecanismos de autenticação e chaves de API em diferentes módulos. Consulte as rotas e middlewares do projeto antes de expor o serviço publicamente.
- Este README resume o código e a documentação encontrados no repositório; endpoints, configurações e funcionalidades devem ser confirmados na implementação atual antes de uso operacional.


