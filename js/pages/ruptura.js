// ============================================================
// NEXO OPS — Módulo 2: Ruptura / Disponibilidade
// ============================================================
Router.register('ruptura', async (app) => {
  app.innerHTML = `<div class="page"><div class="loading-state"><div class="spinner"></div><p>Carregando produtos...</p></div></div>`;

  const [prodRes, motRes] = await Promise.all([
    API.get('GET_PRODUTOS', { loja_id: Auth.lojaId }),
    API.get('GET_MOTIVOS', {}),
  ]);

  if (!prodRes.success) { Utils.toast('Erro ao carregar produtos', 'error'); Router.navigate('home'); return; }

  const produtos = prodRes.data;
  const motivosRuptura = (motRes.data || []).filter(m => m.CONTEXTO === 'Ruptura (Estoque)');
  const motivosIndisponibilidade = (motRes.data || []).filter(m => m.CONTEXTO === 'Indisponibilidade (AT/AS)');

  const state = {};
  produtos.forEach(p => {
    state[p.ID_PRODUTO] = {
      tem_estoque: 'SIM', motivo_ruptura: '',
      disponivel_at: 'SIM', motivo_at: '',
      disponivel_as: 'SIM', motivo_as: '',
    };
  });

  let fotoAtBase64 = null, fotoAsBase64 = null;

  function render() {
    const rupturas = Object.values(state).filter(s => s.tem_estoque === 'NÃO').length;
    const parciais = Object.values(state).filter(s => s.tem_estoque === 'SIM' && (s.disponivel_at === 'NÃO' || s.disponivel_as === 'NÃO')).length;
    const ok = produtos.length - rupturas - parciais;

    app.innerHTML = `
      <div class="page">
        <header class="module-header">
          <button class="btn-back" onclick="Router.navigate('home')"><svg viewBox="0 0 18 18" fill="none"><path d="M12 3L6 9L12 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          <div class="module-title"><p class="module-name">Ruptura / disponibilidade</p><p class="module-sub">Módulo 2 — manhã</p></div>
          <div class="progress-dots"><span class="dot done"></span><span class="dot done"></span><span class="dot active"></span><span class="dot"></span><span class="dot"></span></div>
        </header>
        <div class="module-body">
          <p class="label-sub">Para cada corte: tem estoque? Está no AT? Está no AS?</p>
          <div id="produtosList"></div>

          <div class="foto-row">
            <div class="foto-mini" onclick="document.getElementById('fotoAtInput').click()">
              ${fotoAtBase64 ? `<img src="data:image/jpeg;base64,${fotoAtBase64}">` : '<svg viewBox="0 0 18 18" fill="none"><rect x="2" y="4" width="14" height="10" rx="2" stroke="#C5A35A" stroke-width="1"/><circle cx="9" cy="9" r="3" stroke="#C5A35A" stroke-width="1"/></svg><p>Foto AT</p>'}
            </div>
            <div class="foto-mini" onclick="document.getElementById('fotoAsInput').click()">
              ${fotoAsBase64 ? `<img src="data:image/jpeg;base64,${fotoAsBase64}">` : '<svg viewBox="0 0 18 18" fill="none"><rect x="2" y="4" width="14" height="10" rx="2" stroke="#C5A35A" stroke-width="1"/><circle cx="9" cy="9" r="3" stroke="#C5A35A" stroke-width="1"/></svg><p>Foto AS</p>'}
            </div>
          </div>
          <input type="file" id="fotoAtInput" accept="image/*" capture="environment" style="display:none">
          <input type="file" id="fotoAsInput" accept="image/*" capture="environment" style="display:none">
        </div>
        <div class="module-footer">
          <div class="footer-info"><p>${produtos.length} cortes — ${ok} OK / ${rupturas} ruptura / ${parciais} parcial</p></div>
          <button class="btn-primary" id="btnSalvarRuptura">Próximo</button>
        </div>
      </div>
    `;

    const list = document.getElementById('produtosList');
    const grouped = {};
    produtos.forEach(p => {
      if (!grouped[p.PROTEINA]) grouped[p.PROTEINA] = [];
      grouped[p.PROTEINA].push(p);
    });

    Object.entries(grouped).forEach(([proteina, prods]) => {
      const group = document.createElement('div');
      group.className = 'proteina-group';
      group.innerHTML = `<p class="proteina-label">${proteina}</p>`;

      prods.forEach(p => {
        const s = state[p.ID_PRODUTO];
        const statusClass = s.tem_estoque === 'NÃO' ? 'ruptura' : (s.disponivel_at === 'NÃO' || s.disponivel_as === 'NÃO') ? 'parcial' : 'ok';

        const card = document.createElement('div');
        card.className = `prod-card ${statusClass}`;
        card.innerHTML = buildProdCard(p, s);
        group.appendChild(card);
      });

      list.appendChild(group);
    });

    bindEvents();
  }

  function buildProdCard(produto, s) {
    const id = produto.ID_PRODUTO;
    const statusLabel = s.tem_estoque === 'NÃO' ? 'RUPTURA' : (s.disponivel_at === 'NÃO' || s.disponivel_as === 'NÃO') ? 'PARCIAL' : 'OK';
    const statusClass = statusLabel.toLowerCase();

    let html = `
      <div class="prod-header">
        <span class="prod-name">${produto.CORTE_PAI}</span>
        <span class="badge-status ${statusClass}">${statusLabel}</span>
      </div>
      <div class="prod-checks">
        <div class="check-item ${s.tem_estoque === 'SIM' ? 'yes' : 'no'}" data-id="${id}" data-field="tem_estoque">
          <span class="check-box">${s.tem_estoque === 'SIM' ? '✓' : '✗'}</span><span>Estoque</span>
        </div>`;

    if (s.tem_estoque === 'SIM') {
      html += `
        <div class="check-item ${s.disponivel_at === 'SIM' ? 'yes' : 'no'}" data-id="${id}" data-field="disponivel_at">
          <span class="check-box">${s.disponivel_at === 'SIM' ? '✓' : '✗'}</span><span>AT</span>
        </div>
        <div class="check-item ${s.disponivel_as === 'SIM' ? 'yes' : 'no'}" data-id="${id}" data-field="disponivel_as">
          <span class="check-box">${s.disponivel_as === 'SIM' ? '✓' : '✗'}</span><span>AS</span>
        </div>`;
    } else {
      html += `<div class="check-item disabled"><span class="check-box">—</span><span>AT</span></div>
               <div class="check-item disabled"><span class="check-box">—</span><span>AS</span></div>`;
    }
    html += `</div>`;

    // Motivos condicionais
    if (s.tem_estoque === 'NÃO') {
      html += `<div class="motivo-area"><p class="motivo-label">Motivo da ruptura:</p><div class="chip-group">`;
      motivosRuptura.forEach(m => {
        html += `<span class="chip ${s.motivo_ruptura === m.MOTIVO ? 'selected' : ''}" data-id="${id}" data-field="motivo_ruptura" data-value="${m.MOTIVO}">${m.MOTIVO}</span>`;
      });
      html += `</div></div>`;
    }

    if (s.tem_estoque === 'SIM' && s.disponivel_at === 'NÃO') {
      html += `<div class="motivo-area"><p class="motivo-label">Por que não está no AT?</p><div class="chip-group">`;
      motivosIndisponibilidade.forEach(m => {
        html += `<span class="chip ${s.motivo_at === m.MOTIVO ? 'selected' : ''}" data-id="${id}" data-field="motivo_at" data-value="${m.MOTIVO}">${m.MOTIVO}</span>`;
      });
      html += `</div></div>`;
    }

    if (s.tem_estoque === 'SIM' && s.disponivel_as === 'NÃO') {
      html += `<div class="motivo-area"><p class="motivo-label">Por que não está no AS?</p><div class="chip-group">`;
      motivosIndisponibilidade.forEach(m => {
        html += `<span class="chip ${s.motivo_as === m.MOTIVO ? 'selected' : ''}" data-id="${id}" data-field="motivo_as" data-value="${m.MOTIVO}">${m.MOTIVO}</span>`;
      });
      html += `</div></div>`;
    }

    return html;
  }

  function bindEvents() {
    document.querySelectorAll('.check-item:not(.disabled)').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id, field = el.dataset.field;
        state[id][field] = state[id][field] === 'SIM' ? 'NÃO' : 'SIM';
        if (field === 'tem_estoque' && state[id].tem_estoque === 'NÃO') {
          state[id].disponivel_at = ''; state[id].disponivel_as = '';
          state[id].motivo_at = ''; state[id].motivo_as = '';
        }
        if (field === 'tem_estoque' && state[id].tem_estoque === 'SIM') {
          state[id].disponivel_at = 'SIM'; state[id].disponivel_as = 'SIM';
          state[id].motivo_ruptura = '';
        }
        render();
      });
    });

    document.querySelectorAll('.chip[data-field]').forEach(el => {
      el.addEventListener('click', () => {
        state[el.dataset.id][el.dataset.field] = el.dataset.value;
        render();
      });
    });

    document.getElementById('fotoAtInput')?.addEventListener('change', async (e) => {
      if (e.target.files[0]) {
        const c = await Utils.compressPhoto(e.target.files[0]);
        fotoAtBase64 = c.base64;
        render();
      }
    });

    document.getElementById('fotoAsInput')?.addEventListener('change', async (e) => {
      if (e.target.files[0]) {
        const c = await Utils.compressPhoto(e.target.files[0]);
        fotoAsBase64 = c.base64;
        render();
      }
    });

    document.getElementById('btnSalvarRuptura').addEventListener('click', salvar);
  }

  async function salvar() {
    const btn = document.getElementById('btnSalvarRuptura');
    btn.disabled = true; btn.textContent = 'Salvando...';

    const prodPayload = Object.entries(state).map(([id, s]) => ({
      id_produto: id,
      tem_estoque: s.tem_estoque || 'SIM',
      motivo_ruptura: s.motivo_ruptura || '',
      disponivel_at: s.disponivel_at || '',
      motivo_indisponivel_at: s.motivo_at || '',
      disponivel_as: s.disponivel_as || '',
      motivo_indisponivel_as: s.motivo_as || '',
    }));

    const regId = Utils.getRegistroHoje();
    const r = await API.post('SAVE_DISPONIBILIDADE', {
      id_registro: regId, produtos: prodPayload, id_loja: Auth.lojaId
    }, { loja_id: Auth.lojaId });

    if (r.success || r.queued) {
      // Upload fotos em background
      if (fotoAtBase64) Utils.uploadFoto(fotoAtBase64, 'ruptura_at');
      if (fotoAsBase64) Utils.uploadFoto(fotoAsBase64, 'ruptura_as');

      markModuleComplete('ruptura');
      Utils.toast('Disponibilidade salva!', 'success');
      Router.navigate('home');
    } else {
      Utils.toast(r.error || 'Erro', 'error');
      btn.disabled = false; btn.textContent = 'Próximo';
    }
  }

  render();
});
