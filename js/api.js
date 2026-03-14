// ============================================================
// NEXO OPS — API Layer v1.1
// FIX: Usa GET com payload na URL para evitar problema de
// redirect do Apps Script com POST/CORS
// ============================================================
const API = {
  _queue: [],
  _online: navigator.onLine,

  init() {
    window.addEventListener('online', () => { this._online = true; this._flushQueue(); });
    window.addEventListener('offline', () => { this._online = false; });
    this._loadQueue();
  },

  _buildUrl(action, params) {
    const url = new URL(NEXO.API_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('token', NEXO.API_TOKEN);
    if (Auth && Auth.lojaId) url.searchParams.set('loja_id', Auth.lojaId);
    if (Auth && Auth.userId) url.searchParams.set('user_id', Auth.userId);
    Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, v));
    return url.toString();
  },

  async get(action, params) {
    const url = this._buildUrl(action, params);
    try {
      const res = await fetch(url, { method: 'GET', redirect: 'follow' });
      return await res.json();
    } catch (err) {
      console.error('API GET error:', action, err);
      return { success: false, error: 'Sem conexão', offline: true };
    }
  },

  async post(action, payload, params) {
    if (!this._online) {
      this._enqueue({ action, payload, params, timestamp: Date.now() });
      return { success: true, queued: true, message: 'Salvo localmente. Será enviado ao reconectar.' };
    }

    // Apps Script fix: envia payload como parâmetro GET encodado
    // Isso evita o problema de redirect 302 que mata o body do POST
    const url = this._buildUrl(action, params);
    const fullUrl = url + '&payload=' + encodeURIComponent(JSON.stringify(payload));

    try {
      const res = await fetch(fullUrl, { method: 'GET', redirect: 'follow' });
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error('API parse error:', text.substring(0, 200));
        return { success: false, error: 'Resposta inválida do servidor' };
      }
    } catch (err) {
      console.error('API POST error:', action, err);
      this._enqueue({ action, payload, params, timestamp: Date.now() });
      return { success: true, queued: true, message: 'Erro de rede. Salvo localmente.' };
    }
  },

  _enqueue(item) {
    this._queue.push(item);
    this._saveQueue();
    Utils.toast('Salvo offline. Será sincronizado automaticamente.', 'warning');
  },

  async _flushQueue() {
    if (this._queue.length === 0) return;
    Utils.toast('Sincronizando ' + this._queue.length + ' registros...', 'info');
    const pending = [...this._queue];
    this._queue = [];
    this._saveQueue();

    for (const item of pending) {
      try {
        const r = await this.post(item.action, item.payload, item.params);
        if (r.queued) this._queue.push(item);
      } catch (err) { this._queue.push(item); }
    }
    this._saveQueue();
    if (this._queue.length === 0) Utils.toast('Dados sincronizados!', 'success');
  },

  _saveQueue() { try { localStorage.setItem('nexo_offline_queue', JSON.stringify(this._queue)); } catch(e){} },
  _loadQueue() { try { this._queue = JSON.parse(localStorage.getItem('nexo_offline_queue') || '[]'); } catch(e){ this._queue = []; } },
  get pendingCount() { return this._queue.length; }
};
