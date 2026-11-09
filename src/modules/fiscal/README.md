
# DOCUMENTAÇÃO TÉCNICA COMPLETA – ALENFE Fiscal

## 1. Visão Geral

O módulo Fiscal ALENFE é o núcleo responsável pela emissão de documentos fiscais eletrônicos.

Atualmente o foco é NFC-e (modelo 65), porém a arquitetura foi preparada para evoluir para:

- NF-e modelo 55
- Cancelamento
- Inutilização
- Carta de Correção (CC-e)
- Manifestação
- MDF-e
- Contingência
- Centralização fiscal multi-ERP

O ALENFE atua como um gateway fiscal entre o ERP ALESYS e a SEFAZ.

---

# 2. Arquitetura

Fluxo completo:

ERP ALESYS
→ API REST
→ Banco de Dados (Prisma)
→ BullMQ
→ Worker
→ Geração XML
→ Assinatura Digital
→ Validação XSD
→ SOAP 1.2
→ SEFAZ
→ Consulta de Recibo
→ Autorização
→ Banco

---

# 3. Tecnologias

## Backend

- Node.js
- TypeScript
- Fastify
- Prisma ORM

## Mensageria

- BullMQ
- Redis

## XML

- xmlbuilder2
- xml-crypto
- xmldom
- fast-xml-parser

## Logs

- Pino

---

# 4. Estrutura de Diretórios

config/
core/
dto/
nfce/
schemas/

A pasta schemas contém apenas artefatos oficiais da SEFAZ e não faz parte da lógica de negócio.

---

# 5. Camada Config

## config/bull-config.ts

Responsável pela infraestrutura Redis/BullMQ.

Funções:

### getRedisConnection()

Cria conexão Redis compartilhada.

### getBullQueueOptions()

Retorna configuração das filas.

### getBullWorkerOptions()

Retorna configuração dos workers.

Observação:

Sem REDIS_PASSWORD o sistema interrompe a inicialização.

---

# 6. Core Fiscal

## core/utils/nfe-chave.ts

Responsável pela geração da chave de acesso.

### gerarCodigoNumerico()

Gera código aleatório de 8 posições.

### calcularDV()

Calcula dígito verificador módulo 11.

### gerarChaveAcesso()

Monta chave completa de 44 posições.

---

## core/assinatura/xml-sign.service.ts

Responsável pela assinatura digital.

Fluxo:

1. Busca nota fiscal
2. Recupera certificado
3. Localiza tag infNFe
4. Gera assinatura XMLDSig
5. Insere Signature

Função principal:

### assinarXMLNFCe()

Saída:

XML assinado armazenado na base.

---

## core/certificado/certificado.service.ts

Cria agente HTTPS para comunicação com a SEFAZ.

Função:

### criarHttpsAgent()

Carrega:

- cert-completo.pem
- key.pem

Retorna:

https.Agent

---

## core/debug/signature-debug.ts

Ferramenta de diagnóstico.

### debugSignature()

Detecta:

- BOM
- espaços extras
- caracteres inválidos

### compareSignatures()

Compara duas assinaturas.

Muito útil durante homologação.

---

## core/parsers/xml-parser.ts

Interpretador das respostas XML da SEFAZ.

Classe:

### XmlParser

Extrai:

- cStat
- xMotivo
- protocolo
- recibo
- chave de acesso

---

## core/sefaz/sefaz-url.ts

Centraliza endpoints da SEFAZ.

Função:

### getSefazUrl()

Parâmetros:

- ambiente
- UF

Retorna endpoint correto.

---

## core/soap/soap-builder.ts

Responsável pela criação do envelope SOAP 1.2.

Função:

### montarSoapEnvelope()

Monta:

- Header
- nfeCabecMsg
- nfeDadosMsg

---

## core/soap/soap-client.ts

Cliente HTTP para transmissão.

Função:

### enviarSoap()

Responsável por:

- POST HTTPS
- envio XML
- recebimento retorno

---

## core/validators/xml-validator.ts

Validador XSD.

Função:

### validarXml()

Fluxo:

1. Cria XML temporário
2. Executa validação
3. Captura erros
4. Remove temporários

---

# 7. DTOs

## dto/nfce-input.dto.ts

Contrato oficial de entrada.

Schemas:

### EnderecoSchema

Valida endereço.

### ClienteSchema

Valida cliente.

### ItemSchema

Valida produtos.

### PagamentoSchema

Valida meios de pagamento.

### NFeInputSchema

Valida payload completo.

### validateNFeInput()

Executa validação final.

---

# 8. Camada de Filas

## nfce/queues/nfce-queue.ts

Responsável pela fila de emissão.

Objetivo:

Desacoplar API da SEFAZ.

Funções:

- inicialização da Queue
- inicialização do Worker
- enqueue de emissão

Benefícios:

- escalabilidade
- reprocessamento
- controle operacional

---

## nfce/jobs/nfce-worker.ts

Orquestrador principal.

Pipeline:

1. Buscar nota
2. Gerar XML
3. Assinar XML
4. Transmitir
5. Atualizar status

É o coração operacional do sistema.

---

# 9. Serviços NFC-e

## nfce/services/nfe-saida.service.ts

Primeira etapa do processo.

Função:

### criarNFCeSaida()

Responsabilidades:

- calcular total
- criar nota
- criar itens
- persistir no banco

Status inicial:

PENDENTE

---

## nfce/services/nfce-xml-builder.service.ts

Maior componente do projeto.

Função:

### gerarXMLNFCe()

Responsável por:

- Identificação da nota
- Emitente
- Destinatário
- Produtos
- Tributos
- Totais
- Transporte
- Pagamento
- Informações adicionais
- QRCode
- Chave de acesso

Também grava XML gerado.

Este arquivo representa o motor fiscal do ALENFE.

---

## nfce/utils/nfce-qrcode.ts

Geração do QRCode fiscal.

Função:

### gerarQRCodeNFCe()

Calcula:

- CSC
- hash SHA1
- URL QRCode

Compatível com SVRS.

---

## nfce/services/nfce-send.service.ts

Principal serviço de integração SEFAZ.

Possui aproximadamente 370 linhas.

Fluxo:

1. Recupera XML
2. Valida XML
3. Seleciona endpoint
4. Cria HTTPS Agent
5. Monta SOAP
6. Envia lote
7. Interpreta retorno
8. Atualiza banco
9. Consulta recibo quando necessário

Responsabilidades:

- autorização
- rejeição
- tratamento de erros
- atualização de status

Este é o principal ponto de integração externa.

---

## nfce/services/nfce-consulta-recibo.service.ts

Responsável pelo processamento assíncrono.

Função:

### consultarReciboNFCe()

Objetivo:

Consultar o recibo gerado na autorização.

Extrai:

- protocolo
- status
- motivo

Atualiza a nota no banco.

---

## nfce/services/nfce-logger.ts

Camada de observabilidade.

Classe:

### NfceLogger

Funções:

- info
- warn
- error
- debug

Baseado em Pino.

Permite rastrear cada emissão.

---

# 10. APIs

## nfce/routes/nfce-saida.routes.ts

Endpoint principal.

Responsável por:

- validar payload
- criar nota
- adicionar na fila

Fluxo assíncrono.

---

## nfce/routes/input-nfe.routes.ts

Endpoint legado.

Provavelmente utilizado durante fases iniciais do projeto.

---

## nfce/routes/monitoring.routes.ts

Monitoramento operacional.

Retorna:

- waiting
- active
- completed
- failed
- delayed

Muito útil para dashboard futuro.

---

## nfce/routes/nfce-api.routes.ts

API administrativa.

Permite:

- listar NFC-es
- consultar detalhes
- consultar status

Ideal para integração com painel web.

---

# 11. Banco de Dados

Pelas consultas Prisma identificadas, a entidade principal é:

nFeSaida

Campos observados:

- id
- empresaId
- numero
- serie
- clienteNome
- clienteDocumento
- valorTotal
- xml
- xmlAssinado
- protocolo
- chaveAcesso
- status

Também existe relacionamento com itens.

---

# 12. Estados da Nota

Fluxo sugerido identificado:

PENDENTE
→ XML_GERADO
→ ASSINADA
→ ENVIADA
→ PROCESSANDO
→ AUTORIZADA

ou

→ REJEITADA

ou

→ ERRO

---

# 13. Pontos Fortes da Arquitetura

- Separação clara por responsabilidade
- Processamento assíncrono
- Baixo acoplamento
- Fácil escalabilidade
- Preparado para múltiplos workers
- Camada de logs dedicada
- Integração fiscal isolada

---

# 14. Próximas Evoluções Recomendadas

## Curto Prazo

- Dashboard BullMQ
- Retry automático
- Dead Letter Queue
- Métricas Prometheus
- Health Checks

## Médio Prazo

- Cancelamento NFC-e
- Inutilização
- Consulta situação

## Longo Prazo

- NF-e 55
- MDF-e
- Eventos fiscais
- Multiempresa
- API pública fiscal

---

# 15. Objetivo Estratégico do ALENFE

Transformar o ALENFE em uma plataforma fiscal centralizada capaz de atuar como:

- Gateway Fiscal
- Motor SEFAZ
- Middleware Fiscal
- Hub de Certificados Digitais
- Plataforma Multi-ERP
- Serviço de Emissão Fiscal Escalável

O ERP ALESYS torna-se apenas consumidor da API fiscal, enquanto toda a inteligência tributária permanece centralizada no ALENFE.
