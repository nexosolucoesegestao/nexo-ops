// ============================================================
// NEXO OPS — Router SPA
// ============================================================
const Router = {
  _routes: {},
  _current: null,

  register(name, renderFn) {
    this._routes[name] = renderFn;
  },

  navigate(name, data = {}) {
    if (!Auth.isLoggedIn && name !== 'login') {
      name = 'login';
    }
    if (Auth.isLoggedIn && name === 'login') {
      name = 'home';
    }

    const app = document.getElementById('app');
    if (!app) return;

    app.classList.add('page-exit');
    setTimeout(() => {
      const renderFn = this._routes[name];
      if (renderFn) {
        app.innerHTML = '';
        renderFn(app, data);
        this._current = name;
        this._updateNav(name);
      }
      app.classList.remove('page-exit');
      app.classList.add('page-enter');
      setTimeout(() => app.classList.remove('page-enter'), 300);
      window.scrollTo(0, 0);
    }, 150);
  },

  _updateNav(name) {
    document.querySelectorAll('.nav-item').forEach(el => {
      const target = el.dataset.page;
      el.classList.toggle('active', target === name);
    });
  },

  get current() { return this._current; }
};
