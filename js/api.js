// ============================================================
// NEXO OPS — API Layer v1.2
// Cache local agressivo + upload foto separado
// ============================================================
const API = {
  _queue: [],
  _online: navigator.onLine,
  _cache: {},
  _cacheTTL: {},

  init() {
    window.addEventListener('online', () => { this._online = true; this._flushQueue(); });
    window.addEventListener('offline', () => { this._online = false; });
    this._loadQueue();
  },

  _buildUrl(action, params) {
    var url = new URL(NEXO.API_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('token', NEXO.API_TOKEN);
    if (Auth && Auth.lojaId) url.searchParams.set('loja_id', Auth.lojaId);
    if (Auth && Auth.userId) url.searchParams.set('user_id', Auth.userId);
    Object.entries(params || {}).forEach(function(entry) { url.searchParams.set(entry[0], entry[1]); });
    return url.toString();
  },

  // GET com cache opcional
  async get(action, params, cacheMinutes) {
    var cacheKey = action + '_' + JSON.stringify(params || {});

    // Retorna cache se ainda válido
    if (cacheMinutes && this._cache[cacheKey] && this._cacheTTL[cacheKey] > Date.now()) {
      return this._cache[cacheKey];
    }

    var url = this._buildUrl(action, params);
    try {
      var res = await fetch(url, { method: 'GET', redirect: 'follow' });
      var data = await res.json();
      // Salvar no cache
      if (cacheMinutes && data.success) {
        this._cache[cacheKey] = data;
        this._cacheTTL[cacheKey] = Date.now() + (cacheMinutes * 60 * 1000);
      }
      return data;
    } catch (err) {
      // Tentar retornar cache expirado se offline
      if (this._cache[cacheKey]) return this._cache[cacheKey];
      return { success: false, error: 'Sem conexão', offline: true };
    }
  },

  // POST via GET com payload encoded (para dados pequenos)
  async post(action, payload, params) {
    if (!this._online) {
      this._enqueue({ action: action, payload: payload, params: params, timestamp: Date.now() });
      return { success: true, queued: true, message: 'Salvo localmente.' };
    }

    var url = this._buildUrl(action, params);
    var fullUrl = url + '&payload=' + encodeURIComponent(JSON.stringify(payload));

    // Verificar se URL é muito longa (>7000 chars = arriscado)
    if (fullUrl.length > 7000) {
      return this._postViaForm(action, payload, params);
    }

    try {
      var res = await fetch(fullUrl, { method: 'GET', redirect: 'follow' });
      var text = await res.text();
      try { return JSON.parse(text); }
      catch (e) { return { success: false, error: 'Resposta inválida' }; }
    } catch (err) {
      this._enqueue({ action: action, payload: payload, params: params, timestamp: Date.now() });
      return { success: true, queued: true, message: 'Erro de rede. Salvo localmente.' };
    }
  },

  // POST via form oculto + iframe (para dados grandes como fotos)
  _postViaForm(action, payload, params) {
    return new Promise(function(resolve) {
      var iframeName = 'nexo_upload_' + Date.now();
      var iframe = document.createElement('iframe');
      iframe.name = iframeName;
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      var form = document.createElement('form');
      form.method = 'POST';
      form.action = NEXO.API_URL + '?action=' + action + '&token=' + NEXO.API_TOKEN;
      if (params) {
        Object.entries(params).forEach(function(entry) {
          form.action += '&' + entry[0] + '=' + encodeURIComponent(entry[1]);
        });
      }
      form.target = iframeName;
      form.style.display = 'none';

      var input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'payload';
      input.value = JSON.stringify(payload);
      form.appendChild(input);

      document.body.appendChild(form);

      // Timeout de 30s para upload de foto
      var timeout = setTimeout(function() {
        cleanup();
        resolve({ success: true, message: 'Upload enviado (sem confirmação)' });
      }, 30000);

      iframe.onload = function() {
        clearTimeout(timeout);
        try {
          var text = iframe.contentDocument.body.innerText;
          var data = JSON.parse(text);
          cleanup();
          resolve(data);
        } catch (e) {
          cleanup();
          resolve({ success: true, message: 'Upload enviado' });
        }
      };

      form.submit();

      function cleanup() {
        try { document.body.removeChild(form); } catch(e){}
        try { document.body.removeChild(iframe); } catch(e){}
      }
    });
  },

  // Upload de foto dedicado (sempre via form/iframe)
  async uploadFoto(base64, filename) {
    if (!this._online) return { success: false, error: 'Sem conexão para upload' };
    return this._postViaForm('UPLOAD_FOTO', { base64: base64, filename: filename }, {});
  },

  // Invalidar cache específico
  clearCache(action) {
    var keys = Object.keys(this._cache);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf(action) === 0) {
        delete this._cache[keys[i]];
        delete this._cacheTTL[keys[i]];
      }
    }
  },

  // Pré-carregar dados estáticos no login (chamado 1x)
  async preloadStaticData() {
    await Promise.all([
      this.get('GET_PRODUTOS', { loja_id: Auth.lojaId }, 60),      // cache 1h
      this.get('GET_PESSOAS', { loja_id: Auth.lojaId }, 30),       // cache 30min
      this.get('GET_MOTIVOS', {}, 60),                              // cache 1h
      this.get('GET_ACOES_PREDEFINIDAS', {}, 60),                   // cache 1h
    ]);
  },

  _enqueue(item) {
    this._queue.push(item);
    this._saveQueue();
    Utils.toast('Salvo offline. Será sincronizado.', 'warning');
  },

  async _flushQueue() {
    if (this._queue.length === 0) return;
    Utils.toast('Sincronizando ' + this._queue.length + ' registros...', 'info');
    var pending = this._queue.slice();
    this._queue = [];
    this._saveQueue();
    for (var i = 0; i < pending.length; i++) {
      try {
        var r = await this.post(pending[i].action, pending[i].payload, pending[i].params);
        if (r.queued) this._queue.push(pending[i]);
      } catch (err) { this._queue.push(pending[i]); }
    }
    this._saveQueue();
    if (this._queue.length === 0) Utils.toast('Dados sincronizados!', 'success');
  },

  _saveQueue() { try { localStorage.setItem('nexo_offline_queue', JSON.stringify(this._queue)); } catch(e){} },
  _loadQueue() { try { this._queue = JSON.parse(localStorage.getItem('nexo_offline_queue') || '[]'); } catch(e){ this._queue = []; } },
  get pendingCount() { return this._queue.length; }
};
