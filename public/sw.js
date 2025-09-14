// Service Worker para Share Target API
const CACHE_NAME = 'anotacoes-app-v1'
const SHARE_TARGET_URL = '/share-target'

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

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Lidar com share target
  if (url.pathname === SHARE_TARGET_URL && event.request.method === 'POST') {
    event.respondWith(handleShareTarget(event.request))
  }
})

// Função para lidar com share target
async function handleShareTarget(request) {
  try {
    const formData = await request.formData()
    const title = formData.get('title') || ''
    const text = formData.get('text') || ''
    const url = formData.get('url') || ''

    // Construir URL com parâmetros
    const params = new URLSearchParams()
    if (title) params.set('title', title)
    if (text) params.set('text', text)
    if (url) params.set('url', url)

    // Redirecionar para a página principal com os dados
    const redirectUrl = `/?${params.toString()}`

    return Response.redirect(redirectUrl, 302)
  } catch (error) {
    console.error('Erro ao processar share target:', error)
    return Response.redirect('/', 302)
  }
}

// Cache básico para recursos estáticos
self.addEventListener('fetch', (event) => {
  // Pular share target (já tratado acima)
  if (event.request.url.includes('/share-target')) {
    return
  }

  // Cache para outros recursos
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
          })
        })
      })
    )
  }
})
