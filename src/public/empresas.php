<?php
// /src/public/empresas.php
require_once __DIR__ . '/includes/header.php';
?>

<div
    class="min-h-screen max-w-7xl mx-auto bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/10 via-slate-950 to-slate-950">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Cabeçalho -->
        <div class="flex items-center justify-between mb-8">
            <div class="flex items-center gap-4">
                <a href="menu.php"
                    class="inline-flex items-center px-4 py-2 bg-slate-800 text-emerald-400 rounded-lg hover:bg-slate-700 transition text-sm font-medium border border-slate-700/50">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        class="mr-2">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    Voltar
                </a>
                <h1 class="text-3xl font-bold text-white">Empresas</h1>
            </div>

            <button id="btnNovaEmpresa"
                class="btn-glow inline-flex items-center px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-500/30 transition-all duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Nova Empresa
            </button>
        </div>

        <!-- Tabela -->
        <div class="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-hidden shadow-xl">
            <div class="overflow-x-auto">
                <table id="tabelaEmpresas" class="min-w-full divide-y divide-slate-700/50">
                    <thead class="bg-slate-800/30">
                        <tr>
                            <th
                                class="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                CNPJ</th>
                            <th
                                class="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                Razão Social</th>
                            <th
                                class="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                UF</th>
                            <th
                                class="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                Status Certificado</th>
                            <th
                                class="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                Status API</th>
                            <th
                                class="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                Ações</th>
                        </tr>
                    </thead>
                    <tbody id="tbodyEmpresas" class="divide-y divide-slate-700/30">
                        <!-- Linhas inseridas via JS -->
                    </tbody>
                </table>
            </div>
            <div id="emptyState" class="hidden text-center py-12">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
                    class="mx-auto text-slate-600 mb-4">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <p class="text-slate-400 text-lg">Nenhuma empresa cadastrada</p>
            </div>
        </div>
    </div>
</div>

<!-- Modal -->
<div id="modalEmpresa" class="fixed inset-0 z-50 hidden overflow-y-auto" role="dialog" aria-modal="true">
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity" onclick="fecharModal()"></div>
        <div
            class="inline-block align-bottom bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl text-left overflow-hidden transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
            <div class="px-6 py-5 border-b border-slate-700/50 flex items-center justify-between">
                <h3 id="modalTitle" class="text-xl font-bold text-white">Nova Empresa</h3>
                <button onclick="fecharModal()" class="text-slate-400 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>
            <!-- Tabs -->
            <div class="px-6 pt-4">
                <div class="flex border-b border-slate-700/50">
                    <button id="tabDadosBasicos"
                        class="tab-btn px-4 py-2 text-sm font-medium text-slate-300 border-b-2 border-transparent hover:text-white hover:border-emerald-400 transition-colors"
                        onclick="ativarTab('dadosBasicos')">Dados Básicos</button>
                    <button id="tabConfigFiscais"
                        class="tab-btn px-4 py-2 text-sm font-medium text-slate-400 border-b-2 border-transparent hover:text-white hover:border-emerald-400 transition-colors"
                        onclick="ativarTab('configFiscais')">Configurações Fiscais</button>
                    <button id="tabApiKey"
                        class="tab-btn px-4 py-2 text-sm font-medium text-slate-400 border-b-2 border-transparent hover:text-white hover:border-emerald-400 transition-colors"
                        onclick="ativarTab('apiKey')">API Key</button>
                    <button id="tabWebhook"
                        class="tab-btn px-4 py-2 text-sm font-medium text-slate-400 border-b-2 border-transparent hover:text-white hover:border-emerald-400 transition-colors"
                        onclick="ativarTab('webhook')">Webhook</button>    
                </div>
            </div>
            <form id="formEmpresa" class="px-6 py-4 space-y-6">
                <!-- Aba Dados Básicos -->
                <div id="abDadosBasicos" class="tab-content space-y-4">
                    <input type="hidden" id="empresaId" name="id" value="">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-300 mb-1">CNPJ *</label>
                            <input type="text" id="cnpj" name="cnpj" required
                                class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder="00.000.000/0000-00">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-300 mb-1">Razão Social *</label>
                            <input type="text" id="razaoSocial" name="razaoSocial" required
                                class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder="Nome da empresa">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-300 mb-1">Nome Fantasia</label>
                            <input type="text" id="nomeFantasia" name="nomeFantasia"
                                class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder="Nome fantasia">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-300 mb-1">E-mail</label>
                            <input type="email" id="email" name="email"
                                class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder="contato@empresa.com">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-300 mb-1">Telefone</label>
                            <input type="text" id="telefone" name="telefone"
                                class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder="(11) 99999-9999">
                        </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-300 mb-1">CEP</label>
                            <input type="text" id="cep" name="cep"
                                class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder="00000-000">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-300 mb-1">Endereço</label>
                            <input type="text" id="endereco" name="endereco"
                                class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder="Rua, número">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-300 mb-1">Bairro</label>
                            <input type="text" id="bairro" name="bairro"
                                class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder="Bairro">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-300 mb-1">Cidade</label>
                            <input type="text" id="cidade" name="cidade"
                                class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder="Cidade">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-300 mb-1">UF</label>
                            <select id="uf" name="uf"
                                class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
                                <option value="">Selecione</option>
                                <?php
                                $ufs = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
                                foreach ($ufs as $uf)
                                    echo "<option value=\"$uf\">$uf</option>";
                                ?>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-300 mb-1">Complemento</label>
                            <input type="text" id="complemento" name="complemento"
                                class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder="Complemento">
                        </div>
                    </div>
                </div>
                <!-- Aba Configurações Fiscais -->
                <div id="abConfigFiscais" class="tab-content hidden space-y-4">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-300 mb-1">CRT *</label>
                            <select id="crt" name="crt" required
                                class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
                                <option value="1">1 – Simples Nacional</option>
                                <option value="2">2 – Simples Nacional – Excesso</option>
                                <option value="3">3 – Regime Normal</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-300 mb-1">IE</label>
                            <input type="text" id="ie" name="ie"
                                class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder="Inscrição Estadual">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-300 mb-1">IM</label>
                            <input type="text" id="im" name="im"
                                class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder="Inscrição Municipal">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-300 mb-1">CNAE</label>
                            <input type="text" id="cnae" name="cnae"
                                class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder="0000-0/00">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-300 mb-1">CSC</label>
                            <input type="text" id="csc" name="csc"
                                class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder="Código de Segurança do Contribuinte">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-300 mb-1">CSCID</label>
                            <input type="text" id="cscid" name="cscid"
                                class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder="ID do CSC">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-300 mb-1">Ambiente *</label>
                            <select id="ambiente" name="ambiente" required
                                class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
                                <option value="1">Produção</option>
                                <option value="2">Homologação</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-300 mb-1">Série Padrão *</label>
                            <input type="number" id="serie" name="serie" required
                                class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder="Ex: 1" min="0" max="999">
                        </div>
                    </div>
                    <!-- Certificado -->
                    <div class="border-t border-slate-700/50 pt-4">
                        <h4 class="text-md font-semibold text-slate-200 mb-3">Certificado Digital</h4>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-slate-300 mb-1">Arquivo (.pfx /
                                    .p12)</label>
                                <input type="file" id="certificadoFile" name="certificadoFile" accept=".pfx,.p12"
                                    class="w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-700 file:text-white file:font-medium hover:file:bg-emerald-600">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-slate-300 mb-1">Senha do
                                    Certificado</label>
                                <input type="password" id="senhaCertificado" name="senhaCertificado"
                                    class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    placeholder="Senha">
                            </div>
                        </div>
                    </div>
                </div>
                <!-- Aba API Key -->
                <div id="abApiKey" class="tab-content hidden space-y-4">
                    <div class="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                        <div class="flex items-center justify-between mb-3">
                            <div>
                                <h4 class="text-md font-semibold text-slate-200">Chave de Integração</h4>
                                <p class="text-xs text-slate-400 mt-1">Use esta chave para autenticar PDVs e sistemas externos.</p>
                            </div>
                            <span id="apiKeyStatusBadge" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
                                Sem chave
                            </span>
                        </div>
                        
                        <div id="apiKeyDisplay" class="hidden mb-3">
                            <label class="block text-sm font-medium text-slate-300 mb-1">Chave Atual</label>
                            <div class="flex items-center gap-2">
                                <input type="text" id="apiKeyValue" readonly
                                    class="flex-1 px-3 py-2 bg-slate-950 border border-slate-600 rounded-lg text-emerald-400 font-mono text-sm focus:outline-none"
                                    placeholder="ak_...">
                                <button type="button" onclick="copiarApiKey()"
                                    class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm" title="Copiar">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                </button>
                            </div>
                        </div>

                        <div class="flex items-center gap-3">
                            <button type="button" id="btnGerarApiKey" onclick="gerarApiKey()"
                                class="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-500/20 transition-all">
                                Gerar Nova Chave
                            </button>
                            <button type="button" id="btnRevogarApiKey" onclick="revogarApiKey()"
                                class="hidden px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-lg shadow-rose-500/20 transition-all">
                                Revogar Chave
                            </button>
                        </div>
                        <p id="apiKeyInfo" class="text-xs text-slate-500 mt-3">A chave é exibida apenas uma vez após a geração. Guarde-a com segurança.</p>
                    </div>
                </div>

                <!-- Aba Webhook -->
                <div id="abWebhook" class="tab-content hidden space-y-4">
                    <div class="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 space-y-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <h4 class="text-md font-semibold text-slate-200">Webhook de Notificações</h4>
                                <p class="text-xs text-slate-400 mt-1">Receba eventos de NFC-e em tempo real via HTTP.</p>
                            </div>
                            <span id="webhookStatusBadge"
                                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
                                Não configurado
                            </span>
                        </div>

                        <!-- URL -->
                        <div>
                            <label for="webhookUrl" class="block text-sm font-medium text-slate-300 mb-1">URL de Destino</label>
                            <input type="url" id="webhookUrl" placeholder="https://meuservidor.com/webhook/nfce"
                                class="w-full px-3 py-2 bg-slate-950 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500">
                        </div>

                        <!-- Eventos -->
                        <div>
                            <label for="webhookEventos" class="block text-sm font-medium text-slate-300 mb-1">Eventos</label>
                            <select id="webhookEventos"
                                class="w-full px-3 py-2 bg-slate-950 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500">
                                <option value="*">Todos os eventos</option>
                                <option value="AUTORIZADA">Somente Autorização</option>
                                <option value="REJEITADA">Somente Rejeição</option>
                                <option value="ERRO">Somente Erros</option>
                            </select>
                            <p class="text-xs text-slate-500 mt-1">Use "*" para receber todos os eventos do ciclo de vida.</p>
                        </div>

                        <!-- Tentativas -->
                        <div>
                            <label for="webhookTentativas" class="block text-sm font-medium text-slate-300 mb-1">Tentativas de Entrega</label>
                            <input type="number" id="webhookTentativas" min="1" max="10" value="3"
                                class="w-full px-3 py-2 bg-slate-950 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500">
                        </div>

                        <!-- Secret (somente leitura, gerado pelo backend) -->
                        <div id="webhookSecretBlock" class="hidden">
                            <label class="block text-sm font-medium text-slate-300 mb-1">Secret (assinatura)</label>
                            <div class="flex items-center gap-2">
                                <input type="text" id="webhookSecret" readonly
                                    class="flex-1 px-3 py-2 bg-slate-950 border border-slate-600 rounded-lg text-emerald-400 font-mono text-sm focus:outline-none">
                                <button type="button" onclick="copiarWebhookSecret()"
                                    class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm" title="Copiar">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                </button>
                            </div>
                        </div>

                        <!-- Ações -->
                        <div class="flex items-center gap-3 pt-2">
                            <button type="button" id="btnSalvarWebhook" onclick="salvarWebhook()"
                                class="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-500/20 transition-all">
                                Salvar Webhook
                            </button>
                            <button type="button" id="btnExcluirWebhook" onclick="excluirWebhook()"
                                class="hidden px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-lg shadow-rose-500/20 transition-all">
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Ações -->
                <div class="flex items-center justify-end space-x-3 pt-4 border-t border-slate-700/50">
                    <button type="button" onclick="fecharModal()"
                        class="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">Cancelar</button>
                    <button type="submit"
                        class="px-6 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-500/20 transition-all">Salvar</button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- Modal de Logs do Webhook -->
<div id="modal-webhook-logs" class="fixed inset-0 z-[60] hidden items-center justify-center bg-black/60 backdrop-blur-sm">
    <div class="bg-slate-900/90 backdrop-blur-2xl border border-slate-700 rounded-2xl p-6 w-full max-w-4xl mx-4 max-h-[80vh] flex flex-col">
        <div class="flex justify-between items-center mb-4">
            <div>
                <h2 class="text-xl font-bold text-emerald-400">Logs de Entrega do Webhook</h2>
                <p id="webhookLogsEmpresa" class="text-xs text-slate-400 mt-1"></p>
            </div>
            <button onclick="fecharModalLogsWebhook()" class="text-slate-400 hover:text-white transition">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        <!-- Filtros -->
        <div class="flex items-center gap-3 mb-4">
            <select id="webhookLogsFiltro" onchange="carregarLogsWebhook()"
                class="px-3 py-2 bg-slate-950 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500">
                <option value="">Todos os eventos</option>
                <option value="true">Somente sucesso</option>
                <option value="false">Somente falhas</option>
            </select>
            <button onclick="carregarLogsWebhook()" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm">
                Atualizar
            </button>
        </div>

        <!-- Tabela de Logs -->
        <div class="overflow-y-auto flex-1">
            <table class="w-full text-left text-sm">
                <thead class="sticky top-0 bg-slate-900">
                    <tr class="text-slate-400 border-b border-slate-700/50">
                        <th class="py-3 px-4">Data/Hora</th>
                        <th class="py-3 px-4">Evento</th>
                        <th class="py-3 px-4">NFC-e</th>
                        <th class="py-3 px-4">Status</th>
                        <th class="py-3 px-4">Tentativa</th>
                        <th class="py-3 px-4">Resposta</th>
                    </tr>
                </thead>
                <tbody id="webhook-logs-body" class="divide-y divide-slate-800">
                    <tr><td colspan="6" class="py-8 text-center text-slate-500">Carregando logs...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<style>
    .btn-glow {
        box-shadow: 0 0 15px rgba(16, 185, 129, 0.4), 0 0 30px rgba(16, 185, 129, 0.2);
    }

    .btn-glow:hover {
        box-shadow: 0 0 25px rgba(16, 185, 129, 0.6), 0 0 50px rgba(16, 185, 129, 0.3);
    }

    .tab-btn.active {
        color: white;
        border-bottom-color: #34d399;
    }

    input[type="file"]::file-selector-button {
        cursor: pointer;
    }
</style>

<script src="/js/empresas.js?v=<?= filemtime($_SERVER['DOCUMENT_ROOT'] . '/js/empresas.js') ?>"></script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>