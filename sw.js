/* ============================================================
   sw.js: offline support for Winter Training Arc
   >>> REMINDER: every time you upload changed files, bump CACHE_VERSION below
   >>> AND APP_VERSION in app.js to the same number (e.g. 2.0.1), or phones keep the old files.
   test.html checks that the two match.
   Paths are relative, so this works at username.github.io/repo/.
   Your workout data is NOT here: it stays in the browser's localStorage.
   ============================================================ */
const CACHE_VERSION = 'wta-v2.0.0';
const CORE = ['./', './index.html', './plan.js', './app.js', './manifest.json'];
const OPTIONAL = ['./apple-touch-icon.png'];
 
self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE_VERSION).then(cache => {
    // cache:'reload' skips the browser's HTTP cache so a new version never stores stale files
    const get = u => fetch(new Request(u, {cache: 'reload'})).then(r => { if (!r.ok) throw new Error(u + ' ' + r.status); return cache.put(u, r); });
    return Promise.all(CORE.map(get).concat(OPTIONAL.map(u => get(u).catch(() => {}))));
  }));
  // No skipWaiting here: the page shows "Update ready" and the user decides when to reload.
});
 
self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('wta-') && k !== CACHE_VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
 
self.addEventListener('message', ev => { if (ev.data && ev.data.type === 'SKIP_WAITING') self.skipWaiting(); });
 
self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const scope = new URL(self.registration.scope);
  const rel = url.pathname.slice(scope.pathname.length);
  // App page (scope root or index.html): cache-first, so it opens with no signal
  if (req.mode === 'navigate' && (rel === '' || rel === 'index.html')) {
    ev.respondWith(caches.open(CACHE_VERSION).then(c => c.match('./index.html').then(hit => hit || fetch(req))));
    return;
  }
  // Everything else: cache-first, then network (test.html and other files are not pre-cached)
  ev.respondWith(caches.open(CACHE_VERSION).then(c => c.match(req, {ignoreSearch: true}).then(hit => hit || fetch(req))));
});
