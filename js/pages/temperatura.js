// ============================================================
// NEXO OPS — Módulo 4: Temperatura
// ============================================================
Router.register('temperatura', (app) => {
  app.innerHTML = `
    <div class="page">
      <header class="module-header">
        <button class="btn-back" onclick="Router.navigate('home')"><svg viewBox="0 0 18 18" fill="none"><path d="M12 3L6 9L12 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <div class="module-title"><p class="module-name">Temperatura</p><p class="module-sub">Módulo 4 — cadeia do frio</p></div>
        <div class="progress-dots"><span class="dot done"></span><span class="dot done"></span><span class="dot done"></span><span class="dot done"></span><span class="dot active"></span></div>
      </header>
      <div class="module-body">
        <p class="label-gold">3 leituras da cadeia do frio</p>
        <p class="label-sub">Digite a temperatura que o termômetro mostra</p>

        <div class="temp-card" id="tempBalcao">
          <div class="temp-header">
            <svg viewBox="0 0 16 16" fill="none" width="18" height="18"><rect x="6" y="2" width="4" height="12" rx="2" stroke="#C5A35A" stroke-width="1"/></svg>
            <span>Balcão refrigerado</span>
            <span class="temp-faixa">0°C a 4°C</span>
          </div>
          <div class="temp-input-row">
            <input type="number" id="inputBalcao" class="temp-input" placeholder="0.0" step="0.1">
            <span class="temp-unit">°C</span>
            <span class="temp-flag" id="flagBalcao"></span>
          </div>
        </div>

        <div class="temp-card" id="tempResf">
          <div class="temp-header">
            <svg viewBox="0 0 16 16" fill="none" width="18" height="18"><rect x="2" y="2" width="12" height="12" rx="2" stroke="#3498DB" stroke-width="1"/><path d="M5 8H11" stroke="#3498DB" stroke-width="1"/></svg>
            <span>Câmara fria — resfriados</span>
            <span class="temp-faixa">0°C a 4°C</span>
          </div>
          <div class="temp-input-row">
            <input type="number" id="inputResf" class="temp-input" placeholder="0.0" step="0.1">
            <span class="temp-unit">°C</span>
            <span class="temp-flag" id="flagResf"></span>
          </div>
        </div>

        <div class="temp-card" id="tempCong">
          <div class="temp-header">
            <svg viewBox="0 0 16 16" fill="none" width="18" height="18"><rect x="2" y="2" width="12" height="12" rx="2" stroke="#9B59B6" stroke-width="1"/><path d="M8 4V12M4 8H12" stroke="#9B59B6" stroke-width=".8"/></svg>
            <span>Câmara fria — congelados</span>
            <span class="temp-faixa">≤ -18°C</span>
          </div>
          <div class="temp-input-row">
            <input type="number" id="inputCong" class="temp-input" placeholder="-18.0" step="0.1">
            <span class="temp-unit">°C</span>
            <span class="temp-flag" id="flagCong"></span>
          </div>
        </div>

        <div class="info-box" id="alertBox" style="display:none">
          <svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="#E74C3C" stroke-width="1"/><line x1="7" y1="4" x2="7" y2="8" stroke="#E74C3C" stroke-width="1" stroke-linecap="round"/><circle cx="7" cy="10" r=".6" fill="#E74C3C"/></svg>
          <p id="alertText"></p>
        </div>
      </div>
      <div class="module-footer">
        <button class="btn-primary btn-full" id="btnSalvarTemp" disabled>Finalizar coleta</button>
      </div>
    </div>
  `;

  const inputs = ['inputBalcao', 'inputResf', 'inputCong'];
  const flags = ['flagBalcao', 'flagResf', 'flagCong'];
  const types = ['balcao', 'resfriados', 'congelados'];

  inputs.forEach((inputId, i) => {
    document.getElementById(inputId).addEventListener('input', () => {
      const val = parseFloat(document.getElementById(inputId).value);
      const flagEl = document.getElementById(flags[i]);
      const card = document.getElementById(inputId).closest('.temp-card');

      if (isNaN(val)) {
        flagEl.textContent = '';
        flagEl.className = 'temp-flag';
        card.className = 'temp-card';
        return;
      }

      const status = Utils.tempFlag(val, types[i]);
      if (status === 'conforme') {
        flagEl.textContent = 'CONFORME';
        flagEl.className = 'temp-flag conforme';
        card.className = 'temp-card conforme';
      } else {
        flagEl.textContent = 'NÃO CONFORME';
        flagEl.className = 'temp-flag nao-conforme';
        card.className = 'temp-card nao-conforme';
      }

      checkAllFilled();
    });
  });

  function checkAllFilled() {
    const allFilled = inputs.every(id => document.getElementById(id).value !== '');
    document.getElementById('btnSalvarTemp').disabled = !allFilled;

    if (allFilled) {
      const alertas = [];
      inputs.forEach((id, i) => {
        const val = parseFloat(document.getElementById(id).value);
        if (Utils.tempFlag(val, types[i]) === 'nao-conforme') {
          const faixa = NEXO.TEMP_FAIXAS[types[i]];
          alertas.push(`${faixa.label}: ${val}°C`);
        }
      });

      const alertBox = document.getElementById('alertBox');
      if (alertas.length > 0) {
        alertBox.style.display = 'flex';
        alertBox.className = 'info-box danger';
        document.getElementById('alertText').textContent = 'Temperaturas fora da faixa: ' + alertas.join(' | ');
      } else {
        alertBox.style.display = 'flex';
        alertBox.className = 'info-box success';
        document.getElementById('alertText').textContent = 'Todas as temperaturas dentro da faixa!';
      }
    }
  }

  document.getElementById('btnSalvarTemp').addEventListener('click', async () => {
    const btn = document.getElementById('btnSalvarTemp');
    btn.disabled = true; btn.textContent = 'Salvando...';

    const regId = Utils.getRegistroHoje();
    const r = await API.post('SAVE_TEMPERATURA', {
      id_registro: regId,
      balcao: document.getElementById('inputBalcao').value,
      camara_resfriados: document.getElementById('inputResf').value,
      camara_congelados: document.getElementById('inputCong').value,
      id_loja: Auth.lojaId,
    }, { loja_id: Auth.lojaId });

    if (r.success || r.queued) {
      markModuleComplete('temperatura');

      // Checkout automático (último módulo)
      if (regId) {
        await API.post('SAVE_CHECKOUT', { id_registro: regId, hora_checkout: Utils.getHoraAtual() }, { loja_id: Auth.lojaId });
      }

      if (r.alertas && r.alertas.length > 0) {
        Utils.toast('Salvo! Atenção: ' + r.alertas.length + ' alerta(s) de temperatura', 'warning', 4000);
      } else {
        Utils.toast('Coleta finalizada! Todos os módulos completos.', 'success', 4000);
      }
      Router.navigate('home');
    } else {
      Utils.toast(r.error || 'Erro', 'error');
      btn.disabled = false; btn.textContent = 'Finalizar coleta';
    }
  });
});
