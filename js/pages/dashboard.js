// ============================================================
// NEXO OPS — Dashboard / Painel
// ============================================================
Router.register('dashboard', async (app) => {
  app.innerHTML = `<div class="page"><div class="loading-state"><div class="spinner"></div><p>Carregando painel...</p></div>${buildNavBar('dashboard')}</div>`;

  const res = await API.get('GET_DASHBOARD', { loja_id: Auth.lojaId, dias: 7 });
  if (!res.success) { Utils.toast('Erro ao carregar painel', 'error'); return; }

  const d = res.data;
  const scoreInfo = NEXO.getScoreInfo(d.score);

  app.innerHTML = `
    <div class="page">
      <header class="module-header">
        <div class="module-title" style="margin-left:0"><p class="module-name">Painel de performance</p><p class="module-sub">${Auth.loja.nome}</p></div>
        <div class="period-badge">Últimos ${d.periodo_dias} dias</div>
      </header>
      <div class="module-body">

        <div class="score-card-big" style="border-color:${scoreInfo.color}">
          <div class="score-big-number" style="color:${scoreInfo.color}">${d.score}</div>
          <div class="score-big-info">
            <p class="score-big-label" style="color:${scoreInfo.color}">${scoreInfo.label}</p>
            <p class="score-big-sub">${d.coletas_realizadas} coletas em ${d.periodo_dias} dias</p>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card ${d.disponibilidade.percentual >= 80 ? 'good' : 'bad'}">
            <p class="kpi-label">Disponibilidade</p>
            <p class="kpi-value">${d.disponibilidade.percentual}%</p>
            <p class="kpi-sub">${d.disponibilidade.rupturas} rupturas</p>
          </div>
          <div class="kpi-card ${d.quebra.total_kg <= d.quebra.meta_kg ? 'good' : 'bad'}">
            <p class="kpi-label">Quebra semanal</p>
            <p class="kpi-value">${d.quebra.total_kg}kg</p>
            <p class="kpi-sub">Meta: ${d.quebra.meta_kg}kg</p>
          </div>
          <div class="kpi-card ${d.temperatura.conformidade_pct >= 80 ? 'good' : 'bad'}">
            <p class="kpi-label">Temp. média</p>
            <p class="kpi-value">${d.temperatura.media}°</p>
            <p class="kpi-sub">${d.temperatura.conformidade_pct}% conforme</p>
          </div>
          <div class="kpi-card ${d.presenca.percentual >= 80 ? 'good' : 'neutral'}">
            <p class="kpi-label">Presença</p>
            <p class="kpi-value">${d.presenca.percentual}%</p>
            <p class="kpi-sub">${d.presenca.presentes}/${d.presenca.total}</p>
          </div>
        </div>

        ${d.top_rupturas.length > 0 ? `
        <p class="section-label">Top rupturas da semana</p>
        <div class="ranking-list">
          ${d.top_rupturas.map((r, i) => `
            <div class="ranking-item">
              <span class="ranking-pos ${i === 0 ? 'danger' : 'warning'}">${i + 1}</span>
              <div class="ranking-info">
                <p class="ranking-name">${r.nome}</p>
                <p class="ranking-sub">Ruptura em ${r.dias_ruptura} de ${r.total_dias} dias</p>
              </div>
              <span class="ranking-pct ${r.dias_ruptura / r.total_dias > 0.5 ? 'danger' : 'warning'}">${Math.round(r.dias_ruptura / r.total_dias * 100)}%</span>
            </div>
          `).join('')}
        </div>` : ''}

        <div class="ia-card-dashboard" onclick="Utils.toast('IA disponível em breve!','info')">
          <svg viewBox="0 0 18 18" fill="none" width="20" height="20"><path d="M9 2L11 7H16L12 10.5L13.5 16L9 12.5L4.5 16L6 10.5L2 7H7L9 2Z" stroke="#3498DB" stroke-width="1.2"/></svg>
          <div>
            <p class="ia-dash-title">Analisar com IA</p>
            <p class="ia-dash-sub">Diagnóstico com seus dados reais</p>
          </div>
          <span class="badge-soon">EM BREVE</span>
        </div>

      </div>
      ${buildNavBar('dashboard')}
    </div>
  `;
});
