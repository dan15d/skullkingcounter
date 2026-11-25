/* Tanteo: permite jugar sin conexión.
   Red primero (para recibir cambios), caché si no hay red.
   Al añadir un juego, suma sus archivos a FILES y sube el número de CACHE. */
var CACHE = 'tanteo-v5';
var FILES = [
  './', 'index.html', 'hub.css', 'hub.js', 'games.js', 'manifest.webmanifest',
  'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png',
  'games/skull-king/', 'games/skull-king/index.html', 'games/skull-king/style.css', 'games/skull-king/app.js',
  'games/munchkin/', 'games/munchkin/index.html', 'games/munchkin/style.css', 'games/munchkin/app.js',
  'games/esquirlas/', 'games/esquirlas/index.html', 'games/esquirlas/style.css', 'games/esquirlas/app.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    // 'no-cache' obliga a revalidar con el servidor: los cambios se ven al momento.
    fetch(req.url, { cache: 'no-cache' }).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        if (hit) return hit;
        // Solo las páginas caen a la portada; el resto falla como fallaría sin red.
        return req.mode === 'navigate' ? caches.match('index.html') : Response.error();
      });
    })
  );
});
