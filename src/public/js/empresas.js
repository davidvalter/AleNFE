// src/public/js/empresas.js

let empresas = [];
let editandoId = null;
let apiKeyGerada = null;
let webhookConfigAtual = null;
let webhookLogsEmpresaId = null;

const tbody = document.getElementById('tbodyEmpresas');
const emptyState = document.getElementById('emptyState');
const modal = document.getElementById('modalEmpresa');
const form = document.getElementById('formEmpresa');
const modalTitle = document.getElementById('modalTitle');
const empresaId = document.getElementById('empresaId');
const btnNova = document.getElementById('btnNovaEmpresa');


function exibirApiKey(empresa) {
    const apiKeyDisplay = document.getElementById('apiKeyDisplay');
    const apiKeyValue = document.getElementById('apiKeyValue');
    const statusBadge = document.getElementById('apiKeyStatusBadge');
    const btnRevogar = document.getElementById('btnRevogarApiKey');
    const btnGerar = document.getElementById('btnGerarApiKey');

    if (empresa.apiKeyAtiva && empresa.apiKey) {
        apiKeyDisplay.classList.remove('hidden');
        apiKeyValue.value = empresa.apiKey;
        statusBadge.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-900/50 text-emerald-300';
        statusBadge.textContent = 'Ativa';
        btnRevogar.classList.remove('hidden');
        btnGerar.textContent = 'Regenerar Chave';
    } else {
        apiKeyDisplay.classList.add('hidden');
        statusBadge.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400';
        statusBadge.textContent = 'Sem chave';
        btnRevogar.classList.add('hidden');
        btnGerar.textContent = 'Gerar Nova Chave';
    }
}

async function gerarApiKey() {
    const id = empresaId.value;
    if (!id) {
        alert('Salve a empresa antes de gerar a API Key.');
        return;
    }
    if (!confirm('Gerar uma nova API Key? A chave anterior será substituída.')) return;

    try {
        const res = await fetch(`/api/empresas/${id}/api-key`, { method: 'POST' });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Erro ao gerar API Key');
        }
        const data = await res.json();
        apiKeyGerada = data.apiKey;

        // Exibir a chave gerada
        document.getElementById('apiKeyDisplay').classList.remove('hidden');
        document.getElementById('apiKeyValue').value = data.apiKey;
        document.getElementById('apiKeyStatusBadge').textContent = 'Ativa';
        document.getElementById('apiKeyStatusBadge').className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-900/50 text-emerald-300';
        document.getElementById('btnRevogarApiKey').classList.remove('hidden');
        document.getElementById('btnGerarApiKey').textContent = 'Regenerar Chave';

        alert('API Key gerada com sucesso! Copie e guarde em local seguro.');
        await carregarEmpresas();
    } catch (err) {
        console.error('Erro ao gerar API Key:', err);
        alert('Erro ao gerar API Key: ' + err.message);
    }
}

async function revogarApiKey() {
    const id = empresaId.value;
    if (!id) return;
    if (!confirm('Tem certeza que deseja revogar esta API Key? Os PDVs configurados com ela deixarão de funcionar.')) return;

    try {
        const res = await fetch(`/api/empresas/${id}/api-key`, { method: 'DELETE' });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Erro ao revogar API Key');
        }

        document.getElementById('apiKeyDisplay').classList.add('hidden');
        document.getElementById('apiKeyStatusBadge').textContent = 'Sem chave';
        document.getElementById('apiKeyStatusBadge').className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400';
        document.getElementById('btnRevogarApiKey').classList.add('hidden');
        document.getElementById('btnGerarApiKey').textContent = 'Gerar Nova Chave';

        alert('API Key revogada com sucesso.');
        await carregarEmpresas();
    } catch (err) {
        console.error('Erro ao revogar API Key:', err);
        alert('Erro ao revogar API Key: ' + err.message);
    }
}

function copiarApiKey() {
    const input = document.getElementById('apiKeyValue');
    input.select();
    document.execCommand('copy');
    alert('API Key copiada para a área de transferência.');
}

function formatarCNPJ(cnpj) {
    if (!cnpj) return '';
    const c = cnpj.replace(/\D/g, '');
    if (c.length !== 14) return cnpj;
    return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
}

function statusCertificado(empresa) {
    if (empresa.certificadoFile || empresa.certificadoSenha) return 'Válido';
    return 'Pendente';
}

function renderEmpresas() {
    tbody.innerHTML = '';
    if (empresas.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');
    empresas.forEach(emp => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-800/30 transition-colors border-b border-slate-700/30';
        tr.innerHTML = `
            <td class="px-6 py-4 text-sm font-mono text-slate-200">${formatarCNPJ(emp.cnpj)}</td>
            <td class="px-6 py-4 text-sm text-slate-200">${emp.razaoSocial || '-'}</td>
            <td class="px-6 py-4 text-sm text-slate-300">${emp.uf || '-'}</td>
            <td class="px-6 py-4 text-sm">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCertificado(emp) === 'Válido' ? 'bg-emerald-900/50 text-emerald-300' : 'bg-yellow-900/50 text-yellow-300'}">
                    ${statusCertificado(emp)}
                </span>
            </td>
            <td class="px-6 py-4 text-sm">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${emp.apiKeyAtiva ? 'bg-emerald-900/50 text-emerald-300' : 'bg-slate-800 text-slate-400'}">
                    ${emp.apiKeyAtiva ? 'API Ativa' : 'Sem API'}
                </span>
            </td>
            <td class="px-6 py-4 text-right text-sm font-medium">
                <button onclick="editarEmpresa('${emp._id || emp.id}')" class="text-slate-400 hover:text-emerald-400 mr-3 transition-colors" title="Editar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button onclick="excluirEmpresa('${emp._id || emp.id}')" class="text-slate-400 hover:text-red-400 mr-3 transition-colors" title="Excluir">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
                <button onclick="abrirModalLogsWebhook('${emp._id || emp.id}')" class="text-slate-400 hover:text-emerald-400 transition-colors" title="Logs do Webhook">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function carregarEmpresas() {
    try {
        const res = await fetch('/api/empresas');
        if (!res.ok) throw new Error('Erro ao carregar empresas');
        empresas = await res.json();
        renderEmpresas();
    } catch (err) {
        console.error(err);
        emptyState.innerHTML = '<p class="text-red-400">Erro ao carregar empresas.</p>';
        emptyState.classList.remove('hidden');
    }
}

/**
 * Salva uma empresa (criar ou atualizar)
 */
async function salvarEmpresa(event) {
    event.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // ===== DADOS DA EMPRESA =====
    const empresaData = {
        cnpj: data.cnpj,
        razaoSocial: data.razaoSocial,
        nomeFantasia: data.nomeFantasia,
        email: data.email,
        telefone: data.telefone,
        cep: data.cep,
        logradouro: data.endereco,
        bairro: data.bairro,
        cidade: data.cidade,
        uf: data.uf,
        complemento: data.complemento
    };

    // ===== DADOS DA FISCAL CONFIG =====
    const fiscalConfigData = {
        crt: parseInt(data.crt) || 1,
        ie: data.ie,
        im: data.im,
        cnae: data.cnae,
        csc: data.csc,
        cscId: data.cscid,
        ambiente: parseInt(data.ambiente) || 1,
        seriePadrao: parseInt(data.serie) || 1
    };

    const rawId = empresaId.value;
    const idLimpo = String(rawId).split(':')[0];
    const isEdit = !!idLimpo;

    // Captura o arquivo do certificado e a senha
    const certificadoInput = document.getElementById('certificadoFile');
    const arquivoCertificado = certificadoInput?.files?.[0] || null;
    const senhaCertificado = data.senhaCertificado || '';

    try {
        // ===== 1. SALVAR EMPRESA =====
        const urlEmpresa = isEdit ? `/api/empresas/${idLimpo}` : '/api/empresas';
        const methodEmpresa = isEdit ? 'PUT' : 'POST';
        console.log('📤 Salvando empresa:', { url: urlEmpresa, method: methodEmpresa, data: empresaData });
        const resEmpresa = await fetch(urlEmpresa, {
            method: methodEmpresa,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(empresaData)
        });
        if (!resEmpresa.ok) {
            const error = await resEmpresa.json();
            throw new Error(`Erro ao salvar empresa: ${error.message || 'Erro desconhecido'}`);
        }
        const empresaSalva = await resEmpresa.json();
        const empresaIdFinal = empresaSalva.id || idLimpo;

        // ===== 2. UPLOAD DO CERTIFICADO (só se um arquivo foi selecionado) =====
        if (arquivoCertificado) {
            if (!senhaCertificado) {
                throw new Error('Informe a senha do certificado.');
            }
            const certForm = new FormData();
            certForm.append('certificado', arquivoCertificado, arquivoCertificado.name);
            certForm.append('certificadoSenha', senhaCertificado);

            console.log('📤 Enviando certificado:', arquivoCertificado.name);
            const resCert = await fetch(`/api/empresas/${empresaIdFinal}/certificado`, {
                method: 'POST',
                body: certForm // Sem Content-Type manual — o multipart define automaticamente
            });
            if (!resCert.ok) {
                const error = await resCert.json();
                throw new Error(`Erro no certificado: ${error.message || 'Falha no upload'}`);
            }
            console.log('✅ Certificado enviado com sucesso');
        } else {
            console.log('📎 Nenhum certificado selecionado — pulando upload');
        }

        // ===== 3. SALVAR FISCAL CONFIG =====
        const urlFiscal = `/api/empresas/${empresaIdFinal}/fiscal-config`;
        const methodFiscal = isEdit ? 'PUT' : 'POST';
        console.log('📤 Salvando fiscal config:', { url: urlFiscal, method: methodFiscal, data: fiscalConfigData });
        const resFiscal = await fetch(urlFiscal, {
            method: methodFiscal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fiscalConfigData)
        });
        if (!resFiscal.ok) {
            const error = await resFiscal.json();
            throw new Error(`Erro ao salvar configuração fiscal: ${error.message || 'Erro desconhecido'}`);
        }

        console.log('✅ Empresa, certificado e configuração fiscal salvos com sucesso!');
        fecharModal();
        await carregarEmpresas();
    } catch (err) {
        console.error('❌ Erro ao salvar:', err);
        alert(`Erro ao salvar empresa: ${err.message}`);
    }
}

/**
 * Carrega dados de uma empresa para edição
 */
async function editarEmpresa(id) {
    try {
        // Limpar ID (remover sufixo como ":1")
        const idLimpo = String(id).split(':')[0];

        // Buscar empresa e configuração fiscal em paralelo
        const [resEmpresa, resFiscal] = await Promise.all([
            fetch(`/api/empresas/${idLimpo}`),
            fetch(`/api/empresas/${idLimpo}/fiscal-config`)
        ]);

        if (!resEmpresa.ok) throw new Error('Empresa não encontrada');

        const empresa = await resEmpresa.json();
        const fiscal = resFiscal.ok ? await resFiscal.json() : null;

        editandoId = idLimpo;
        modalTitle.textContent = 'Editar Empresa';
        empresaId.value = idLimpo; // Salvar ID limpo

        // ===== Preencher campos da empresa =====
        document.getElementById('cnpj').value = empresa.cnpj || '';
        document.getElementById('razaoSocial').value = empresa.razaoSocial || '';
        document.getElementById('nomeFantasia').value = empresa.nomeFantasia || '';
        document.getElementById('email').value = empresa.email || '';
        document.getElementById('telefone').value = empresa.telefone || '';
        document.getElementById('cep').value = empresa.cep || '';
        document.getElementById('endereco').value = empresa.logradouro || '';
        document.getElementById('bairro').value = empresa.bairro || '';
        document.getElementById('cidade').value = empresa.cidade || '';
        document.getElementById('uf').value = empresa.uf || '';
        document.getElementById('complemento').value = empresa.complemento || '';

        // ===== Preencher campos da configuração fiscal =====
        if (fiscal) {
            document.getElementById('crt').value = fiscal.crt || '1';
            document.getElementById('ie').value = fiscal.ie || '';
            document.getElementById('im').value = fiscal.im || '';
            document.getElementById('cnae').value = fiscal.cnae || '';
            document.getElementById('csc').value = fiscal.csc || '';
            document.getElementById('cscid').value = fiscal.cscId || '';
            document.getElementById('ambiente').value = fiscal.ambiente || '1';
            document.getElementById('serie').value = fiscal.seriePadrao || '';
        } else {
            document.getElementById('crt').value = '1';
            document.getElementById('ie').value = '';
            document.getElementById('im').value = '';
            document.getElementById('cnae').value = '';
            document.getElementById('csc').value = '';
            document.getElementById('cscid').value = '';
            document.getElementById('ambiente').value = '1';
            document.getElementById('serie').value = '';
        }

        document.getElementById('senhaCertificado').value = '';
        document.getElementById('certificadoFile').value = '';

        // ===== Preencher API Key =====
        exibirApiKey(empresa);

        // ===== Carregar Webhook =====
        carregarWebhook(empresa.id);

        // ✅ ATIVAR ABA ANTES DE ABRIR MODAL
        ativarTab('dadosBasicos');
        modal.classList.remove('hidden');

        console.log('Dados carregados com sucesso:', { empresa, fiscal });
    } catch (err) {
        console.error('Erro ao carregar dados da empresa:', err);
        alert('Erro ao carregar dados da empresa: ' + err.message);
    }
}


async function excluirEmpresa(id) {
    if (!confirm('Tem certeza que deseja excluir esta empresa?')) return;
    try {
        const res = await fetch(`/api/empresas/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao excluir');
        await carregarEmpresas();
    } catch (err) {
        console.error(err);
        alert('Erro ao excluir empresa.');
    }
}

function abrirModalNova() {
    editandoId = null;
    modalTitle.textContent = 'Nova Empresa';
    form.reset();
    empresaId.value = '';
    ativarTab('dadosBasicos');
    modal.classList.remove('hidden');

    // Limpar API Key
    document.getElementById('apiKeyDisplay').classList.add('hidden');
    document.getElementById('apiKeyStatusBadge').textContent = 'Sem chave';
    document.getElementById('apiKeyStatusBadge').className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400';
    document.getElementById('btnRevogarApiKey').classList.add('hidden');
    document.getElementById('btnGerarApiKey').textContent = 'Gerar Nova Chave';

    // Limpar Webhook
    webhookConfigAtual = null;
    limparWebhookUI();
}

function fecharModal() {
    modal.classList.add('hidden');
}

/**
 * Ativa uma aba do modal
 */
function ativarTab(tab) {
    console.log('🔄 Ativando aba:', tab);

    // Mapear os valores que vêm do HTML para os IDs corretos
    const tabMap = {
        'dadosBasicos': 'abDadosBasicos',
        'configFiscais': 'abConfigFiscais',
        'apiKey': 'abApiKey',
        'webhook': 'abWebhook'
    };

    const tabId = tabMap[tab] || tab;
    const tabs = ['abDadosBasicos', 'abConfigFiscais', 'abApiKey', 'abWebhook'];

    tabs.forEach((t) => {
        const content = document.getElementById(t);
        const btnId = t === 'abDadosBasicos' ? 'tabDadosBasicos' : t === 'abConfigFiscais' ? 'tabConfigFiscais' : t === 'abWebhook' ? 'tabWebhook' : 'tabApiKey';
        const btn = document.getElementById(btnId);

        if (t === tabId) {
            console.log('✅ Mostrando:', t);
            if (content) content.classList.remove('hidden');
            if (btn) btn.classList.add('active');
        } else {
            console.log('❌ Ocultando:', t);
            if (content) content.classList.add('hidden');
            if (btn) btn.classList.remove('active');
        }
    });
}

// ===== WEBHOOK =====
async function carregarWebhook(empresaId) {
    try {
        const res = await fetch(`/api/empresas/${empresaId}/webhook`);
        if (res.status === 404) {
            webhookConfigAtual = null;
            limparWebhookUI();
            return;
        }
        if (!res.ok) throw new Error('Erro ao carregar webhook');
        webhookConfigAtual = await res.json();
        preencherWebhookUI(webhookConfigAtual);
    } catch (err) {
        console.error('Erro ao carregar webhook:', err);
    }
}

function preencherWebhookUI(config) {
    document.getElementById('webhookUrl').value = config.url || '';
    document.getElementById('webhookEventos').value = config.eventos || '*';
    document.getElementById('webhookTentativas').value = config.tentativas || 3;
    document.getElementById('webhookSecretBlock').classList.remove('hidden');
    document.getElementById('webhookSecret').value = config.secret || '';
    document.getElementById('btnExcluirWebhook').classList.remove('hidden');

    const badge = document.getElementById('webhookStatusBadge');
    if (config.ativo) {
        badge.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-900/50 text-emerald-300';
        badge.textContent = 'Ativo';
    } else {
        badge.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-900/50 text-amber-300';
        badge.textContent = 'Inativo';
    }

    const btnLogs = document.getElementById('btnVerLogsWebhook');
    if (btnLogs) btnLogs.disabled = !config.ativo;

}

function limparWebhookUI() {
    document.getElementById('webhookUrl').value = '';
    document.getElementById('webhookEventos').value = '*';
    document.getElementById('webhookTentativas').value = 3;
    document.getElementById('webhookSecretBlock').classList.add('hidden');
    document.getElementById('webhookSecret').value = '';
    document.getElementById('btnExcluirWebhook').classList.add('hidden');

    const badge = document.getElementById('webhookStatusBadge');
    badge.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400';
    badge.textContent = 'Não configurado';

    const btnLogs = document.getElementById('btnVerLogsWebhook');
    if (btnLogs) btnLogs.disabled = true;
}

async function salvarWebhook() {
    const id = empresaId.value;
    if (!id) {
        alert('Salve a empresa antes de configurar o webhook.');
        return;
    }

    const payload = {
        url: document.getElementById('webhookUrl').value.trim(),
        eventos: document.getElementById('webhookEventos').value,
        tentativas: Number(document.getElementById('webhookTentativas').value) || 3
    };

    if (!payload.url) {
        alert('Informe a URL de destino do webhook.');
        return;
    }

    try {
        const method = webhookConfigAtual ? 'PUT' : 'POST';
        const res = await fetch(`/api/empresas/${id}/webhook`, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Erro ao salvar webhook');
        }

        const config = await res.json();
        webhookConfigAtual = config;
        preencherWebhookUI(config);
        alert(webhookConfigAtual ? 'Webhook atualizado com sucesso.' : 'Webhook criado com sucesso.');
    } catch (err) {
        console.error('Erro ao salvar webhook:', err);
        alert('Erro ao salvar webhook: ' + err.message);
    }
}

async function excluirWebhook() {
    const id = empresaId.value;
    if (!id) return;
    if (!confirm('Tem certeza que deseja excluir este webhook? As notificações deixarão de ser enviadas.')) return;

    try {
        const res = await fetch(`/api/empresas/${id}/webhook`, { method: 'DELETE' });
        if (res.status !== 204 && !res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Erro ao excluir webhook');
        }
        webhookConfigAtual = null;
        limparWebhookUI();
        alert('Webhook excluído com sucesso.');
    } catch (err) {
        console.error('Erro ao excluir webhook:', err);
        alert('Erro ao excluir webhook: ' + err.message);
    }
}

function copiarWebhookSecret() {
    const input = document.getElementById('webhookSecret');
    input.select();
    document.execCommand('copy');
    alert('Secret copiado para a área de transferência.');
}

// ===== LOGS DO WEBHOOK =====

function abrirModalLogsWebhook(id) {
    if (!id) return;
    webhookLogsEmpresaId = id;
    document.getElementById('webhookLogsEmpresa').textContent = 'Empresa #' + id;
    document.getElementById('webhookLogsFiltro').value = '';

    const modal = document.getElementById('modal-webhook-logs');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    carregarLogsWebhook();
}

function fecharModalLogsWebhook() {
    const modal = document.getElementById('modal-webhook-logs');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    webhookLogsEmpresaId = null;
}

async function carregarLogsWebhook() {
    if (!webhookLogsEmpresaId) return;

    const tbody = document.getElementById('webhook-logs-body');
    tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-slate-500">Carregando logs...</td></tr>';

    const filtro = document.getElementById('webhookLogsFiltro').value;
    const query = filtro ? `?sucesso=${filtro}` : '';

    try {
        const res = await fetch(`/api/empresas/${webhookLogsEmpresaId}/webhook/logs${query}`);
        if (res.status === 404) {
            tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-slate-500">Webhook não configurado para esta empresa.</td></tr>';
            return;
        }
        if (!res.ok) throw new Error('Erro ao carregar logs');

        const logs = await res.json();

        if (!logs.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-slate-500">Nenhum log encontrado.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        logs.forEach(log => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-800/50 transition text-sm border-b border-slate-800';

            const sucesso = log.sucesso;
            const statusBadge = sucesso
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-400 border-rose-500/30';
            const statusTexto = sucesso ? 'Sucesso' : 'Falha';

            tr.innerHTML = `
                <td class="py-3 px-4 text-slate-400">${log.createdAt ? new Date(log.createdAt).toLocaleString('pt-BR') : '-'}</td>
                <td class="py-3 px-4 text-slate-200">${log.evento || '-'}</td>
                <td class="py-3 px-4 font-mono text-xs text-slate-500">${log.nfceId || '-'}</td>
                <td class="py-3 px-4">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}">${statusTexto}</span>
                </td>
                <td class="py-3 px-4 text-slate-300">${log.tentativa || 1}</td>
                <td class="py-3 px-4 text-slate-400 text-xs max-w-[200px] truncate" title="${log.resposta || ''}">${log.resposta || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Erro ao carregar logs:', err);
        tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-rose-400">Erro ao carregar logs.</td></tr>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const btnNovaEmpresa = document.getElementById('btnNovaEmpresa');
    if (btnNovaEmpresa) {
        btnNovaEmpresa.addEventListener('click', abrirModalNova);
    }
    form.addEventListener('submit', salvarEmpresa);
    carregarEmpresas();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharModal();
});