// Contadores do menu obtidos da API autenticada.
const menuNumber = new Intl.NumberFormat('pt-BR');

function formatarContagem(valor, singular, plural) {
  const numero = Number(valor) || 0;
  return `${menuNumber.format(numero)} ${numero === 1 ? singular : plural}`;
}

function atualizarTexto(id, texto) {
  const elemento = document.getElementById(id);
  if (elemento) elemento.textContent = texto;
}

async function carregarContadoresMenu() {
  try {
    const resposta = await apiFetch('/api/dashboard/stats');
    if (!resposta.ok) throw new Error('Falha ao consultar resumo do painel');

    const dados = await resposta.json();
    atualizarTexto('empresas-total', formatarContagem(dados.empresas.total, 'empresa cadastrada', 'empresas cadastradas'));
    atualizarTexto('empresas-pendentes', formatarContagem(dados.empresas.semCertificado, 'sem certificado', 'sem certificado'));
    atualizarTexto('nfce-total', formatarContagem(dados.nfce.total, 'NFC-e', 'NFC-e'));
    atualizarTexto('nfce-pendentes', formatarContagem(dados.nfce.pendentes, 'pendente', 'pendentes'));
    atualizarTexto('compras-total', formatarContagem(dados.notasCompra.total, 'nota', 'notas'));
    atualizarTexto('compras-pendentes', formatarContagem(dados.notasCompra.semXmlCompleto, 'resumo sem XML completo', 'resumos sem XML completo'));
  } catch (erro) {
    console.error('Não foi possível carregar os contadores do menu:', erro);
    ['empresas-total', 'empresas-pendentes', 'nfce-total', 'nfce-pendentes', 'compras-total', 'compras-pendentes']
      .forEach(id => atualizarTexto(id, 'Indisponível'));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  carregarContadoresMenu();
  window.setInterval(carregarContadoresMenu, 60000);
});
