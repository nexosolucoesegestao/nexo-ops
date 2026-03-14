// ============================================================
// NEXO OPS — Página Home
// ============================================================
Router.register('home', async (app) => {
  const registroHoje = Utils.getRegistroHoje();

  app.innerHTML = `
    <div class="page">
      <header class="top-bar">
        <div>
          <p class="top-brand">NEXO OPS</p>
          <p class="top-date">${new Date().toLocaleDateString('pt-BR')} — ${Utils.getHoraAtual()}</p>
        </div>
        <div class="status-dot ${navigator.onLine ? 'online' : 'offline'}">
          <span></span><p>${navigator.onLine ? 'Online' : 'Offline'}</p>
        </div>
      </header>

      <div class="home-greeting" id="greetingArea">
        <div>
          <p class="greeting-sub">${Utils.getSaudacao()},</p>
          <p class="greeting-name">${Auth.user.nome || 'Encarregado'}</p>
          <p class="greeting-loja">${Auth.loja.nome || ''}</p>
        </div>
        <div class="score-ring" id="scoreRing">
          <span class="score-value">--</span>
          <span class="score-badge">SCORE</span>
        </div>
      </div>

      <div id="iaCard" class="ia-card loading-placeholder">
        <div class="spinner-sm"></div>
      </div>

      <div id="ocorrenciasAtivas"></div>

      <div class="section-label">Coleta de hoje — 5 módulos</div>
      <div class="modulos-list" id="modulosList"></div>

      ${buildNavBar('home')}
    </div>
  `;

  // Carregar dashboard
  const dashRes = await API.get('GET_DASHBOARD', { loja_id: Auth.lojaId, dias: 7 });

  if (dashRes.success) {
    const d = dashRes.data;

    // Score
    const ring = document.getElementById('scoreRing');
    ring.querySelector('.score-value').textContent = d.score;
    ring.style.borderColor = Utils.scoreColor(d.score);
    ring.querySelector('.score-badge').style.background = Utils.scoreColor(d.score);

    // Card IA
    document.getElementById('iaCard').innerHTML = `
      <div class="ia-card-inner">
        <div class="ia-header">
          <svg class="ia-icon" viewBox="0 0 16 16" fill="none"><path d="M8 1L10 6H15L11 9L12.5 14L8 11L3.5 14L5 9L1 6H6L8 1Z" fill="#C5A35A"/></svg>
          <span>Direcionamento do dia</span>
        </div>
        <p class="ia-text">${d.direcionamento}</p>
        <div class="ia-actions">
          <button class="btn-ia" onclick="Utils.toast('IA disponível em breve!','info')">
            <svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1"/><circle cx="7" cy="5" r="1.5" stroke="currentColor" stroke-width=".8"/><path d="M5 8.5L4 10.5H10L9 8.5" stroke="currentColor" stroke-width=".8"/></svg>
            Fale com a IA
          </button>
          <button class="btn-ia gold" onclick="Router.navigate('ocorrencias')">
            <svg viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" stroke-width="1"/><path d="M5 7H9M7 5V9" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>
            Ver ocorrências
          </button>
        </div>
      </div>
    `;

    // Ocorrências ativas
    if (d.ocorrencias && d.ocorrencias.length > 0) {
      const ocArea = document.getElementById('ocorrenciasAtivas');
      ocArea.innerHTML = `<div class="section-label">Ocorrências ativas — ${d.ocorrencias.length}</div>`;
      d.ocorrencias.forEach(oc => {
        const statusClass = oc.STATUS === 'ABERTA' ? 'status-aberta' : 'status-andamento';
        const statusLabel = oc.STATUS === 'ABERTA' ? 'ABERTA' : 'EM ANDAMENTO';
        const dias = Utils.daysSince(oc.DATA_ABERTURA);
        ocArea.innerHTML += `
          <div class="oc-card-mini ${statusClass}" onclick="Router.navigate('ocorrencias')">
            <div class="oc-mini-info">
              <p class="oc-mini-tipo">${oc.TIPO}</p>
              <p class="oc-mini-dados">${(oc.DADOS_ACUMULADOS || '').substring(0, 60)}...</p>
            </div>
            <div class="oc-mini-status">
              <span class="badge ${statusClass}">${statusLabel}</span>
              <span class="oc-mini-age">há ${dias}d</span>
            </div>
          </div>
        `;
      });
    }
  }

  // Módulos
  const modulos = [
    { id: 'checkin', name: 'Check-in visual', desc: 'Foto do balcão — 30s', icon: 'camera', etapa: 0 },
    { id: 'pessoal', name: 'Quadro de pessoal', desc: 'Setor + terceiros — 2 min', icon: 'people', etapa: 1 },
    { id: 'ruptura', name: 'Ruptura / disponibilidade', desc: 'Estoque > AT > AS — 7 min', icon: 'ruptura', etapa: 2 },
    { id: 'quebra', name: 'Quebra', desc: 'Perdas do dia — 3 min', icon: 'quebra', etapa: 3 },
    { id: 'temperatura', name: 'Temperatura', desc: 'Cadeia do frio — 30s', icon: 'temp', etapa: 4 },
  ];

  const modulosList = document.getElementById('modulosList');
  const completedModules = JSON.parse(localStorage.getItem('nexo_modulos_' + Utils.getDataHoje()) || '[]');

  modulos.forEach((mod, i) => {
    const done = completedModules.includes(mod.id);
    const canOpen = i === 0 || completedModules.includes(modulos[i-1].id) || (i === 0 && !registroHoje);
    const isFirst = i === 0 && !registroHoje;
    const isActive = canOpen && !done;

    const card = document.createElement('div');
    card.className = `modulo-card ${done ? 'done' : isActive ? 'active' : 'locked'}`;
    card.innerHTML = `
      <div class="modulo-icon">${getModuloIcon(mod.icon, done, isActive)}</div>
      <div class="modulo-info">
        <p class="modulo-name">${mod.name}</p>
        <p class="modulo-desc">${mod.desc}</p>
      </div>
      <span class="modulo-status">${done ? '✓' : isActive ? 'ABRIR' : 'BLOQ.'}</span>
    `;

    if (isActive) {
      card.addEventListener('click', () => Router.navigate(mod.id));
    }
    modulosList.appendChild(card);
  });
});

function getModuloIcon(type, done, active) {
  const color = done ? '#2ECC71' : active ? '#2ECC71' : '#4A5D78';
  const icons = {
    camera: `<svg viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2.5" stroke="${color}" stroke-width="1.1"/><circle cx="8" cy="8" r="2.5" fill="${color}"/></svg>`,
    people: `<svg viewBox="0 0 16 16" fill="none"><circle cx="5.5" cy="6" r="2" stroke="${color}" stroke-width="1"/><circle cx="10.5" cy="6" r="2" stroke="${color}" stroke-width="1"/><path d="M3 13c0-1.5 1-2.5 2.5-2.5s2.5 1 2.5 2.5" stroke="${color}" stroke-width="1"/><path d="M8 13c0-1.5 1-2.5 2.5-2.5s2.5 1 2.5 2.5" stroke="${color}" stroke-width="1"/></svg>`,
    ruptura: `<svg viewBox="0 0 16 16" fill="none"><path d="M3 13V8L8 3L13 8V13H10V10H6V13H3Z" stroke="${color}" stroke-width="1" stroke-linejoin="round"/><line x1="4" y1="7" x2="12" y2="7" stroke="${color}" stroke-width="1.3" stroke-linecap="round"/></svg>`,
    quebra: `<svg viewBox="0 0 16 16" fill="none"><path d="M4 12L8 4L12 12" stroke="${color}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/><line x1="6" y1="9" x2="10" y2="9" stroke="${color}" stroke-width="1" stroke-linecap="round"/></svg>`,
    temp: `<svg viewBox="0 0 16 16" fill="none"><rect x="6" y="2" width="4" height="12" rx="2" stroke="${color}" stroke-width="1"/><path d="M8 5V8" stroke="${color}" stroke-width="1" stroke-linecap="round"/><circle cx="8" cy="11" r=".8" fill="${color}"/></svg>`,
  };
  return icons[type] || '';
}

function markModuleComplete(moduleId) {
  const key = 'nexo_modulos_' + Utils.getDataHoje();
  const completed = JSON.parse(localStorage.getItem(key) || '[]');
  if (!completed.includes(moduleId)) {
    completed.push(moduleId);
    localStorage.setItem(key, JSON.stringify(completed));
  }
}

function buildNavBar(active) {
  const items = [
    { id: 'home', label: 'COLETA', icon: '<svg viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="5.5" height="5.5" rx="1.5" fill="currentColor"/><rect x="10.5" y="2" width="5.5" height="5.5" rx="1.5" fill="currentColor"/><rect x="2" y="10.5" width="5.5" height="5.5" rx="1.5" fill="currentColor"/><rect x="10.5" y="10.5" width="5.5" height="5.5" rx="1.5" fill="currentColor"/></svg>' },
    { id: 'dashboard', label: 'PAINEL', icon: '<svg viewBox="0 0 18 18" fill="none"><rect x="2" y="10" width="3.5" height="6" rx="1" fill="currentColor"/><rect x="7.25" y="7" width="3.5" height="9" rx="1" fill="currentColor"/><rect x="12.5" y="4" width="3.5" height="12" rx="1" fill="currentColor"/></svg>' },
    { id: 'ocorrencias', label: 'OCORRÊNCIAS', icon: '<svg viewBox="0 0 18 18" fill="none"><path d="M9 2L11 6.5H15.5L12 9.5L13.2 14L9 11.5L4.8 14L6 9.5L2.5 6.5H7L9 2Z" fill="currentColor"/></svg>' },
    { id: 'perfil', label: 'PERFIL', icon: '<svg viewBox="0 0 18 18" fill="none"><circle cx="9" cy="7" r="3.5" stroke="currentColor" stroke-width="1.1"/><path d="M3 16c0-3 2.5-5 6-5s6 2 6 5" stroke="currentColor" stroke-width="1.1"/></svg>' },
  ];
  return `<nav class="bottom-nav">${items.map(i => `
    <div class="nav-item ${i.id === active ? 'active' : ''}" data-page="${i.id}" onclick="Router.navigate('${i.id}')">
      ${i.icon}<span>${i.label}</span>
    </div>`).join('')}</nav>`;
}
