// ============================================================
// NEXO OPS — Página de Login
// ============================================================
Router.register('login', (app) => {
  app.innerHTML = `
    <div class="login-page">
      <div class="login-logo">
        <img src="icons/logo-nexo.png" alt="NEXO" class="login-logo-img" onerror="this.style.display='none'">
        <h1 class="login-brand">NEXO</h1>
        <p class="login-tagline">Gestão Inteligente</p>
      </div>
      <form id="loginForm" class="login-form">
        <div class="input-group">
          <label>Usuário</label>
          <div class="input-wrap">
            <svg class="input-icon" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="6" r="3.5" stroke="currentColor" stroke-width="1.2"/><path d="M2.5 16.5C2.5 13 5 11 9 11C13 11 15.5 13 15.5 16.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
            <input type="text" id="loginUser" placeholder="nome.sobrenome" autocomplete="username" autocapitalize="off" required>
          </div>
        </div>
        <div class="input-group">
          <label>Senha</label>
          <div class="input-wrap">
            <svg class="input-icon" viewBox="0 0 18 18" fill="none"><rect x="3" y="8" width="12" height="8" rx="2" stroke="currentColor" stroke-width="1.2"/><path d="M6 8V5.5C6 3.5 7.3 2 9 2C10.7 2 12 3.5 12 5.5V8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="9" cy="12.5" r="1.2" fill="currentColor"/></svg>
            <input type="password" id="loginPass" placeholder="••••••••" autocomplete="current-password" required>
          </div>
        </div>
        <button type="submit" class="btn-primary btn-full" id="loginBtn">Entrar</button>
        <p class="login-hint">Acesso exclusivo por loja</p>
      </form>
      <div class="login-footer">
        <p>NEXO OPS v${NEXO.VERSION} — PWA</p>
      </div>
    </div>
  `;

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();

    if (!user) { Utils.toast('Informe o usuário', 'warning'); return; }

    btn.disabled = true;
    btn.textContent = 'Entrando...';

    const res = await Auth.login(user, pass);
    if (res.success) {
      Utils.toast('Bem-vindo, ' + Auth.user.nome + '!', 'success');
      Router.navigate('home');
    } else {
      Utils.toast(res.error || 'Erro no login', 'error');
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  });
});
