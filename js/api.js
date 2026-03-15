// ============================================================
// NEXO OPS — API Layer (Supabase REST)
// Comunicação direta via REST API — sem Apps Script
// ============================================================
const API = {
  _cache: {},
  _cacheTTL: {},
  _queue: [],
  _online: navigator.onLine,

  // ---- MAPPERS: Supabase lowercase → Frontend UPPERCASE ----
  // Camada de compatibilidade para que NENHUMA página precise mudar.
  // Supabase retorna snake_case lowercase; as páginas esperam MAIÚSCULAS.
  _mapProduto(p) {
    if (!p) return p;
    p.ID_PRODUTO = p.id;
    p.PROTEINA = p.proteina;
    p.CORTE_PAI = p.corte_pai;
    p.CLASSIFICACAO = p.classificacao;
    return p;
  },
  _mapPessoa(p) {
    if (!p) return p;
    p.ID_PESSOA = p.id;
    p.NOME = p.nome;
    p.TIPO = p.tipo;
    p.CARGO = p.cargo;
    p.TURNO = p.turno;
    p.MARCA_TERCEIRO = p.marca_terceiro;
    return p;
  },
  _mapMotivo(m) {
    if (!m) return m;
    m.CONTEXTO = m.contexto;
    m.MOTIVO = m.motivo;
    return m;
  },
  _mapOcorrencia(oc) {
    if (!oc) return oc;
    oc.ID_OCORRENCIA = oc.id;
    oc.TIPO = oc.tipo;
    oc.STATUS = oc.status;
    oc.DATA_ABERTURA = oc.data_abertura;
    oc.DATA_RESOLUCAO = oc.data_resolucao;
    oc.MOTIVO_RESOLUCAO = oc.motivo_resolucao;
    oc.DADOS_ACUMULADOS = oc.dados_acumulados;
    if (oc.acoes) {
      oc.acoes = oc.acoes.map(function(a) {
        a.DATA = a.data || a.created_at;
        a.ACAO_TOMADA = a.acao_tomada;
        return a;
      });
    }
    return oc;
  },
  _mapAcaoPredefinida(a) {
    if (!a) return a;
    a.TIPO_OCORRENCIA = a.tipo_ocorrencia;
    a.ACAO = a.acao;
    return a;
  },

  _headers() {
    return {
      'apikey': NEXO.SUPABASE_KEY,
      'Authorization': 'Bearer ' + NEXO.SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  },

  _url(table, query) {
    return NEXO.SUPABASE_URL + '/rest/v1/' + table + (query ? '?' + query : '');
  },

  init() {
    window.addEventListener('online', function() { API._online = true; API._flushQueue(); });
    window.addEventListener('offline', function() { API._online = false; });
    this._loadQueue();
  },

  // ---- OPERAÇÕES GENÉRICAS ----
  async select(table, params, cacheMin) {
    var cacheKey = table + '_' + JSON.stringify(params || {});
    if (cacheMin && this._cache[cacheKey] && this._cacheTTL[cacheKey] > Date.now()) {
      return { success: true, data: this._cache[cacheKey] };
    }

    var query = '';
    if (params) {
      var parts = [];
      Object.entries(params).forEach(function(e) { parts.push(e[0] + '=' + e[1]); });
      query = parts.join('&');
    }

    try {
      var res = await fetch(this._url(table, query), { method: 'GET', headers: this._headers() });
      if (!res.ok) { var err = await res.json(); return { success: false, error: err.message || 'Erro ' + res.status }; }
      var data = await res.json();
      if (cacheMin) { this._cache[cacheKey] = data; this._cacheTTL[cacheKey] = Date.now() + (cacheMin * 60000); }
      return { success: true, data: data };
    } catch (err) {
      if (this._cache[cacheKey]) return { success: true, data: this._cache[cacheKey] };
      return { success: false, error: 'Sem conexão', offline: true };
    }
  },

  async insert(table, row) {
    if (!this._online) { this._enqueue({ op: 'insert', table: table, row: row }); return { success: true, queued: true, message: 'Salvo localmente.' }; }
    try {
      var res = await fetch(this._url(table), { method: 'POST', headers: this._headers(), body: JSON.stringify(row) });
      if (!res.ok) { var err = await res.json(); return { success: false, error: err.message || err.details || 'Erro ' + res.status }; }
      var data = await res.json();
      return { success: true, data: data[0] || data };
    } catch (err) {
      this._enqueue({ op: 'insert', table: table, row: row });
      return { success: true, queued: true, message: 'Erro de rede. Salvo localmente.' };
    }
  },

  async update(table, match, updates) {
    var query = Object.entries(match).map(function(e) { return e[0] + '=eq.' + encodeURIComponent(e[1]); }).join('&');
    try {
      var res = await fetch(this._url(table, query), { method: 'PATCH', headers: this._headers(), body: JSON.stringify(updates) });
      if (!res.ok) { var err = await res.json(); return { success: false, error: err.message || 'Erro ' + res.status }; }
      return { success: true };
    } catch (err) { return { success: false, error: 'Sem conexão' }; }
  },

  async deleteRows(table, match) {
    var query = Object.entries(match).map(function(e) { return e[0] + '=eq.' + encodeURIComponent(e[1]); }).join('&');
    try {
      var res = await fetch(this._url(table, query), { method: 'DELETE', headers: this._headers() });
      return { success: res.ok };
    } catch (err) { return { success: false }; }
  },

  async upsert(table, row, conflictColumn) {
    var headers = this._headers();
    headers['Prefer'] = 'resolution=merge-duplicates,return=representation';
    try {
      var res = await fetch(this._url(table), { method: 'POST', headers: headers, body: JSON.stringify(row) });
      if (!res.ok) { var err = await res.json(); return { success: false, error: err.message || 'Erro' }; }
      var data = await res.json();
      return { success: true, data: data[0] || data };
    } catch (err) { return { success: false, error: 'Sem conexão' }; }
  },

  // ---- QUERIES ESPECÍFICAS DO NEXO ----

  async login(usuario) {
    var nomeFormatado = usuario.toLowerCase().trim();
    var res = await this.select('pessoas', { 'select': '*', 'status': 'eq.ATIVO', 'order': 'nome' });
    if (!res.success) return { success: false, error: 'Erro ao conectar' };

    var user = null;
    for (var i = 0; i < res.data.length; i++) {
      var p = res.data[i];
      var nomeNorm = p.nome.toLowerCase().replace(/\s+/g, '.').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (nomeNorm === nomeFormatado || p.id.toLowerCase() === nomeFormatado) { user = p; break; }
    }
    if (!user) return { success: false, error: 'Usuário não encontrado' };

    var lojaRes = await this.select('lojas', { 'id': 'eq.' + user.loja_id });
    if (!lojaRes.success || lojaRes.data.length === 0) return { success: false, error: 'Loja não vinculada' };
    var loja = lojaRes.data[0];

    return {
      success: true,
      data: {
        usuario: { id: user.id, nome: user.nome, tipo: user.tipo, cargo: user.cargo },
        loja: { id: loja.id, nome: loja.nome, rede: loja.rede, cidade: loja.cidade, uf: loja.uf }
      }
    };
  },

  async getProdutosLoja(lojaId) {
    var res = await this.select('loja_produtos', { 'select': 'produto_id,produtos(*)', 'loja_id': 'eq.' + lojaId }, 60);
    if (!res.success) return res;
    var produtos = res.data.map(function(lp) { return lp.produtos; }).filter(Boolean).map(API._mapProduto);
    return { success: true, data: produtos };
  },

  async getPessoasLoja(lojaId) {
    var res = await this.select('pessoas', { 'loja_id': 'eq.' + lojaId, 'status': 'eq.ATIVO', 'order': 'tipo,nome' }, 30);
    if (!res.success) return res;
    return {
      success: true,
      data: {
        setor: res.data.filter(function(p) { return p.tipo === 'SETOR'; }).map(API._mapPessoa),
        terceiros: res.data.filter(function(p) { return p.tipo === 'TERCEIRO'; }).map(API._mapPessoa)
      }
    };
  },

  async getMotivos(contexto) {
    var params = { 'select': '*' };
    if (contexto) params['contexto'] = 'eq.' + contexto;
    var res = await this.select('motivos', params, 60);
    if (res.success && res.data) res.data = res.data.map(API._mapMotivo);
    return res;
  },

  async getAcoesPredefinidas(tipo) {
    var params = { 'select': '*' };
    if (tipo) params['tipo_ocorrencia'] = 'eq.' + tipo;
    var res = await this.select('acoes_predefinidas', params, 60);
    if (res.success && res.data) res.data = res.data.map(API._mapAcaoPredefinida);
    return res;
  },

  async getDadosDia(lojaId, data) {
    var regRes = await this.select('registros', { 'loja_id': 'eq.' + lojaId, 'data': 'eq.' + data });
    if (!regRes.success || regRes.data.length === 0) {
      return { success: true, data: { registro: null, presenca: [], disponibilidade: [], quebra: [], temperatura: null } };
    }
    var reg = regRes.data[0];
    var regId = reg.id;

    var results = await Promise.all([
      this.select('presenca', { 'registro_id': 'eq.' + regId }),
      this.select('disponibilidade', { 'registro_id': 'eq.' + regId }),
      this.select('quebra', { 'registro_id': 'eq.' + regId }),
      this.select('temperatura', { 'registro_id': 'eq.' + regId }),
    ]);

    return {
      success: true,
      data: {
        registro: reg,
        presenca: results[0].data || [],
        disponibilidade: results[1].data || [],
        quebra: results[2].data || [],
        temperatura: (results[3].data && results[3].data.length > 0) ? results[3].data[results[3].data.length - 1] : null
      }
    };
  },

  async getDashboard(lojaId, dias) {
    var cacheKey = 'dashboard_' + lojaId;
    if (this._cache[cacheKey] && this._cacheTTL[cacheKey] > Date.now()) {
      return { success: true, data: this._cache[cacheKey] };
    }

    var cutoff = new Date(); cutoff.setDate(cutoff.getDate() - dias);
    var cutoffStr = cutoff.toISOString().split('T')[0];

    var regRes = await this.select('registros', { 'loja_id': 'eq.' + lojaId, 'data': 'gte.' + cutoffStr, 'order': 'data' });
    if (!regRes.success) return regRes;
    var regs = regRes.data;
    if (regs.length === 0) {
      var empty = { periodo_dias: dias, coletas_realizadas: 0, score: 0, direcionamento: 'Nenhuma coleta nos últimos ' + dias + ' dias. Faça o check-in para começar.',
        disponibilidade: { percentual: 0, rupturas: 0, total_checks: 0 }, top_rupturas: [],
        quebra: { total_kg: 0, meta_kg: 10 }, temperatura: { media: 'N/A', conformidade_pct: 0 },
        presenca: { percentual: 0, presentes: 0, total: 0 }, ocorrencias_ativas: 0, ocorrencias: [] };
      return { success: true, data: empty };
    }

    var regIds = regs.map(function(r) { return r.id; });
    var regIdsFilter = 'registro_id=in.(' + regIds.join(',') + ')';

    var results = await Promise.all([
      this.select('disponibilidade', { 'registro_id': 'in.(' + regIds.join(',') + ')' }),
      this.select('quebra', { 'registro_id': 'in.(' + regIds.join(',') + ')' }),
      this.select('temperatura', { 'registro_id': 'in.(' + regIds.join(',') + ')' }),
      this.select('presenca', { 'registro_id': 'in.(' + regIds.join(',') + ')' }),
      this.select('ocorrencias', { 'loja_id': 'eq.' + lojaId, 'status': 'in.(ABERTA,EM_ANDAMENTO)' }),
      this.select('produtos', {}),
    ]);

    var disps = results[0].data || [];
    var quebras = results[1].data || [];
    var temps = results[2].data || [];
    var preses = results[3].data || [];
    var ocorrencias = results[4].data || [];
    var produtos = results[5].data || [];

    var totalChecks = disps.length;
    var rupturas = disps.filter(function(d) { return !d.tem_estoque; }).length;
    var dispPct = totalChecks > 0 ? Math.round(((totalChecks - rupturas) / totalChecks) * 100) : 0;

    var ruptPorProd = {};
    disps.filter(function(d) { return !d.tem_estoque; }).forEach(function(d) { ruptPorProd[d.produto_id] = (ruptPorProd[d.produto_id] || 0) + 1; });
    var topRupturas = [];
    for (var pid in ruptPorProd) {
      var prod = produtos.find(function(p) { return p.id === pid; });
      topRupturas.push({ id: pid, nome: prod ? prod.corte_pai : pid, dias_ruptura: ruptPorProd[pid], total_dias: regs.length });
    }
    topRupturas.sort(function(a, b) { return b.dias_ruptura - a.dias_ruptura; });
    topRupturas = topRupturas.slice(0, 5);

    var totalQuebraKg = 0;
    quebras.forEach(function(q) { totalQuebraKg += parseFloat(q.peso_kg) || 0; });

    var tempMedia = 'N/A', tempConf = 0;
    if (temps.length > 0) {
      var soma = 0; temps.forEach(function(t) { soma += parseFloat(t.balcao_refrigerado) || 0; });
      tempMedia = (soma / temps.length).toFixed(1);
      tempConf = Math.round(temps.filter(function(t) { return t.flag_balcao === 'CONFORME'; }).length / temps.length * 100);
    }

    var totalPresente = preses.filter(function(p) { return p.presente; }).length;
    var presencaPct = preses.length > 0 ? Math.round(totalPresente / preses.length * 100) : 0;

    var metaQuebra = 10;
    var scoreDisp = dispPct * 0.35;
    var scoreTemp = tempConf * 0.25;
    var scoreQuebra = Math.max(0, (1 - totalQuebraKg / (metaQuebra * (dias / 7)))) * 100 * 0.25;
    var scorePresenca = presencaPct * 0.15;
    var score = Math.round(scoreDisp + scoreTemp + scoreQuebra + scorePresenca);

    var direcionamento = '';
    if (topRupturas.length > 0 && topRupturas[0].dias_ruptura >= 2) {
      direcionamento = 'Foco em resolver a ruptura de ' + topRupturas[0].nome + ' — ' + topRupturas[0].dias_ruptura + ' dias consecutivos sem estoque. Verifique o pedido com o comprador.';
    } else if (tempConf < 80 && temps.length > 0) {
      direcionamento = 'Atenção: temperatura do balcão fora da faixa em ' + (100 - tempConf) + '% dos dias. Verifique o equipamento.';
    } else if (totalQuebraKg > metaQuebra) {
      direcionamento = 'Quebra semanal de ' + totalQuebraKg.toFixed(1) + 'kg acima da meta de ' + metaQuebra + 'kg. Revisar rendimento.';
    } else if (presencaPct < 80 && preses.length > 0) {
      direcionamento = 'Equipe abaixo de 80%. Reorganizar escala.';
    } else {
      direcionamento = 'Bom trabalho! Indicadores estáveis. Mantenha o padrão e foque na capacitação da equipe.';
    }

    var dashData = {
      periodo_dias: dias, coletas_realizadas: regs.length, score: score, direcionamento: direcionamento,
      disponibilidade: { percentual: dispPct, rupturas: rupturas, total_checks: totalChecks },
      top_rupturas: topRupturas,
      quebra: { total_kg: Math.round(totalQuebraKg * 10) / 10, meta_kg: metaQuebra },
      temperatura: { media: tempMedia, conformidade_pct: tempConf },
      presenca: { percentual: presencaPct, presentes: totalPresente, total: preses.length },
      ocorrencias_ativas: ocorrencias.length, ocorrencias: ocorrencias
    };

    this._cache[cacheKey] = dashData;
    this._cacheTTL[cacheKey] = Date.now() + (5 * 60000);

    return { success: true, data: dashData };
  },

  async getOcorrencias(lojaId, status) {
    var params = { 'loja_id': 'eq.' + lojaId, 'order': 'data_abertura.desc' };
    if (status) params['status'] = 'eq.' + status;
    var ocRes = await this.select('ocorrencias', params);
    if (!ocRes.success) return ocRes;

    var acRes = await this.select('ocorrencias_acoes', { 'order': 'data' });
    var acoes = acRes.data || [];

    ocRes.data.forEach(function(oc) {
      oc.acoes = acoes.filter(function(a) { return a.ocorrencia_id === oc.id; });
    });

    // Aplicar mappers para compatibilidade com as páginas
    ocRes.data = ocRes.data.map(API._mapOcorrencia);

    return {
      success: true, data: ocRes.data,
      total: ocRes.data.length,
      abertas: ocRes.data.filter(function(o) { return o.status === 'ABERTA'; }).length,
      em_andamento: ocRes.data.filter(function(o) { return o.status === 'EM_ANDAMENTO'; }).length,
      resolvidas: ocRes.data.filter(function(o) { return o.status === 'RESOLVIDA'; }).length
    };
  },

  // ---- SAVES ----

  async saveCheckin(payload) {
    var hoje = new Date().toISOString().split('T')[0];
    var existing = await this.select('registros', { 'loja_id': 'eq.' + payload.loja_id, 'data': 'eq.' + hoje });

    if (existing.success && existing.data.length > 0) {
      var reg = existing.data[0];
      await this.update('registros', { id: reg.id }, {
        foto_checkin_url: payload.foto_url || reg.foto_checkin_url,
        observacao: payload.observacao || reg.observacao
      });
      return { success: true, data: { id_registro: reg.id }, message: 'Check-in atualizado' };
    }

    var id = 'REG-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    var res = await this.insert('registros', {
      id: id, loja_id: payload.loja_id, pessoa_id: payload.pessoa_id,
      data: hoje, hora_checkin: payload.hora_checkin || '',
      foto_checkin_url: payload.foto_url || '', observacao: payload.observacao || '',
      geo_lat: payload.geo_lat || '', geo_lng: payload.geo_lng || ''
    });

    if (res.success) return { success: true, data: { id_registro: id }, message: 'Check-in salvo' };
    return res;
  },

  async saveCheckout(regId, hora) {
    return this.update('registros', { id: regId }, { hora_checkout: hora });
  },

  async savePresenca(regId, registros) {
    await this.deleteRows('presenca', { registro_id: regId });
    var promises = registros.map(function(reg) {
      var id = 'PRS-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      return API.insert('presenca', {
        id: id, registro_id: regId, pessoa_id: reg.id_pessoa,
        presente: reg.presente === 'SIM', motivo_ausencia: reg.motivo || '', hora_chegada: reg.hora_chegada || ''
      });
    });
    await Promise.all(promises);
    return { success: true, message: registros.length + ' presenças salvas' };
  },

  async saveDisponibilidade(regId, produtos, lojaId) {
    await this.deleteRows('disponibilidade', { registro_id: regId });
    var promises = produtos.map(function(prod) {
      var id = 'DSP-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      return API.insert('disponibilidade', {
        id: id, registro_id: regId, produto_id: prod.id_produto,
        tem_estoque: prod.tem_estoque === 'SIM',
        motivo_ruptura: prod.motivo_ruptura || '',
        disponivel_at: prod.disponivel_at === 'SIM',
        motivo_indisponivel_at: prod.motivo_indisponivel_at || '',
        disponivel_as: prod.disponivel_as === 'SIM',
        motivo_indisponivel_as: prod.motivo_indisponivel_as || ''
      });
    });
    await Promise.all(promises);
    return { success: true, message: produtos.length + ' disponibilidades salvas' };
  },

  async saveQuebra(regId, itens) {
    await this.deleteRows('quebra', { registro_id: regId });
    if (!itens || itens.length === 0) return { success: true, message: 'Sem quebra' };
    var promises = itens.map(function(item) {
      var id = 'QBR-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      return API.insert('quebra', {
        id: id, registro_id: regId, produto_id: item.id_produto,
        peso_kg: parseFloat(item.peso_kg) || 0, motivo: item.motivo || '', destino: item.destino || ''
      });
    });
    await Promise.all(promises);
    return { success: true, message: itens.length + ' quebras salvas' };
  },

  async saveTemperatura(regId, payload) {
    await this.deleteRows('temperatura', { registro_id: regId });
    var balcao = parseFloat(payload.balcao), resf = parseFloat(payload.camara_resfriados), cong = parseFloat(payload.camara_congelados);
    var fB = (balcao >= 0 && balcao <= 4) ? 'CONFORME' : 'NÃO CONFORME';
    var fR = (resf >= 0 && resf <= 4) ? 'CONFORME' : 'NÃO CONFORME';
    var fC = cong <= -18 ? 'CONFORME' : 'NÃO CONFORME';

    var id = 'TMP-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    await this.insert('temperatura', {
      id: id, registro_id: regId,
      balcao_refrigerado: balcao, camara_resfriados: resf, camara_congelados: cong,
      flag_balcao: fB, flag_resfriados: fR, flag_congelados: fC
    });

    var alertas = [];
    if (fB === 'NÃO CONFORME') alertas.push('Balcão: ' + balcao + '°C');
    if (fR === 'NÃO CONFORME') alertas.push('Câmara resf.: ' + resf + '°C');
    if (fC === 'NÃO CONFORME') alertas.push('Câmara cong.: ' + cong + '°C');
    return { success: true, message: 'Temperatura salva', alertas: alertas, flags: { balcao: fB, resfriados: fR, congelados: fC } };
  },

  async savePessoa(payload) {
    var id = 'PS-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    var res = await this.insert('pessoas', {
      id: id, nome: payload.nome, tipo: payload.tipo,
      cargo: payload.cargo || (payload.tipo === 'TERCEIRO' ? 'Promotor' : ''),
      loja_id: payload.id_loja, marca_terceiro: payload.marca || '',
      telefone: payload.telefone || '', turno: payload.turno || 'Manhã', status: 'ATIVO'
    });
    if (res.success) return { success: true, data: { id_pessoa: id }, message: 'Pessoa cadastrada' };
    return res;
  },

  async saveAcaoOcorrencia(ocId, acao, pessoaId) {
    var id = 'ACO-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    await this.insert('ocorrencias_acoes', {
      id: id, ocorrencia_id: ocId, acao_tomada: acao, pessoa_id: pessoaId
    });
    await this.update('ocorrencias', { id: ocId }, { status: 'EM_ANDAMENTO' });
    return { success: true, message: 'Ação registrada' };
  },

  async resolverOcorrencia(ocId, motivo) {
    var hoje = new Date().toISOString().split('T')[0];
    return this.update('ocorrencias', { id: ocId }, { status: 'RESOLVIDA', data_resolucao: hoje, motivo_resolucao: motivo });
  },

  async uploadFoto(base64, filename) {
    try {
      var byteChars = atob(base64);
      var byteNumbers = new Array(byteChars.length);
      for (var i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
      var byteArray = new Uint8Array(byteNumbers);
      var blob = new Blob([byteArray], { type: 'image/jpeg' });

      var res = await fetch(NEXO.SUPABASE_URL + '/storage/v1/object/fotos/' + filename, {
        method: 'POST',
        headers: { 'apikey': NEXO.SUPABASE_KEY, 'Authorization': 'Bearer ' + NEXO.SUPABASE_KEY, 'Content-Type': 'image/jpeg' },
        body: blob
      });

      if (res.ok) {
        var url = NEXO.SUPABASE_URL + '/storage/v1/object/public/fotos/' + filename;
        return { success: true, data: { url: url } };
      }
      return { success: true, data: { url: '' }, message: 'Upload falhou, continuando sem foto' };
    } catch (err) {
      return { success: true, data: { url: '' }, message: 'Upload falhou' };
    }
  },

  // ---- CACHE E OFFLINE ----
  clearCache(prefix) {
    var keys = Object.keys(this._cache);
    for (var i = 0; i < keys.length; i++) {
      if (!prefix || keys[i].indexOf(prefix) === 0) { delete this._cache[keys[i]]; delete this._cacheTTL[keys[i]]; }
    }
  },

  async preloadStaticData() {
    await Promise.all([
      this.getProdutosLoja(Auth.lojaId),
      this.getPessoasLoja(Auth.lojaId),
      this.getMotivos(),
      this.getAcoesPredefinidas(),
    ]);
  },

  _enqueue(item) { this._queue.push(item); this._saveQueue(); Utils.toast('Salvo offline.', 'warning'); },
  async _flushQueue() {
    if (this._queue.length === 0) return;
    Utils.toast('Sincronizando...', 'info');
    var pending = this._queue.slice(); this._queue = []; this._saveQueue();
    for (var i = 0; i < pending.length; i++) {
      try { await this.insert(pending[i].table, pending[i].row); } catch(e) { this._queue.push(pending[i]); }
    }
    this._saveQueue();
    if (this._queue.length === 0) Utils.toast('Sincronizado!', 'success');
  },
  _saveQueue() { try { localStorage.setItem('nexo_offline_queue', JSON.stringify(this._queue)); } catch(e){} },
  _loadQueue() { try { this._queue = JSON.parse(localStorage.getItem('nexo_offline_queue') || '[]'); } catch(e){ this._queue = []; } },
  get pendingCount() { return this._queue.length; },

  // ============================================================
  // CAMADA DE COMPATIBILIDADE
  // Traduz chamadas API.get('ACTION', params) e API.post('ACTION', payload)
  // para as funções nativas do Supabase acima.
  // Assim NENHUMA página precisa ser reescrita.
  // ============================================================
  async get(action, params, cacheMin) {
    var lojaId = (params && params.loja_id) || Auth.lojaId;
    var dias = (params && params.dias) ? parseInt(params.dias) : 7;

    switch (action) {
      case 'GET_DASHBOARD':
        return this.getDashboard(lojaId, dias);
      case 'GET_PRODUTOS':
        return this.getProdutosLoja(lojaId);
      case 'GET_PESSOAS':
        return this.getPessoasLoja(lojaId);
      case 'GET_MOTIVOS':
        return this.getMotivos((params && params.contexto) || '');
      case 'GET_ACOES_PREDEFINIDAS':
        return this.getAcoesPredefinidas((params && params.tipo) || '');
      case 'GET_OCORRENCIAS':
        return this.getOcorrencias(lojaId, (params && params.status) || '');
      case 'GET_DADOS_DIA':
        return this.getDadosDia(lojaId, (params && params.data) || new Date().toISOString().split('T')[0]);
      case 'GET_REGISTROS':
        return this.select('registros', { 'loja_id': 'eq.' + lojaId, 'order': 'data.desc' });
      case 'LOGIN':
        return this.login((params && params.usuario) || '');
      default:
        console.warn('API.get ação desconhecida:', action);
        return { success: false, error: 'Ação desconhecida: ' + action };
    }
  },

  async post(action, payload, params) {
    var lojaId = (payload && payload.id_loja) || (payload && payload.loja_id) || (params && params.loja_id) || Auth.lojaId;
    var regId = (payload && payload.id_registro) || Utils.getRegistroHoje();

    switch (action) {
      case 'SAVE_CHECKIN':
        return this.saveCheckin({
          loja_id: payload.id_loja || lojaId,
          pessoa_id: payload.id_pessoa || Auth.userId,
          hora_checkin: payload.hora_checkin || '',
          foto_url: payload.foto_url || '',
          observacao: payload.observacao || '',
          geo_lat: payload.geo_lat || '',
          geo_lng: payload.geo_lng || ''
        });
      case 'SAVE_CHECKOUT':
        return this.saveCheckout(payload.id_registro || regId, payload.hora_checkout || '');
      case 'SAVE_PRESENCA':
        return this.savePresenca(payload.id_registro || regId, payload.registros || []);
      case 'SAVE_DISPONIBILIDADE':
        return this.saveDisponibilidade(payload.id_registro || regId, payload.produtos || [], lojaId);
      case 'SAVE_QUEBRA':
        return this.saveQuebra(payload.id_registro || regId, payload.itens || []);
      case 'SAVE_TEMPERATURA':
        return this.saveTemperatura(payload.id_registro || regId, payload);
      case 'SAVE_PESSOA':
        return this.savePessoa(payload);
      case 'SAVE_ACAO_OCORRENCIA':
        return this.saveAcaoOcorrencia(payload.id_ocorrencia, payload.acao, payload.id_pessoa || Auth.userId);
      case 'RESOLVER_OCORRENCIA':
        return this.resolverOcorrencia(payload.id_ocorrencia, payload.motivo_resolucao);
      case 'UPLOAD_FOTO':
        return this.uploadFoto(payload.base64, payload.filename);
      default:
        console.warn('API.post ação desconhecida:', action);
        return { success: false, error: 'Ação desconhecida: ' + action };
    }
  }
};
