// ============================================================
// NEXO OPS — Autenticação e Sessão
// ============================================================
const Auth = {
  _session: null,

  init() {
    const saved = localStorage.getItem('nexo_session');
    if (saved) {
      try {
        this._session = JSON.parse(saved);
        const age = Date.now() - (this._session.timestamp || 0);
        if (age > 12 * 60 * 60 * 1000) {
          this.logout();
        }
      } catch (e) { this.logout(); }
    }
  },

  async login(usuario, senha) {
    const res = await API.get('LOGIN', { usuario, senha });
    if (res.success) {
      this._session = {
        ...res.data,
        timestamp: Date.now(),
      };
      localStorage.setItem('nexo_session', JSON.stringify(this._session));
      return { success: true };
    }
    return { success: false, error: res.error || 'Erro no login' };
  },

  logout() {
    this._session = null;
    localStorage.removeItem('nexo_session');
    localStorage.removeItem('nexo_registro_hoje');
    Router.navigate('login');
  },

  get isLoggedIn() { return !!this._session; },
  get user() { return this._session?.usuario || {}; },
  get loja() { return this._session?.loja || {}; },
  get lojaId() { return this._session?.loja?.id || ''; },
  get userId() { return this._session?.usuario?.id || ''; },
  get sessionToken() { return this._session?.session_token || ''; },
};
