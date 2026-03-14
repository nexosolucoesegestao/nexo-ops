// ============================================================
// NEXO OPS — Login v1.2
// Logo limpo + botão instalar PWA
// ============================================================

// Capturar evento de instalação (precisa estar fora do register)
var nexoInstallPrompt = null;
window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  nexoInstallPrompt = e;
  // Mostrar botão se estiver na tela de login
  var btn = document.getElementById('btnInstalar');
  if (btn) btn.style.display = 'flex';
});

Router.register('login', function(app) {
  app.innerHTML =
    '<div class="login-page">' +
      '<div class="login-logo">' +
        '<img src="icons/logo-nexo.png" alt="NEXO" class="login-logo-img" style="width:200px;border-radius:16px" onerror="this.style.display=\'none\'">' +
        '<p class="login-tagline">Gestão Inteligente</p>' +
      '</div>' +
      '<form id="loginForm" class="login-form">' +
        '<div class="input-group">' +
          '<label>Usuário</label>' +
          '<div class="input-wrap">' +
            '<svg class="input-icon" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="6" r="3.5" stroke="currentColor" stroke-width="1.2"/><path d="M2.5 16.5C2.5 13 5 11 9 11C13 11 15.5 13 15.5 16.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>' +
            '<input type="text" id="loginUser" placeholder="nome.sobrenome" autocomplete="username" autocapitalize="off" required>' +
          '</div>' +
        '</div>' +
        '<div class="input-group">' +
          '<label>Senha</label>' +
          '<div class="input-wrap">' +
            '<svg class="input-icon" viewBox="0 0 18 18" fill="none"><rect x="3" y="8" width="12" height="8" rx="2" stroke="currentColor" stroke-width="1.2"/><path d="M6 8V5.5C6 3.5 7.3 2 9 2C10.7 2 12 3.5 12 5.5V8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="9" cy="12.5" r="1.2" fill="currentColor"/></svg>' +
            '<input type="password" id="loginPass" placeholder="••••••••" autocomplete="current-password" required>' +
          '</div>' +
        '</div>' +
        '<button type="submit" class="btn-primary btn-full" id="loginBtn">Entrar</button>' +
        '<p class="login-hint">Acesso exclusivo por loja</p>' +
      '</form>' +
      '<div id="btnInstalar" class="install-banner" style="display:none">' +
        '<svg viewBox="0 0 20 20" fill="none" width="20" height="20"><path d="M10 3V13M10 13L6 9M10 13L14 9" stroke="#C5A35A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 15V16C3 16.6 3.4 17 4 17H16C16.6 17 17 16.6 17 16V15" stroke="#C5A35A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '<span>Instalar NEXO OPS no celular</span>' +
      '</div>' +
      '<div class="login-footer">' +
        '<p>NEXO OPS v' + NEXO.VERSION + ' — PWA</p>' +
      '</div>' +
    '</div>';

  // Mostrar botão instalar se o prompt já foi capturado
  if (nexoInstallPrompt) {
    var btnInst = document.getElementById('btnInstalar');
    if (btnInst) btnInst.style.display = 'flex';
  }

  // Evento do botão instalar
  document.getElementById('btnInstalar').addEventListener('click', function() {
    if (nexoInstallPrompt) {
      nexoInstallPrompt.prompt();
      nexoInstallPrompt.userChoice.then(function(result) {
        if (result.outcome === 'accepted') {
          Utils.toast('App instalado!', 'success');
        }
        nexoInstallPrompt = null;
        document.getElementById('btnInstalar').style.display = 'none';
      });
    }
  });

  // Login
  document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    var btn = document.getElementById('loginBtn');
    var user = document.getElementById('loginUser').value.trim();
    var pass = document.getElementById('loginPass').value.trim();

    if (!user) { Utils.toast('Informe o usuário', 'warning'); return; }

    btn.disabled = true;
    btn.textContent = 'Entrando...';

    var res = await Auth.login(user, pass);
    if (res.success) {
      Utils.toast('Bem-vindo, ' + Auth.user.nome + '!', 'success');
      // Pré-carregar dados estáticos em background
      API.preloadStaticData();
      Router.navigate('home');
    } else {
      Utils.toast(res.error || 'Erro no login', 'error');
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  });
});
