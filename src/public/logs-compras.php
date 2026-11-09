<?php
require_once 'includes/header.php';

$apiUrl = "https://alenfe.alecriminteligente.com.br/api/logs";
$response = @file_get_contents($apiUrl);
$logs = $response ? json_decode($response, true) : [];

$statusClasses = [
    'SUCESSO' => 'bg-emerald-500/20 text-emerald-300',
    'ERRO' => 'bg-rose-500/20 text-rose-300',
    'SEM_DADOS' => 'bg-yellow-500/20 text-yellow-300'
];
?>
<div class="min-h-screen bg-slate-950 max-w-7xl mx-auto"
    style="background: radial-gradient(ellipse at top, #022c22, #020617);">
    <div class="max-w-7xl mx-auto px-4 py-8">
        <!-- Cabeçalho com botão Voltar -->
        <div class="flex items-center gap-4 mb-8">
            <a href="notas-compras.php"
                class="inline-flex items-center px-4 py-2 bg-slate-800 text-emerald-400 rounded-lg hover:bg-slate-700 transition text-sm font-medium">
                ← Voltar
            </a>
            <h1 class="text-2xl font-bold text-white">Logs do Sistema</h1>
        </div>

        <!-- Tabela de logs -->
        <div
            class="overflow-x-auto rounded-xl border border-emerald-500/10 bg-slate-900/50 backdrop-blur-xl shadow-2xl">
            <table class="min-w-full divide-y divide-emerald-500/10">
                <thead>
                    <tr class="text-left text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                        <th class="px-6 py-4">ID</th>
                        <th class="px-6 py-4">Empresa</th>
                        <th class="px-6 py-4">Status</th>
                        <th class="px-6 py-4">Docs</th>
                        <th class="px-6 py-4">Início</th>
                        <th class="px-6 py-4">Fim</th>
                        <th class="px-6 py-4 text-right">Detalhes</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-emerald-500/10">
                    <?php foreach ($logs as $log): ?>
                        <tr class="text-sm text-slate-300 hover:bg-emerald-500/5 transition duration-150">
                            <td class="px-6 py-4 font-mono text-xs"><?= htmlspecialchars((string) ($log['id'] ?? '-')) ?>
                            </td>
                            <td class="px-6 py-4 font-medium text-slate-200">
                                <?= htmlspecialchars((string) ($log['empresa']['razaoSocial'] ?? 'N/A')) ?>
                            </td>
                            <td class="px-6 py-4">
                                <?php
                                $status = $log['status'] ?? '';
                                $class = $statusClasses[$status] ?? 'bg-slate-500/20 text-slate-400';
                                ?>
                                <span
                                    class="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border border-current <?= $class ?>">
                                    <?= htmlspecialchars((string) $status) ?>
                                </span>
                            </td>
                            <td class="px-6 py-4"><?= htmlspecialchars((string) ($log['documentos'] ?? '0')) ?></td>
                            <td class="px-6 py-4 text-xs">
                                <?= !empty($log['createdAt']) ? date('d/m/Y H:i:s', strtotime($log['createdAt'])) : '-' ?>
                            </td>
                            <td class="px-6 py-4 text-xs">
                                <?= !empty($log['finishedAt']) ? date('d/m/Y H:i:s', strtotime($log['finishedAt'])) : '-' ?>
                            </td>
                            <td class="px-6 py-4 text-right">
                                <button
                                    onclick="verLog(<?= htmlspecialchars(json_encode($log['logDetalhado'] ?? 'Sem detalhes'), ENT_QUOTES, 'UTF-8') ?>)"
                                    class="bg-slate-800 hover:bg-slate-700 text-emerald-400 px-3 py-1.5 rounded-lg border border-slate-700/50 text-xs transition duration-200">
                                    Ver
                                </button>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>


    </div>
</div>

<!-- Modal de Detalhes -->
<div id="logModal" class="fixed inset-0 bg-slate-900/90 z-50 hidden flex items-center justify-center p-4">
    <div
        class="bg-slate-800/80 backdrop-blur-xl border border-emerald-500/10 rounded-2xl max-w-2xl w-full p-6 shadow-2xl">
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-emerald-200">Detalhes do Log</h3>
            <button onclick="fecharModal()" class="text-slate-400 hover:text-white text-xl">&times;</button>
        </div>
        <pre id="logContent"
            class="bg-slate-900/60 rounded-lg p-4 text-sm text-emerald-100 font-mono whitespace-pre-wrap overflow-auto max-h-96"></pre>
    </div>
</div>

<script>
    function verLog(detalhes) {
        const conteudo = typeof detalhes === 'object' ? JSON.stringify(detalhes, null, 2) : detalhes;
        document.getElementById('logContent').textContent = conteudo || 'Sem detalhes';

        const modal = document.getElementById('logModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex'); // Garante o alinhamento central
    }

    function fecharModal() {
        const modal = document.getElementById('logModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    document.getElementById('logModal').addEventListener('click', function (e) {
        if (e.target === this) fecharModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') fecharModal();
    });
</script>

<?php
require_once 'includes/footer.php';
?>