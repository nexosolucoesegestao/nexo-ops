// ============================================================
// NEXO OPS — Autenticação (Supabase)
// Mantém mesma interface para as páginas não mudarem
// ============================================================
const Auth = {
  _session: null,

  init() {
    var saved = localStorage.getItem('nexo_session');
    if (saved) {
      try {
        this._session = JSON.parse(saved);
        var age = Date.now() - (this._session.timestamp || 0);
        if (age > 12 * 60 * 60 * 1000) this.logout();
      } catch (e) { this.logout(); }
    }
  },

  async login(usuario, senha) {
    var res = await API.login(usuario);
    if (res.success) {
      this._session = {
        usuario: res.data.usuario,
        loja: res.data.loja,
        timestamp: Date.now()
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
  get user() { return this._session ? this._session.usuario : {}; },
  get loja() { return this._session ? this._session.loja : {}; },
  get lojaId() { return this._session ? this._session.loja.id : ''; },
  get userId() { return this._session ? this._session.usuario.id : ''; },
};
