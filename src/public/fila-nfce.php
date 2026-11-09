<?php
// fila-nfce.php - Monitoramento de NFC-e com fluxograma de status
include 'includes/header.php';
?>
<div class="min-h-screen bg-slate-950 max-w-7xl mx-auto"
    style="background: radial-gradient(ellipse at top, #022c22 0%, #020617 70%);">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <!-- Cabeçalho Padronizado -->
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
                <div>
                    <h1 class="text-3xl font-bold text-white">Fila NFC-e</h1>
                    <p class="text-slate-400 text-sm">Acompanhamento em tempo real das notas fiscais</p>
                </div>
            </div>
            <button type="button" onclick="openXmlDownloadModal()"
                class="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition text-sm font-semibold shadow-lg shadow-emerald-500/20">
                Download XML
            </button>
        </div>

        <!-- Tabela de Monitoramento Glassmorphism -->
        <div class="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead>
                        <tr class="text-slate-400 border-b border-slate-700/50">
                            <th class="py-3 px-4">ID</th>
                            <th class="py-3 px-4">Data/Hora</th>
                            <th class="py-3 px-4">Cliente</th>
                            <th class="py-3 px-4">Valor</th>
                            <th class="py-3 px-4">Status</th>
                            <th class="py-3 px-4">Fluxo</th>
                            <th class="py-3 px-4">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="nfce-table-body" class="divide-y divide-slate-800">
                        <!-- Dados serão inseridos dinamicamente -->
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<!-- Modal de Detalhes -->
<div id="detail-modal" class="detail-modal-overlay">
    <div class="detail-modal-container">

        <!-- HEADER -->
        <div class="detail-modal-header">
            <h2 class="text-lg font-semibold text-slate-200">Detalhes da NFC-e</h2>
            <button class="detail-modal-close" onclick="closeModal()">&times;</button>
        </div>

        <!-- BODY COM SCROLL -->
        <div class="detail-modal-body">

            <!-- ERRO SEFAZ -->
            <div id="modal-erro" class="detail-error-banner hidden">
                <div class="flex items-center gap-2">
                    <span class="text-rose-400 font-bold text-sm">⚠</span>
                    <span id="modal-erro-texto" class="text-sm"></span>
                </div>
            </div>

            <!-- TIMELINE DE LOGS -->
            <div class="detail-modal-section">
                <div class="detail-modal-section-title">Timeline de Processamento</div>
                <div id="modal-historico"></div>
            </div>

            <!-- XML DE ENVIO -->
            <div class="detail-modal-section">
                <div class="detail-modal-section-title">XML de Envio</div>
                <div id="modal-xml-envio" class="detail-xml-block"></div>
            </div>

            <!-- XML DE RETORNO -->
            <div class="detail-modal-section">
                <div class="detail-modal-section-title">XML de Retorno</div>
                <div id="modal-xml-retorno" class="detail-xml-block"></div>
            </div>

        </div>
    </div>
</div>

<!-- Modal de Download XML -->
<div id="xml-download-modal" class="detail-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="xml-download-title">
    <div class="detail-modal-container">
        <div class="detail-modal-header">
            <h2 id="xml-download-title" class="text-lg font-semibold text-slate-200">Download XML</h2>
            <button type="button" class="detail-modal-close" onclick="closeXmlDownloadModal()" aria-label="Fechar">&times;</button>
        </div>
        <form id="xml-download-form" class="detail-modal-body" onsubmit="event.preventDefault(); baixarXmlFiltrado();">
            <p class="text-sm text-slate-400 mb-4">Escolha o período e os tipos de documento. A data final é inclusiva.</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <label class="block text-sm text-slate-300">
                    Data Início
                    <input id="xml-data-inicio" name="dataInicio" type="date" required
                        class="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                </label>
                <label class="block text-sm text-slate-300">
                    Data Fim
                    <input id="xml-data-fim" name="dataFim" type="date" required
                        class="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                </label>
            </div>
            <fieldset>
                <legend class="text-sm font-medium text-slate-300 mb-2">Status dos documentos</legend>
                <div class="space-y-2 text-sm text-slate-300">
                    <label class="flex items-start gap-2"><input type="checkbox" name="xml-filtro" value="autorizadas" class="mt-1 accent-emerald-500"><span>Autorizadas</span></label>
                    <label class="flex items-start gap-2"><input type="checkbox" name="xml-filtro" value="canceladas" class="mt-1 accent-emerald-500"><span>Canceladas</span></label>
                    <label class="flex items-start gap-2"><input type="checkbox" name="xml-filtro" value="erro" class="mt-1 accent-emerald-500"><span>Com erro (inclui rejeitadas)</span></label>
                    <label class="flex items-start gap-2"><input type="checkbox" name="xml-filtro" value="inutilizadas" class="mt-1 accent-emerald-500"><span>Inutilizadas (homologadas)</span></label>
                </div>
            </fieldset>
            <p id="xml-download-error" class="hidden text-sm text-rose-400 mt-4" role="alert"></p>
            <div class="flex items-center justify-end gap-3 mt-6">
                <button type="button" onclick="closeXmlDownloadModal()"
                    class="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">Fechar</button>
                <button id="btn-baixar-xml" type="submit"
                    class="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors">Baixar XML</button>
            </div>
        </form>
    </div>
</div>

<!-- Modal de Cancelamento -->
<div id="cancel-modal" class="detail-modal-overlay">
    <div class="detail-modal-container">
        <div class="detail-modal-header">
            <h2 class="text-lg font-semibold text-slate-200">Cancelar NFC-e</h2>
            <button class="detail-modal-close" onclick="closeCancelModal()">&times;</button>
        </div>
        <div class="detail-modal-body">
            <p class="text-sm text-slate-400 mb-4">Informe a justificativa do cancelamento (mínimo 15 caracteres).</p>
            <textarea id="cancel-justificativa"
                class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows="4" placeholder="Justificativa do cancelamento..." maxlength="255"></textarea>
            <div class="flex items-center justify-between mt-3">
                <span id="cancel-char-count" class="text-xs text-slate-500">0/255</span>
                <span id="cancel-error" class="text-xs text-rose-400 hidden"></span>
            </div>
            <div class="flex items-center justify-end gap-3 mt-4">
                <button onclick="closeCancelModal()"
                    class="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">Voltar</button>
                <button id="btn-confirmar-cancelamento" onclick="confirmarCancelamento()"
                    class="px-6 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-all">Confirmar
                    Cancelamento</button>
            </div>
        </div>
    </div>
</div>

<script src="/js/api-auth.js"></script>
<script src="/js/fila-nfce.js?v=<?= filemtime($_SERVER['DOCUMENT_ROOT'] . '/js/fila-nfce.js') ?>"></script>

<style>
    /* Fluxograma */
    .status-flow {
        display: flex;
        align-items: center;
        gap: 2px;
    }

    .status-flow .circle {
        min-width: 12px;
        min-height: 12px;
        transition: background 0.3s;
    }

    .status-flow .connector {
        min-width: 16px;
        height: 4px;
        transition: background 0.3s;
    }
</style>

<?php include 'includes/footer.php'; ?>