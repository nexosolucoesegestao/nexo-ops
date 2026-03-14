// ============================================================
// NEXO OPS — Service Worker v1.2
// Versionamento automático + notificação de atualização
// ============================================================
// >>> PARA ATUALIZAR O APP: mude apenas este número <<<
var CACHE_VERSION = '1.3';
var CACHE_NAME = 'nexo-ops-v' + CACHE_VERSION;

var ASSETS = [
  '/nexo-ops/',
  '/nexo-ops/index.html',
  '/nexo-ops/css/app.css',
  '/nexo-ops/js/config.js',
  '/nexo-ops/js/api.js',
  '/nexo-ops/js/auth.js',
  '/nexo-ops/js/router.js',
  '/nexo-ops/js/utils.js',
  '/nexo-ops/js/pages/login.js',
  '/nexo-ops/js/pages/home.js',
  '/nexo-ops/js/pages/checkin.js',
  '/nexo-ops/js/pages/pessoal.js',
  '/nexo-ops/js/pages/ruptura.js',
  '/nexo-ops/js/pages/quebra.js',
  '/nexo-ops/js/pages/temperatura.js',
  '/nexo-ops/js/pages/dashboard.js',
  '/nexo-ops/js/pages/ocorrencias.js',
  '/nexo-ops/manifest.json',
];

// Instala o novo cache
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  // Força ativação imediata (não espera abas fecharem)
  self.skipWaiting();
});

// Ativa e limpa caches antigos
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      // Avisa todas as abas que tem versão nova
      return self.clients.matchAll();
    }).then(function(clients) {
      clients.forEach(function(client) {
        client.postMessage({ type: 'NEXO_UPDATE', version: CACHE_VERSION });
      });
    })
  );
  self.clients.claim();
});

// Estratégia: Cache primeiro, depois rede (para assets)
// Rede sempre para chamadas à API
self.addEventListener('fetch', function(e) {
  // Nunca cachear chamadas ao Apps Script
  if (e.request.url.indexOf('script.google.com') >= 0) return;
  if (e.request.url.indexOf('googleapis.com') >= 0) return;
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      // Busca da rede em paralelo para atualizar cache
      var fetchPromise = fetch(e.request).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function() {
        return cached;
      });

      // Retorna cache imediato se disponível, senão espera rede
      return cached || fetchPromise;
    })
  );
});
