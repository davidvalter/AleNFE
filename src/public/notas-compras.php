<?php
// /src/public/notas-compra.php
include 'includes/header.php';

$apiBase = "https://alenfe.alecriminteligente.com.br";

// --- Lista de empresas (GET /api/empresas devolve array direto) ---
$respEmpresas = @file_get_contents($apiBase . "/api/empresas");
$empresas = [];
if ($respEmpresas) {
    $lista = json_decode($respEmpresas, true) ?: [];
    foreach ($lista as $e) {
        $empresas[] = [
            'id' => $e['id'],
            'label' => $e['nomeFantasia'] ?: $e['razaoSocial'] ?: $e['cnpj']
        ];
    }
}

// --- Empresa selecionada (GET, com fallback para 1) ---
$empresaId = isset($_GET['empresa_id']) ? (int) $_GET['empresa_id'] : 1;
if ($empresaId <= 0)
    $empresaId = 1;

// --- Notas da empresa selecionada ---
$apiUrl = $apiBase . "/api/notas?empresaId={$empresaId}&page=1&limit=50";
$response = @file_get_contents($apiUrl);
$data = $response ? json_decode($response, true) : [];

$notas = ($data['success'] ?? false) && isset($data['notas']) && is_array($data['notas'])
    ? $data['notas']
    : [];

$totalNotas = $data['total'] ?? count($notas);
?>



<div class="min-h-screen bg-slate-950 max-w-7xl mx-auto"
    style="background: radial-gradient(ellipse at top, #022c22 0%, #020617 70%);">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-4">
                <a href="menu.php"
                    class="inline-flex items-center px-4 py-2 bg-slate-800 text-emerald-400 rounded-lg hover:bg-slate-700 transition text-sm font-medium">←
                    Voltar</a>
                <h1 class="text-2xl font-semibold text-gray-100">Notas de Compra</h1>
            </div>
            <div class="flex items-center gap-2">
                <div class="flex items-center gap-2">
                    <button onclick="reprocessarNotas()"
                        class="inline-flex items-center px-4 py-2 bg-slate-800 text-emerald-400 rounded-lg hover:bg-slate-700 transition text-sm font-medium">
                        Reprocessar
                    </button>
                    <a href="logs-compras.php"
                        class="inline-flex items-center px-4 py-2 bg-slate-800 text-emerald-400 rounded-lg hover:bg-slate-700 transition text-sm font-medium">Logs</a>
                </div>
            </div>
        </div>

        <!-- Tabela Glassmorphism -->
        <div
            class="overflow-x-auto bg-slate-900/50 backdrop-blur-xl border border-emerald-500/10 rounded-2xl shadow-2xl">
            <table class="min-w-full divide-y divide-emerald-500/10">
                <thead class="bg-slate-900/80">
                    <tr class="text-left text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                        <th class="px-6 py-4">Número</th>
                        <th class="px-6 py-4">Série</th>
                        <th class="px-6 py-4">Fornecedor</th>
                        <th class="px-6 py-4">Valor</th>
                        <th class="px-6 py-4">Data</th>
                        <th class="px-6 py-4">Status</th>
                        <th class="px-6 py-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-emerald-500/10">
                    <?php foreach ($notas as $nota): ?>
                        <tr class="hover:bg-emerald-500/5 transition duration-150 text-sm text-slate-300">
                            <td class="px-6 py-4"><?= htmlspecialchars((string) ($nota['numero'] ?? '-')) ?></td>
                            <td class="px-6 py-4"><?= htmlspecialchars((string) ($nota['serie'] ?? '-')) ?></td>
                            <td class="px-6 py-4">
                                <?= htmlspecialchars((string) ($nota['fornecedorNome'] ?? 'Não informado')) ?>
                            </td>
                            <td class="px-6 py-4 text-slate-200 font-medium">
                                R$ <?= number_format((float) ($nota['valorNota'] ?? 0), 2, ',', '.') ?>
                            </td>
                            <td class="px-6 py-4">
                                <?= isset($nota['dataEmissao']) ? date('d/m/Y', strtotime($nota['dataEmissao'])) : '-' ?>
                            </td>
                            <td class="px-6 py-4">
                                <?php
                                $situacao = $nota['situacao'] ?? '';
                                if ($situacao === "XML_COMPLETO"): ?>
                                    <button type="button"
                                        onclick="baixarXmlNota(<?= (int) ($nota['id'] ?? 0) ?>, this)"
                                        title="Baixar XML desta nota"
                                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition">XML_COMPLETO</button>
                                <?php elseif ($situacao === "RESUMO"): ?>
                                    <span
                                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">RESUMO</span>
                                <?php else: ?>
                                    <span
                                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/20 text-slate-400 border border-slate-500/30"><?= htmlspecialchars((string) $situacao) ?></span>
                                <?php endif; ?>
                            </td>
                            <td class="px-6 py-4 text-right">
                                <button onclick='verItens(<?= json_encode($nota["itens"] ?? []) ?>)'
                                    class="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700/50 text-xs transition duration-200">
                                    Itens
                                </button>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Modal de Itens (Tailwind, fixo, glass) -->
<div id="modalItens" class="fixed inset-0 z-50 hidden">
    <div class="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" onclick="fecharModal()"></div>
    <div class="flex items-center justify-center min-h-full p-4">
        <div
            class="relative bg-slate-800/60 backdrop-blur-2xl border border-emerald-500/10 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div class="flex items-center justify-between p-6 border-b border-emerald-500/10">
                <h3 class="text-xl font-semibold text-emerald-300">Itens da Nota</h3>
                <button onclick="fecharModal()" class="text-slate-400 hover:text-white transition duration-150">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div class="p-6 overflow-y-auto">
                <table class="min-w-full text-sm text-slate-300">
                    <thead class="text-emerald-400 border-b border-emerald-500/10">
                        <tr>
                            <th class="px-4 py-2 text-left">#</th>
                            <th class="px-4 py-2 text-left">Produto</th>
                            <th class="px-4 py-2 text-left">Qtd</th>
                            <th class="px-4 py-2 text-left">Unit</th>
                            <th class="px-4 py-2 text-left">Total</th>
                        </tr>
                    </thead>
                    <tbody id="itensBody" class="divide-y divide-emerald-500/5">
                        <!-- Itens inseridos via JS -->
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<!-- JavaScript Adaptado -->
<!-- JavaScript Adaptado -->
<script src="/js/api-auth.js"></script>
<script>
    async function baixarXmlNota(notaId, botao) {
        const textoOriginal = botao.textContent;
        botao.disabled = true;
        botao.textContent = 'Baixando...';

        try {
            const resposta = await apiFetch(`/api/notas/${encodeURIComponent(notaId)}/xml`);
            if (!resposta.ok) {
                let mensagem = 'Não foi possível baixar o XML.';
                try {
                    const erro = await resposta.json();
                    mensagem = erro.message || mensagem;
                } catch (_) {}
                throw new Error(mensagem);
            }

            const arquivo = await resposta.blob();
            const url = URL.createObjectURL(arquivo);
            const link = document.createElement('a');
            link.href = url;
            link.download = `NFe-${notaId}.xml`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (erro) {
            console.error('Erro ao baixar XML da nota:', erro);
            alert(erro.message || 'Não foi possível baixar o XML desta nota.');
        } finally {
            botao.disabled = false;
            botao.textContent = textoOriginal;
        }
    }

    function verItens(itens) {
        let html = "";

        if (!itens || itens.length === 0) {
            // Corrigido: String em uma única linha para evitar SyntaxError
            html = '<tr><td colspan="5" class="px-4 py-8 text-center text-slate-500">Nenhum item encontrado nesta nota.</td></tr>';
        } else {
            itens.forEach(item => {
                html += `
                <tr class="hover:bg-emerald-500/5 transition">
                    <td class="px-4 py-3 font-mono text-xs text-slate-500">${item.itemNumero || ''}</td>
                    <td class="px-4 py-3 text-slate-200">${item.descricao || ''}</td>
                    <td class="px-4 py-3">${Number(item.quantidade || 0).toLocaleString('pt-BR')}</td>
                    <td class="px-4 py-3 text-emerald-500/80">R$ ${Number(item.valorUnitario || 0).toFixed(2)}</td>
                    <td class="px-4 py-3 font-medium text-emerald-400">R$ ${Number(item.valorTotal || 0).toFixed(2)}</td>
                </tr>`;
            });
        }

        document.getElementById("itensBody").innerHTML = html;
        document.getElementById('modalItens').classList.remove('hidden');
    }

    function fecharModal() {
        document.getElementById('modalItens').classList.add('hidden');
    }

    async function reprocessarNotas() {
        if (!confirm("Deseja reprocessar todas as notas?")) return;

        try {
            const response = await fetch("https://alenfe.alecriminteligente.com.br/api/notas/reprocessar", {
                method: "POST"
            });
            const data = await response.json();

            if (data.success) {
                alert("Reprocessamento iniciado em segundo plano!");
            } else {
                alert("Erro: " + (data.message || 'Erro desconhecido'));
            }
        } catch (err) {
            alert("Erro ao conectar com a API: " + err.message);
        }
    }

    // Fechar modal com a tecla ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') fecharModal();
    });
</script>


<?php include 'includes/footer.php'; ?>