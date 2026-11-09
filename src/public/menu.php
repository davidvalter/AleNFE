<?php
/**
 * /src/public/menu.php
 * AleNFE - Tela de Menu Geral
 */

require_once __DIR__ . '/includes/header.php';
?>
<main class="flex-1 min-h-screen p-8" style="background: radial-gradient(circle at center, #022c22, #020617);">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        <!-- Card Empresas -->
        <a href="empresas.php" class="block group">
            <div
                class="bg-slate-900/50 backdrop-blur-xl border border-emerald-500/10 rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.02]">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <svg class="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <h3 class="text-xl font-semibold text-white">Empresas</h3>
                    </div>
                    <span id="empresas-total" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300">Carregando...</span>
                </div>
                <p class="text-slate-400 text-sm">Gerenciamento de cadastros e certificados</p>
                <div class="mt-4 flex items-center gap-2 text-xs text-slate-500">
                    <span id="empresas-pendentes" class="bg-emerald-500/10 px-2 py-1 rounded">Carregando...</span>
                </div>
            </div>
        </a>

        <!-- Card Fila NFC-e (65) -->
        <a href="fila-nfce.php" class="block group">
            <div
                class="bg-slate-900/50 backdrop-blur-xl border border-emerald-500/10 rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.02]">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <svg class="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 class="text-xl font-semibold text-white">Fila NFC-e (65)</h3>
                    </div>
                    <span id="nfce-total" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300">Carregando...</span>
                </div>
                <p class="text-slate-400 text-sm">Monitoramento e emissão de cupons fiscais</p>
                <div class="mt-4 flex items-center gap-2 text-xs text-slate-500">
                    <span id="nfce-pendentes" class="bg-yellow-500/10 px-2 py-1 rounded">Carregando...</span>
                </div>
            </div>
        </a>

        <!-- Card Fila NFe (55) -->
        <a href="fila-nfe.php" class="card-disabled block group">
            <div
                class="bg-slate-900/50 backdrop-blur-xl border border-emerald-500/10 rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.02]">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <svg class="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 class="text-xl font-semibold text-white">Fila NFe (55)</h3>
                    </div>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300">Em breve</span>
                </div>
                <p class="text-slate-400 text-sm">Gestão de notas fiscais eletrônicas</p>
                <div class="mt-4 flex items-center gap-2 text-xs text-slate-500">
                    <span class="bg-red-500/10 px-2 py-1 rounded">Módulo ainda não disponível</span>
                </div>
            </div>
        </a>

        <!-- Card Fila NFSe -->
        <a href="fila-nfse.php" class="card-disabled block group">
            <div
                class="bg-slate-900/50 backdrop-blur-xl border border-emerald-500/10 rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.02]">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <svg class="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 class="text-xl font-semibold text-white">Fila NFSe</h3>
                    </div>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300">Em breve</span>
                </div>
                <p class="text-slate-400 text-sm">Gestão de notas de serviço</p>
                <div class="mt-4 flex items-center gap-2 text-xs text-slate-500">
                    <span class="bg-yellow-500/10 px-2 py-1 rounded">Módulo ainda não disponível</span>
                </div>
            </div>
        </a>

        <!-- Card Notas de Compra -->
        <a href="notas-compras.php" class="block group">
            <div
                class="bg-slate-900/50 backdrop-blur-xl border border-emerald-500/10 rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.02]">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <svg class="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        <h3 class="text-xl font-semibold text-white">Notas de Compra</h3>
                    </div>
                    <span id="compras-total" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300">Carregando...</span>
                </div>
                <p class="text-slate-400 text-sm">Visão de notas emitidas por fornecedores</p>
                <div class="mt-4 flex items-center gap-2 text-xs text-slate-500">
                    <span id="compras-pendentes" class="bg-blue-500/10 px-2 py-1 rounded">Carregando...</span>
                </div>
            </div>
        </a>

    </div>
</main>
<script src="/js/api-auth.js"></script>
<script src="/js/menu.js"></script>
<?php require_once __DIR__ . '/includes/footer.php'; ?>