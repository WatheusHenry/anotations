// Service Worker para Share Target API - Compatível com iOS
const CACHE_NAME = 'anotacoes-app-v1'

// Instalar service worker
self.addEventListener('install', (event) => {
  console.log('Service Worker instalado')
  self.skipWaiting()
})

// Ativar service worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker ativado')
  event.waitUntil(self.clients.claim())
})

// Cache básico para recursos estáticos
self.addEventListener('fetch', (event) => {
  // Cache para recursos estáticos
  if (event.request.destination === 'document' ||
      event.request.destination === 'script' ||
      event.request.destination === 'style' ||
      event.request.destination === 'image') {

    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(event.request).then(response => {
          if (response) {
            return response
          }

          return fetch(event.request).then(fetchResponse => {
            cache.put(event.request, fetchResponse.clone())
            return fetchResponse
          }).catch(() => {
            // Fallback em caso de erro
            return cache.match('/') || new Response('Offline')
          })
        })
      })
    )
  }
})
