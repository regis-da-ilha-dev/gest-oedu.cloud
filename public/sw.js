self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install');
});

self.addEventListener('fetch', (e) => {
  // Necessário para ser considerado PWA instalável
  e.respondWith(
    fetch(e.request).catch(() => {
      return new Response('Internet indisponível');
    })
  );
});
