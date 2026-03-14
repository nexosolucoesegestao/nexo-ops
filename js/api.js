// ============================================================
// NEXO OPS — API Layer (comunicação com Apps Script)
// ============================================================
const API = {
  _queue: [],
  _online: navigator.onLine,

  init() {
    window.addEventListener('online', () => {
      this._online = true;
      this._flushQueue();
    });
    window.addEventListener('offline', () => { this._online = false; });
    this._loadQueue();
  },

  async get(action, params = {}) {
    const url = new URL(NEXO.API_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('token', NEXO.API_TOKEN);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    try {
      const res = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('API GET error:', action, err);
      return { success: false, error: 'Sem conexão', offline: true };
    }
  },

  async post(action, payload, params = {}) {
    const url = new URL(NEXO.API_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('token', NEXO.API_TOKEN);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    if (!this._online) {
      this._enqueue({ action, payload, params, timestamp: Date.now() });
      return { success: true, queued: true, message: 'Salvo localmente. Será enviado quando houver conexão.' };
    }

    try {
      const res = await fetch(url.toString(), {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('API POST error:', action, err);
      this._enqueue({ action, payload, params, timestamp: Date.now() });
      return { success: true, queued: true, message: 'Erro de rede. Dados salvos localmente.' };
    }
  },

  _enqueue(item) {
    this._queue.push(item);
    this._saveQueue();
    Utils.toast('Dados salvos offline. Serão sincronizados automaticamente.', 'warning');
  },

  async _flushQueue() {
    if (this._queue.length === 0) return;
    Utils.toast('Sincronizando ' + this._queue.length + ' registros...', 'info');

    const pending = [...this._queue];
    this._queue = [];
    this._saveQueue();

    for (const item of pending) {
      try {
        await this.post(item.action, item.payload, item.params);
      } catch (err) {
        this._queue.push(item);
      }
    }
    this._saveQueue();

    if (this._queue.length === 0) {
      Utils.toast('Todos os dados sincronizados!', 'success');
    } else {
      Utils.toast(this._queue.length + ' registros pendentes.', 'warning');
    }
  },

  _saveQueue() {
    try {
      localStorage.setItem('nexo_offline_queue', JSON.stringify(this._queue));
    } catch (e) { /* ignore */ }
  },

  _loadQueue() {
    try {
      const saved = localStorage.getItem('nexo_offline_queue');
      if (saved) this._queue = JSON.parse(saved);
    } catch (e) { this._queue = []; }
  },

  get pendingCount() { return this._queue.length; }
};
