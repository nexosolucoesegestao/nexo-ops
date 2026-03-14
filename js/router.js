// ============================================================
// NEXO OPS — Router SPA v1.1 (transição rápida)
// ============================================================
const Router = {
  _routes: {},
  _current: null,

  register(name, renderFn) { this._routes[name] = renderFn; },

  navigate(name, data) {
    data = data || {};
    if (!Auth.isLoggedIn && name !== 'login') name = 'login';
    if (Auth.isLoggedIn && name === 'login') name = 'home';

    var app = document.getElementById('app');
    if (!app) return;

    app.style.opacity = '0';
    setTimeout(function() {
      var renderFn = Router._routes[name];
      if (renderFn) {
        app.innerHTML = '';
        renderFn(app, data);
        Router._current = name;
      }
      app.style.opacity = '1';
      window.scrollTo(0, 0);
    }, 50);
  },

  get current() { return this._current; }
};
