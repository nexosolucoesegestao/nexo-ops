// ============================================================
// NEXO OPS — Módulo 3: Quebra
// ============================================================
Router.register('quebra', async (app) => {
  const [prodRes, motRes] = await Promise.all([
    API.get('GET_PRODUTOS', { loja_id: Auth.lojaId }),
    API.get('GET_MOTIVOS', {}),
  ]);

  const produtos = prodRes.data || [];
  const motivosQuebra = (motRes.data || []).filter(m => m.CONTEXTO === 'Quebra (Motivo)');
  const destinos = (motRes.data || []).filter(m => m.CONTEXTO === 'Quebra (Destino)');

  let houveQuebra = null;
  const itens = [];

  function render() {
    app.innerHTML = `
      <div class="page">
        <header class="module-header">
          <button class="btn-back" onclick="Router.navigate('home')"><svg viewBox="0 0 18 18" fill="none"><path d="M12 3L6 9L12 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          <div class="module-title"><p class="module-name">Quebra</p><p class="module-sub">Módulo 3 — fechamento</p></div>
          <div class="progress-dots"><span class="dot done"></span><span class="dot done"></span><span class="dot done"></span><span class="dot active"></span><span class="dot"></span></div>
        </header>
        <div class="module-body">
          <p class="label-gold">Houve quebra/perda hoje?</p>
          <div class="toggle-group">
            <button class="toggle-btn ${houveQuebra === true ? 'active danger' : ''}" id="btnSim">Sim, houve perda</button>
            <button class="toggle-btn ${houveQuebra === false ? 'active success' : ''}" id="btnNao">Não, zero perdas</button>
          </div>
          ${houveQuebra === true ? renderItens() : ''}
          ${houveQuebra === true ? '<button class="btn-add" id="btnAddItem">+ Adicionar item de quebra</button>' : ''}
        </div>
        <div class="module-footer">
          <button class="btn-primary btn-full" id="btnSalvarQuebra" ${houveQuebra === null ? 'disabled' : ''}>Próximo</button>
        </div>
      </div>
    `;

    document.getElementById('btnSim').addEventListener('click', () => { houveQuebra = true; if (itens.length === 0) addItem(); render(); });
    document.getElementById('btnNao').addEventListener('click', () => { houveQuebra = false; render(); });
    document.getElementById('btnAddItem')?.addEventListener('click', () => { addItem(); render(); });
    document.getElementById('btnSalvarQuebra').addEventListener('click', salvar);

    // Bind item events
    itens.forEach((item, idx) => {
      document.querySelectorAll(`.prod-chip[data-idx="${idx}"]`).forEach(c => {
        c.addEventListener('click', () => { itens[idx].id_produto = c.dataset.value; itens[idx].nome = c.dataset.nome; render(); });
      });
      document.querySelectorAll(`.motivo-chip[data-idx="${idx}"]`).forEach(c => {
        c.addEventListener('click', () => { itens[idx].motivo = c.dataset.value; render(); });
      });
      document.querySelectorAll(`.destino-chip[data-idx="${idx}"]`).forEach(c => {
        c.addEventListener('click', () => { itens[idx].destino = c.dataset.value; render(); });
      });
      const pesoInput = document.getElementById(`peso_${idx}`);
      if (pesoInput) pesoInput.addEventListener('input', (e) => { itens[idx].peso_kg = e.target.value; });
      const removeBtn = document.getElementById(`remove_${idx}`);
      if (removeBtn) removeBtn.addEventListener('click', () => { itens.splice(idx, 1); render(); });
    });
  }

  function addItem() {
    itens.push({ id_produto: '', nome: '', peso_kg: '', motivo: '', destino: '' });
  }

  function renderItens() {
    return itens.map((item, idx) => `
      <div class="quebra-item">
        <div class="quebra-item-header">
          <span class="quebra-num">#${idx + 1}</span>
          <button class="btn-remove" id="remove_${idx}">Remover</button>
        </div>
        <p class="label-sub">Produto</p>
        <div class="chip-group scroll">${produtos.map(p =>
          `<span class="chip prod-chip ${item.id_produto === p.ID_PRODUTO ? 'selected' : ''}" data-idx="${idx}" data-value="${p.ID_PRODUTO}" data-nome="${p.CORTE_PAI}">${p.CORTE_PAI}</span>`
        ).join('')}</div>
        <p class="label-sub">Peso da perda (kg)</p>
        <input type="number" id="peso_${idx}" class="input-dark" value="${item.peso_kg}" placeholder="Ex: 1.5" step="0.1" min="0.1">
        <p class="label-sub">Motivo</p>
        <div class="chip-group">${motivosQuebra.map(m =>
          `<span class="chip motivo-chip ${item.motivo === m.MOTIVO ? 'selected' : ''}" data-idx="${idx}" data-value="${m.MOTIVO}">${m.MOTIVO}</span>`
        ).join('')}</div>
        <p class="label-sub">Destino</p>
        <div class="chip-group">${destinos.map(d =>
          `<span class="chip destino-chip ${item.destino === d.MOTIVO ? 'selected' : ''}" data-idx="${idx}" data-value="${d.MOTIVO}">${d.MOTIVO}</span>`
        ).join('')}</div>
      </div>
    `).join('');
  }

  async function salvar() {
    const btn = document.getElementById('btnSalvarQuebra');
    btn.disabled = true; btn.textContent = 'Salvando...';

    if (houveQuebra === false) {
      markModuleComplete('quebra');
      Utils.toast('Nenhuma quebra registrada!', 'success');
      Router.navigate('home');
      return;
    }

    const valid = itens.every(i => i.id_produto && i.peso_kg && i.motivo && i.destino);
    if (!valid) {
      Utils.toast('Preencha todos os campos de cada item', 'warning');
      btn.disabled = false; btn.textContent = 'Próximo';
      return;
    }

    const regId = Utils.getRegistroHoje();
    const r = await API.post('SAVE_QUEBRA', { id_registro: regId, itens, id_loja: Auth.lojaId }, { loja_id: Auth.lojaId });

    if (r.success || r.queued) {
      markModuleComplete('quebra');
      Utils.toast('Quebra salva!', 'success');
      Router.navigate('home');
    } else {
      Utils.toast(r.error || 'Erro', 'error');
      btn.disabled = false; btn.textContent = 'Próximo';
    }
  }

  render();
});
