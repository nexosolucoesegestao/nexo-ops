// ============================================================
// NEXO OPS — Módulo 1: Quadro de Pessoal
// ============================================================
Router.register('pessoal', async (app) => {
  app.innerHTML = `<div class="page"><div class="loading-state"><div class="spinner"></div><p>Carregando equipe...</p></div></div>`;

  const res = await API.get('GET_PESSOAS', { loja_id: Auth.lojaId });
  if (!res.success) { Utils.toast('Erro ao carregar equipe', 'error'); Router.navigate('home'); return; }

  const { setor, terceiros } = res.data;
  const presencaState = {};
  setor.forEach(p => { presencaState[p.ID_PESSOA] = { presente: 'SIM', motivo: '', hora: Utils.getHoraAtual() }; });
  terceiros.forEach(p => { presencaState[p.ID_PESSOA] = { presente: 'SIM', motivo: '', hora: Utils.getHoraAtual() }; });

  function render() {
    const presentesSetor = Object.entries(presencaState).filter(([id]) => setor.find(s => s.ID_PESSOA === id)).filter(([,v]) => v.presente === 'SIM').length;

    app.innerHTML = `
      <div class="page">
        <header class="module-header">
          <button class="btn-back" onclick="Router.navigate('home')"><svg viewBox="0 0 18 18" fill="none"><path d="M12 3L6 9L12 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          <div class="module-title"><p class="module-name">Quadro de pessoal</p><p class="module-sub">Módulo 1 — abertura</p></div>
          <div class="progress-dots"><span class="dot done"></span><span class="dot active"></span><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
        </header>
        <div class="module-body">
          <p class="label-gold">Equipe do setor</p>
          <p class="label-sub">Escala prevista: ${setor.length} funcionários</p>
          <div class="person-list" id="setorList"></div>

          <div class="section-divider">
            <p class="label-gold">Terceiros / promotores</p>
            <button class="btn-sm gold" id="btnCadastrar">+ Cadastrar novo</button>
          </div>
          <div class="person-list" id="terceirosList"></div>
          <div id="cadastroArea"></div>
        </div>
        <div class="module-footer">
          <div class="footer-info">
            <p>Setor: ${presentesSetor}/${setor.length} — Terceiros: ${Object.entries(presencaState).filter(([id]) => terceiros.find(t => t.ID_PESSOA === id)).filter(([,v]) => v.presente === 'SIM').length}</p>
          </div>
          <button class="btn-primary" id="btnSalvarPresenca">Próximo</button>
        </div>
      </div>
    `;

    // Render setor
    const setorList = document.getElementById('setorList');
    setor.forEach(p => renderPersonCard(setorList, p, 'setor'));

    // Render terceiros
    const tercList = document.getElementById('terceirosList');
    terceiros.forEach(p => renderPersonCard(tercList, p, 'terceiro'));

    // Cadastro rápido
    document.getElementById('btnCadastrar').addEventListener('click', showCadastro);

    // Salvar
    document.getElementById('btnSalvarPresenca').addEventListener('click', salvar);
  }

  function renderPersonCard(container, pessoa, tipo) {
    const state = presencaState[pessoa.ID_PESSOA];
    const isPresente = state.presente === 'SIM';
    const card = document.createElement('div');
    card.className = `person-card ${isPresente ? 'presente' : 'ausente'}`;

    const initials = pessoa.NOME.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const marca = tipo === 'terceiro' && pessoa.MARCA_TERCEIRO ? `<span class="badge-marca">${pessoa.MARCA_TERCEIRO}</span>` : '';

    card.innerHTML = `
      <div class="person-avatar ${tipo}">${initials}</div>
      <div class="person-info">
        <p class="person-name">${pessoa.NOME}</p>
        <p class="person-role">${marca}${pessoa.CARGO} — ${pessoa.TURNO || ''}</p>
      </div>
      <div class="presence-toggle ${isPresente ? 'on' : 'off'}" data-id="${pessoa.ID_PESSOA}">
        ${isPresente ? '✓' : '✗'}
      </div>
    `;

    // Motivo de ausência
    if (!isPresente) {
      const motivoDiv = document.createElement('div');
      motivoDiv.className = 'ausencia-motivos';
      const motivos = ['Atestado médico', 'Falta injustificada', 'Folga', 'Férias', 'Remanejado'];
      motivoDiv.innerHTML = motivos.map(m =>
        `<span class="chip ${state.motivo === m ? 'selected' : ''}" data-motivo="${m}" data-pessoa="${pessoa.ID_PESSOA}">${m}</span>`
      ).join('');
      card.appendChild(motivoDiv);

      motivoDiv.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
          presencaState[pessoa.ID_PESSOA].motivo = chip.dataset.motivo;
          render();
        });
      });
    }

    card.querySelector('.presence-toggle').addEventListener('click', () => {
      presencaState[pessoa.ID_PESSOA].presente = isPresente ? 'NÃO' : 'SIM';
      presencaState[pessoa.ID_PESSOA].motivo = '';
      render();
    });

    container.appendChild(card);
  }

  function showCadastro() {
    const area = document.getElementById('cadastroArea');
    const marcas = ['Seara', 'Sadia', 'Friboi', 'Perdigão', 'Aurora', 'Outra'];
    area.innerHTML = `
      <div class="cadastro-rapido">
        <p class="label-gold">Cadastro rápido de promotor</p>
        <div class="input-group dark"><label>Nome completo</label><input type="text" id="novoNome" placeholder="Ex: Maria Souza"></div>
        <div class="input-group dark">
          <label>Marca que representa</label>
          <div class="chip-group" id="marcaChips">${marcas.map(m => `<span class="chip" data-marca="${m}">${m}</span>`).join('')}</div>
        </div>
        <div class="input-group dark"><label>Telefone (opcional)</label><input type="tel" id="novoTel" placeholder="(11) 99999-0000"></div>
        <button class="btn-primary btn-full" id="btnSalvarPessoa">Salvar e marcar presente</button>
      </div>
    `;

    let marcaSel = '';
    area.querySelectorAll('#marcaChips .chip').forEach(c => {
      c.addEventListener('click', () => {
        area.querySelectorAll('#marcaChips .chip').forEach(x => x.classList.remove('selected'));
        c.classList.add('selected');
        marcaSel = c.dataset.marca;
      });
    });

    document.getElementById('btnSalvarPessoa').addEventListener('click', async () => {
      const nome = document.getElementById('novoNome').value.trim();
      if (!nome) { Utils.toast('Nome obrigatório', 'warning'); return; }
      if (!marcaSel) { Utils.toast('Selecione a marca', 'warning'); return; }

      const btn = document.getElementById('btnSalvarPessoa');
      btn.disabled = true; btn.textContent = 'Salvando...';

      const r = await API.post('SAVE_PESSOA', {
        nome, tipo: 'TERCEIRO', cargo: 'Promotor',
        id_loja: Auth.lojaId, marca: marcaSel,
        telefone: document.getElementById('novoTel').value.trim(),
      });

      if (r.success) {
        const novaPessoa = { ID_PESSOA: r.data.id_pessoa, NOME: nome, TIPO: 'TERCEIRO', CARGO: 'Promotor', MARCA_TERCEIRO: marcaSel, TURNO: 'Manhã' };
        terceiros.push(novaPessoa);
        presencaState[novaPessoa.ID_PESSOA] = { presente: 'SIM', motivo: '', hora: Utils.getHoraAtual() };
        Utils.toast('Promotor cadastrado!', 'success');
        render();
      } else {
        Utils.toast(r.error || 'Erro ao cadastrar', 'error');
        btn.disabled = false; btn.textContent = 'Salvar e marcar presente';
      }
    });
  }

  async function salvar() {
    const btn = document.getElementById('btnSalvarPresenca');
    btn.disabled = true; btn.textContent = 'Salvando...';

    const registros = Object.entries(presencaState).map(([id, state]) => ({
      id_pessoa: id, presente: state.presente,
      motivo: state.motivo, hora_chegada: state.presente === 'SIM' ? state.hora : '',
    }));

    const regId = Utils.getRegistroHoje();
    const r = await API.post('SAVE_PRESENCA', { id_registro: regId, registros }, { loja_id: Auth.lojaId });

    if (r.success || r.queued) {
      markModuleComplete('pessoal');
      Utils.toast('Presenças salvas!', 'success');
      Router.navigate('home');
    } else {
      Utils.toast(r.error || 'Erro', 'error');
      btn.disabled = false; btn.textContent = 'Próximo';
    }
  }

  render();
});
