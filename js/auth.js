// ============================================================
// NEXO OPS — Autenticação v2.0 (Supabase Auth Real)
// ============================================================
const Auth = {
  _session: null,
  _supabase: null,

  _getClient() {
    if (!this._supabase) {
      this._supabase = window.supabase.createClient(
        NEXO.SUPABASE_URL,
        NEXO.SUPABASE_KEY,
        { auth: { persistSession: true, autoRefreshToken: true } }
      );
    }
    return this._supabase;
  },

  async init() {
    const client = this._getClient();
    const { data: { session } } = await client.auth.getSession();
    if (session) {
      await this._loadUserData(session);
    }
    // Escuta mudanças de sessão (token refresh, logout externo)
    client.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        this._session = null;
        Router.navigate('login');
      }
    });
  },

  async login(email, senha) {
    const client = this._getClient();
    const emailNorm = email.trim().toLowerCase();

    const { data, error } = await client.auth.signInWithPassword({
      email: emailNorm,
      password: senha
    });

    if (error) {
      return { success: false, error: 'Email ou senha incorretos' };
    }

    const ok = await this._loadUserData(data.session);
    if (!ok) {
      await client.auth.signOut();
      return { success: false, error: 'Usuário não vinculado a nenhuma loja. Contate o administrador.' };
    }

    return { success: true };
  },

  async _loadUserData(session) {
    // Busca o perfil da pessoa vinculada ao auth.uid()
    const client = this._getClient();
    const { data: pessoas, error } = await client
      .from('pessoas')
      .select('*, lojas(*)')
      .eq('auth_user_id', session.user.id)
      .eq('status', 'ATIVO')
      .limit(1);

    if (error || !pessoas || pessoas.length === 0) return false;

    const pessoa = pessoas[0];
    const loja = pessoa.lojas;
    if (!loja) return false;

    this._session = {
      usuario: {
        id: pessoa.id,
        nome: pessoa.nome,
        tipo: pessoa.tipo,
        cargo: pessoa.cargo
      },
      loja: {
        id: loja.id,
        nome: loja.nome,
        rede: loja.rede,
        cidade: loja.cidade,
        uf: loja.uf
      }
    };
    return true;
  },

  async logout() {
    const client = this._getClient();
    await client.auth.signOut();
    this._session = null;
    localStorage.removeItem('nexo_registro_hoje');
    Router.navigate('login');
  },

  get isLoggedIn() { return !!this._session; },
  get user()       { return this._session ? this._session.usuario : {}; },
  get loja()       { return this._session ? this._session.loja : {}; },
  get lojaId()     { return this._session ? this._session.loja.id : ''; },
  get userId()     { return this._session ? this._session.usuario.id : ''; },
};
