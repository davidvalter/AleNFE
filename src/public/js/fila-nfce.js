// src/public/js/fila-nfce.js
// Configuração de Endpoints
const API_BASE = 'https://alenfe.alecriminteligente.com.br/api';

// Etapas reais do fluxo (conforme NFCeLog)
const etapas = [
  { key: 'RECEBIDO', label: 'Recebido' },
  { key: 'VALIDACAO', label: 'Validação' },
  { key: 'GERANDO_XML', label: 'XML' },
  { key: 'ASSINANDO_XML', label: 'Assinatura' },
  { key: 'ENVIADO_SEFAZ', label: 'SEFAZ' },
  { key: 'SEFAZ_RESPONSE', label: 'Resposta' },
  { key: 'PROCESSADO', label: 'Processado' }
];

// Cores
const cores = {
  success: '#10b981',
  active: '#3b82f6',
  error: '#ef4444',
  warn: '#f59e0b',
  empty: '#334155'
};


// =========================
// RENDER FLUXO NA TABELA COM TOOLTIP
// =========================
function renderStatusFlow(nota) {
  const status = (nota.status || '').toUpperCase();

  const progresso = {
    'PENDENTE': 0,
    'PROCESSANDO': 2,
    'XML_GERADO': 2,
    'AUTORIZADA': 6,
    'PROCESSADO': 6,
    'REJEITADA': 5,
    'CANCELADA': 0,
    'ERRO': 2
  };

  let currentIndex = progresso[status] ?? 0;
  let hasError = ['REJEITADA', 'ERRO'].includes(status);

  // =========================
  // TOOLTIP HTML (apenas o fluxo)
  // =========================
  let tooltipHtml = '<div class="flow-tooltip">';
  tooltipHtml += '<div class="flow-tooltip-title">Fluxo de Processamento</div>';

  etapas.forEach((etapa, index) => {
    let cor = '#475569';
    let statusLabel = 'Pendente';

    if (index < currentIndex) {
      cor = '#10b981';
      statusLabel = 'OK';
    } else if (index === currentIndex) {
      if (hasError) {
        cor = '#ef4444';
        statusLabel = 'Erro';
      } else if (status === 'AUTORIZADA' || status === 'PROCESSADO') {
        cor = '#10b981';
        statusLabel = 'OK';
      } else {
        cor = '#3b82f6';
        statusLabel = 'Andamento';
      }
    }

    let statusBadgeCor = '';
    if (statusLabel === 'OK') statusBadgeCor = 'background:#10b98120;color:#10b981';
    else if (statusLabel === 'Erro') statusBadgeCor = 'background:#ef444420;color:#ef4444';
    else if (statusLabel === 'Andamento') statusBadgeCor = 'background:#3b82f620;color:#3b82f6';
    else statusBadgeCor = 'background:#47556920;color:#94a3b8';

    tooltipHtml += `
      <div class="flow-tooltip-item">
        <div class="flow-tooltip-dot" style="background-color: ${cor}"></div>
        <span>${etapa.label}</span>
        <span class="flow-tooltip-status" style="${statusBadgeCor}">${statusLabel}</span>
      </div>
    `;
  });

  tooltipHtml += '</div>';

  // =========================
  // BARRA DE FLUXO (círculos)
  // =========================
  let html = `<div class="status-flow-wrapper relative inline-block">`;
  html += '<div class="status-flow flex items-center gap-1">';

  etapas.forEach((etapa, index) => {
    let corCircle = cores.empty;
    let corConnector = cores.empty;
    let pulseClass = '';

    if (index < currentIndex) {
      corCircle = cores.success;
      corConnector = cores.success;
    } else if (index === currentIndex) {
      if (hasError) {
        corCircle = cores.error;
      } else if (status === 'AUTORIZADA' || status === 'PROCESSADO') {
        corCircle = cores.success;
      } else {
        corCircle = cores.active;
        pulseClass = 'animate-pulse';
      }
    }

    html += `<div class="circle w-2.5 h-2.5 rounded-full ${pulseClass}" 
                  style="background-color: ${corCircle}; min-width: 10px; min-height: 10px;"></div>`;

    if (index < etapas.length - 1) {
      html += `<div class="connector w-3 h-0.5" 
                    style="background-color: ${corConnector}; min-width: 12px; height: 2px;"></div>`;
    }
  });

  html += '</div>';
  html += tooltipHtml;
  html += '</div>';
  return html;
}

// =========================
// RENDER BADGE DE STATUS
// =========================
function renderStatusBadge(status) {
  const s = (status || '').toUpperCase();
  let badgeColor = 'bg-slate-800 text-slate-400 border-slate-700';

  if (s === 'AUTORIZADA' || s === 'PROCESSADO')
    badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  else if (s === 'ERRO')
    badgeColor = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
  else if (s === 'REJEITADA')
    badgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  else if (s === 'PROCESSANDO' || s === 'XML_GERADO')
    badgeColor = 'bg-blue-500/20 text-blue-400 border-blue-500/30';

  return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}">${s}</span>`;
}

// =========================
// BUSCAR DADOS DA API
// =========================
async function fetchNFCE() {
  try {
    const response = await fetch(`${API_BASE}/nfce`);
    if (!response.ok) throw new Error('Falha na rede');
    const data = await response.json();
    updateTable(data);
  } catch (err) {
    console.error('Erro ao buscar NFC-e:', err);
  }
}

function podeCancelar(status) {
  const s = (status || '').toUpperCase();
  return ['AUTORIZADA', 'PROCESSADO'].includes(s);
}

// =========================
// ATUALIZAR TABELA
// =========================
function updateTable(notas) {
  const tbody = document.getElementById('nfce-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!notas || notas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-8 text-center text-slate-500">
          Nenhuma NFC-e encontrada
        </td>
      </tr>
    `;
    return;
  }

  notas.forEach(nota => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-emerald-500/5 transition cursor-pointer text-sm border-b border-emerald-500/5';
    tr.onclick = () => openModal(nota.id);

    const valor = Number(nota.valor || nota.valorNota || 0).toFixed(2);
    const cliente = nota.cliente || nota.clienteNome || 'N/A';
    const data = nota.dataCriacao || nota.createdAt
      ? new Date(nota.dataCriacao || nota.createdAt).toLocaleString('pt-BR')
      : '-';

    // 🔑 ÚNICA ADIÇÃO: resolve a API Key da empresa desta nota
    const apiKeyDaNota = nota.apiKey || '';

    tr.innerHTML = `
      <td class="py-4 px-4 font-mono text-xs text-slate-500">${nota.id}</td>
      <td class="py-4 px-4 text-slate-300">${data}</td>
      <td class="py-4 px-4 text-slate-200 font-medium">${cliente}</td>
      <td class="py-4 px-4 text-slate-300">R$ ${valor}</td>
      <td class="py-4 px-4">${renderStatusBadge(nota.status)}</td>
      <td class="py-4 px-4">${renderStatusFlow(nota)}</td>
      <td class="py-4 px-4">
        ${podeCancelar(nota.status) ? `
          <!-- 🔑 ÚNICA ALTERAÇÃO: passa a apiKey junto com o id -->
          <button onclick="event.stopPropagation(); openCancelModal(${nota.id}, '${apiKeyDaNota}')"
              class="text-slate-400 hover:text-rose-400 transition-colors" title="Cancelar NFC-e">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        ` : '<span class="text-slate-600 text-xs">—</span>'}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// =========================
// RENDER TIMELINE DE LOGS NO MODAL
// =========================
function renderLogTimeline(logs) {
  if (!logs || logs.length === 0) {
    return '<p class="text-slate-500 text-sm">Nenhum log registrado.</p>';
  }

  let html = '<div class="space-y-3">';

  logs.forEach((log, index) => {
    const isError = log.level === 'ERROR';
    const isWarn = log.level === 'WARN';
    const isLast = index === logs.length - 1;

    let cor = '#10b981'; // success
    if (isError) cor = '#ef4444';
    else if (isWarn) cor = '#f59e0b';
    else if (isLast && log.status === 'processando') cor = '#3b82f6';

    const hora = new Date(log.createdAt).toLocaleString('pt-BR');
    const stepLabel = etapas.find(e => e.key === log.step)?.label || log.step;

    // Badge de status do log
    let statusBadge = '';
    if (log.status) {
      const s = log.status.toUpperCase();
      let badgeCor = 'bg-slate-700 text-slate-300';
      if (s === 'SUCESSO' || s === 'OK') badgeCor = 'bg-emerald-500/20 text-emerald-400';
      else if (s === 'ERRO') badgeCor = 'bg-rose-500/20 text-rose-400';
      else if (s === 'INICIADO' || s === 'INICIADA' || s === 'PROCESSANDO') badgeCor = 'bg-blue-500/20 text-blue-400';
      statusBadge = `<span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${badgeCor}">${s}</span>`;
    }

    // Linha conectora
    const connector = isLast ? '' : `
      <div class="absolute left-[11px] top-6 bottom-0 w-px" style="background-color: #334155;"></div>
    `;

    // Detalhes SEFAZ
    let sefazDetails = '';
    if (log.cStatProt) {
      const isAuthorized = log.cStatProt === '100';
      const protCor = isAuthorized ? 'text-emerald-400' : 'text-rose-400';
      sefazDetails = `
        <div class="mt-2 ml-4 p-2 rounded bg-slate-800/50 text-xs space-y-1">
          <div class="flex gap-3">
            <span class="text-slate-500">cStat Lote:</span>
            <span class="text-slate-300 font-mono">${log.cStatLote || '-'}</span>
          </div>
          <div class="flex gap-3">
            <span class="text-slate-500">cStat Prot:</span>
            <span class="${protCor} font-mono font-bold">${log.cStatProt}</span>
          </div>
          ${log.xMotivo ? `
          <div class="flex gap-3">
            <span class="text-slate-500">Motivo:</span>
            <span class="${protCor}">${log.xMotivo}</span>
          </div>` : ''}
          ${log.protocolo ? `
          <div class="flex gap-3">
            <span class="text-slate-500">Protocolo:</span>
            <span class="text-slate-300 font-mono">${log.protocolo}</span>
          </div>` : ''}
          ${log.chaveAcesso ? `
          <div class="flex gap-3">
            <span class="text-slate-500">Chave:</span>
            <span class="text-slate-300 font-mono text-[10px]">${log.chaveAcesso}</span>
          </div>` : ''}
        </div>
      `;
    }

    html += `
      <div class="relative flex gap-3 pb-4">
        <div class="relative flex-shrink-0">
          <div class="w-6 h-6 rounded-full flex items-center justify-center border-2"
               style="border-color: ${cor}; background-color: ${cor}20;">
            <div class="w-2 h-2 rounded-full" style="background-color: ${cor};"></div>
          </div>
          ${connector}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-slate-200 text-sm font-semibold">${stepLabel}</span>
            ${statusBadge}
            <span class="text-slate-500 text-xs">${hora}</span>
          </div>
          <p class="text-slate-400 text-xs mt-0.5">${log.message}</p>
          ${log.details ? `<p class="text-slate-500 text-xs mt-1 font-mono break-all">${log.details}</p>` : ''}
          ${sefazDetails}
        </div>
      </div>
    `;
  });

  html += '</div>';
  return html;
}

// =========================
// MODAL DE DETALHES
// =========================
async function openModal(id) {
  const modal = document.getElementById('detail-modal');
  if (!modal) {
    console.error('Elemento #detail-modal não encontrado no DOM');
    return;
  }

  // Abre o modal imediatamente com loading
  modal.classList.add('active');

  const historicoEl = document.getElementById('modal-historico');
  const xmlEnvioEl = document.getElementById('modal-xml-envio');
  const xmlRetornoEl = document.getElementById('modal-xml-retorno');

  if (historicoEl) historicoEl.innerHTML = '<p class="text-slate-500 text-sm">Carregando...</p>';
  if (xmlEnvioEl) xmlEnvioEl.textContent = 'Carregando...';
  if (xmlRetornoEl) xmlRetornoEl.textContent = 'Carregando...';

  try {
    const notaRes = await fetch(`${API_BASE}/nfce/${id}`);
    if (!notaRes.ok) throw new Error(`Erro ${notaRes.status} ao buscar NFC-e`);
    const nota = await notaRes.json();

    if (xmlEnvioEl) xmlEnvioEl.textContent = nota.xmlEnvio || 'XML não gerado';
    if (xmlRetornoEl) xmlRetornoEl.textContent = nota.xmlRetorno || 'Aguardando retorno';

    // Erro da SEFAZ
    const erroEl = document.getElementById('modal-erro');
    const erroTexto = document.getElementById('modal-erro-texto');
    if (erroEl && erroTexto) {
      const hasError = nota.motivoRejeicao || nota.status === 'REJEITADA' || nota.status === 'ERRO';
      erroEl.classList.toggle('hidden', !hasError);
      erroTexto.textContent = nota.motivoRejeicao || '';
    }

    // Busca logs
    let logs = [];
    try {
      const logsRes = await fetch(`${API_BASE}/nfce/${id}/logs`);
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        if (Array.isArray(logsData)) {
          logs = logsData;
        }
      }
    } catch (logsErr) {
      console.warn('Logs não disponíveis:', logsErr);
    }

    if (historicoEl) {
      historicoEl.innerHTML = renderLogTimeline(logs);
    }

  } catch (err) {
    console.error('Erro ao carregar detalhes:', err);
    if (historicoEl) {
      historicoEl.innerHTML = `<p class="text-rose-400 text-sm">Erro ao carregar: ${err.message}</p>`;
    }
  }
}

function closeModal() {
  const modal = document.getElementById('detail-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// =========================
// CANCELAMENTO DE NFC-e
// =========================
let cancelandoId = null;
let cancelandoApiKey = '';

function openCancelModal(id, apiKey) {
  cancelandoId = id;
  cancelandoApiKey = apiKey || '';
  document.getElementById('cancel-justificativa').value = '';
  document.getElementById('cancel-error').classList.add('hidden');
  document.getElementById('cancel-char-count').textContent = '0/255';
  document.getElementById('cancel-modal').classList.add('active');
}

function closeCancelModal() {
  document.getElementById('cancel-modal').classList.remove('active');
  cancelandoId = null;
  cancelandoApiKey = '';
}

async function confirmarCancelamento() {
  const justificativa = document.getElementById('cancel-justificativa').value.trim();
  const errorEl = document.getElementById('cancel-error');

  if (justificativa.length < 15) {
    errorEl.textContent = 'A justificativa deve ter no mínimo 15 caracteres.';
    errorEl.classList.remove('hidden');
    return;
  }
  if (justificativa.length > 255) {
    errorEl.textContent = 'A justificativa deve ter no máximo 255 caracteres.';
    errorEl.classList.remove('hidden');
    return;
  }


  const btn = document.getElementById('btn-confirmar-cancelamento');
  btn.disabled = true;
  btn.textContent = 'Cancelando...';
  try {
    const res = await fetch(`${API_BASE}/nfce/${cancelandoId}/cancelar-web`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xJust: justificativa })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Erro ao cancelar NFC-e');
    }
    alert('NFC-e cancelada com sucesso.');
    closeCancelModal();
    fetchNFCE();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirmar Cancelamento';
  }
}

// =========================
// INICIALIZAÇÃO
// =========================
document.addEventListener('DOMContentLoaded', () => {
  fetchNFCE();
  setInterval(fetchNFCE, 5000);
  const modal = document.getElementById('detail-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }
  // NOVO: contador de caracteres da justificativa
  const just = document.getElementById('cancel-justificativa');
  if (just) {
    just.addEventListener('input', () => {
      document.getElementById('cancel-char-count').textContent = `${just.value.length}/255`;
    });
  }
  // NOVO: fechar modal de cancelamento por clique fora
  const cancelModal = document.getElementById('cancel-modal');
  if (cancelModal) {
    cancelModal.addEventListener('click', (e) => {
      if (e.target === cancelModal) closeCancelModal();
    });
  }
});