// ============================================================
// NEXO OPS — Página Ocorrências
// ============================================================
Router.register('ocorrencias', async (app) => {
  let filtro = 'ativas';

  async function load() {
    app.innerHTML = `<div class="page"><div class="loading-state"><div class="spinner"></div><p>Carregando ocorrências...</p></div>${buildNavBar('ocorrencias')}</div>`;

    const [ocRes, acoesRes, resolRes] = await Promise.all([
      API.get('GET_OCORRENCIAS', { loja_id: Auth.lojaId }),
      API.get('GET_ACOES_PREDEFINIDAS', {}),
      API.get('GET_MOTIVOS', {}), // para resolucoes
    ]);

    if (!ocRes.success) { Utils.toast('Erro ao carregar', 'error'); return; }

    const allOc = ocRes.data || [];
    const acoesPre = acoesRes.data || [];

    let filtered = allOc;
    if (filtro === 'ativas') filtered = allOc.filter(o => o.STATUS === 'ABERTA' || o.STATUS === 'EM_ANDAMENTO');
    else if (filtro === 'resolvidas') filtered = allOc.filter(o => o.STATUS === 'RESOLVIDA');

    const abertas = allOc.filter(o => o.STATUS === 'ABERTA').length;
    const andamento = allOc.filter(o => o.STATUS === 'EM_ANDAMENTO').length;
    const resolvidas = allOc.filter(o => o.STATUS === 'RESOLVIDA').length;

    app.innerHTML = `
      <div class="page">
        <header class="module-header">
          <div class="module-title" style="margin-left:0">
            <p class="module-name">Ocorrências</p>
            <p class="module-sub">Resolução de problemas</p>
          </div>
          <div class="oc-counters">
            <span class="oc-count danger">${abertas}</span>
            <span class="oc-count warning">${andamento}</span>
            <span class="oc-count success">${resolvidas}</span>
          </div>
        </header>
        <div class="module-body">
          <div class="filter-tabs">
            <button class="filter-tab ${filtro === 'ativas' ? 'active' : ''}" data-f="ativas">Ativas (${abertas + andamento})</button>
            <button class="filter-tab ${filtro === 'resolvidas' ? 'active' : ''}" data-f="resolvidas">Resolvidas (${resolvidas})</button>
            <button class="filter-tab ${filtro === 'todas' ? 'active' : ''}" data-f="todas">Todas</button>
          </div>
          <div id="ocList">${filtered.length === 0 ? '<div class="empty-state"><p>Nenhuma ocorrência encontrada</p></div>' : ''}</div>
        </div>
        ${buildNavBar('ocorrencias')}
      </div>
    `;

    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => { filtro = tab.dataset.f; load(); });
    });

    // Render cards
    const list = document.getElementById('ocList');
    filtered.forEach(oc => {
      const card = document.createElement('div');
      const statusClass = oc.STATUS === 'ABERTA' ? 'aberta' : oc.STATUS === 'EM_ANDAMENTO' ? 'andamento' : 'resolvida';
      const dias = Utils.daysSince(oc.DATA_ABERTURA);
      const acoesTipo = acoesPre.filter(a => a.TIPO_OCORRENCIA === oc.TIPO);
      const timeline = (oc.DADOS_ACUMULADOS || '').split(' | ');

      card.className = `oc-card ${statusClass}`;
      card.innerHTML = `
        <div class="oc-header">
          <div class="oc-tipo-info">
            <p class="oc-tipo">${oc.TIPO}</p>
            <p class="oc-age">${oc.STATUS === 'RESOLVIDA' ? 'Resolvida em ' + Utils.formatDate(oc.DATA_RESOLUCAO) : (oc.STATUS === 'EM_ANDAMENTO' ? 'Em andamento há ' : 'Aberta há ') + dias + ' dias'}</p>
          </div>
          <span class="badge oc-badge-${statusClass}">${oc.STATUS === 'EM_ANDAMENTO' ? 'EM ANDAMENTO' : oc.STATUS}</span>
        </div>

        <div class="oc-timeline">
          <p class="label-sub">Timeline</p>
          ${timeline.map(t => `<div class="timeline-entry"><span class="timeline-dot"></span><span>${t}</span></div>`).join('')}
        </div>

        ${oc.acoes && oc.acoes.length > 0 ? `
          <div class="oc-acoes-log">
            <p class="label-sub">Ações registradas</p>
            ${oc.acoes.map(a => `<div class="acao-entry"><span class="acao-date">${Utils.formatDate(a.DATA)}</span><span>${a.ACAO_TOMADA}</span></div>`).join('')}
          </div>
        ` : ''}

        ${oc.STATUS === 'RESOLVIDA' && oc.MOTIVO_RESOLUCAO ? `
          <div class="oc-resolucao"><span>Resolução:</span> ${oc.MOTIVO_RESOLUCAO}</div>
        ` : ''}

        ${oc.STATUS !== 'RESOLVIDA' ? `
          <div class="oc-actions">
            <p class="label-sub">Registrar ação</p>
            <div class="chip-group">${acoesTipo.map(a =>
              `<span class="chip acao-chip" data-oc="${oc.ID_OCORRENCIA}" data-acao="${a.ACAO}">${a.ACAO}</span>`
            ).join('')}</div>
            <button class="btn-resolver" data-oc="${oc.ID_OCORRENCIA}" data-tipo="${oc.TIPO}">Marcar como resolvida</button>
          </div>
        ` : ''}
      `;

      list.appendChild(card);
    });

    // Ação chips
    document.querySelectorAll('.acao-chip').forEach(chip => {
      chip.addEventListener('click', async () => {
        chip.classList.add('selected');
        chip.textContent = 'Salvando...';
        const r = await API.post('SAVE_ACAO_OCORRENCIA', {
          id_ocorrencia: chip.dataset.oc,
          acao: chip.dataset.acao,
          id_pessoa: Auth.userId,
        }, { loja_id: Auth.lojaId });

        if (r.success) {
          Utils.toast('Ação registrada!', 'success');
          load();
        } else {
          Utils.toast(r.error || 'Erro', 'error');
          chip.textContent = chip.dataset.acao;
        }
      });
    });

    // Resolver
    document.querySelectorAll('.btn-resolver').forEach(btn => {
      btn.addEventListener('click', () => showResolverModal(btn.dataset.oc, btn.dataset.tipo));
    });
  }

  function showResolverModal(ocId, tipo) {
    const resolucoes = {
      'Ruptura recorrente': ['Estoque normalizado', 'Fornecedor trocado', 'Produto descontinuado do mix'],
      'Temperatura fora da faixa': ['Equipamento reparado', 'Equipamento substituído'],
      'Quebra acima da meta': ['Meta de quebra atingida', 'Processo corrigido'],
      'Presença crítica': ['Equipe completa', 'Contratação realizada'],
    };
    const opcoes = resolucoes[tipo] || ['Resolvido'];

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card">
        <p class="modal-title">Resolver ocorrência</p>
        <p class="label-sub">Motivo da resolução:</p>
        <div class="chip-group">${opcoes.map(o => `<span class="chip resolucao-chip" data-value="${o}">${o}</span>`).join('')}</div>
        <div class="modal-actions">
          <button class="btn-cancel" id="modalCancel">Cancelar</button>
          <button class="btn-primary" id="modalConfirm" disabled>Confirmar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    let selected = '';
    modal.querySelectorAll('.resolucao-chip').forEach(c => {
      c.addEventListener('click', () => {
        modal.querySelectorAll('.resolucao-chip').forEach(x => x.classList.remove('selected'));
        c.classList.add('selected');
        selected = c.dataset.value;
        document.getElementById('modalConfirm').disabled = false;
      });
    });

    document.getElementById('modalCancel').addEventListener('click', () => modal.remove());
    document.getElementById('modalConfirm').addEventListener('click', async () => {
      const btn = document.getElementById('modalConfirm');
      btn.disabled = true; btn.textContent = 'Salvando...';

      const r = await API.post('RESOLVER_OCORRENCIA', {
        id_ocorrencia: ocId, motivo_resolucao: selected
      }, { loja_id: Auth.lojaId });

      modal.remove();
      if (r.success) {
        Utils.toast('Ocorrência resolvida!', 'success');
        load();
      } else {
        Utils.toast(r.error || 'Erro', 'error');
      }
    });
  }

  load();
});

// ---- Página Perfil (simples) ----
Router.register('perfil', (app) => {
  app.innerHTML = `
    <div class="page">
      <header class="module-header">
        <div class="module-title" style="margin-left:0"><p class="module-name">Perfil</p><p class="module-sub">Configurações da conta</p></div>
      </header>
      <div class="module-body">
        <div class="profile-card">
          <div class="profile-avatar">${(Auth.user.nome || 'U').split(' ').map(n=>n[0]).join('').substring(0,2)}</div>
          <p class="profile-name">${Auth.user.nome}</p>
          <p class="profile-role">${Auth.user.cargo} — ${Auth.user.tipo}</p>
        </div>
        <div class="profile-info">
          <div class="info-row"><span>Loja</span><span>${Auth.loja.nome}</span></div>
          <div class="info-row"><span>Rede</span><span>${Auth.loja.rede}</span></div>
          <div class="info-row"><span>Cidade</span><span>${Auth.loja.cidade} — ${Auth.loja.uf}</span></div>
          <div class="info-row"><span>Versão</span><span>NEXO OPS v${NEXO.VERSION}</span></div>
          <div class="info-row"><span>Dados offline</span><span>${API.pendingCount} pendentes</span></div>
        </div>
        <button class="btn-danger btn-full" onclick="Auth.logout()">Sair</button>
      </div>
      ${buildNavBar('perfil')}
    </div>
  `;
});
