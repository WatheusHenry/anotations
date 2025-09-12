import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import './style.css'
import { useNotesStore } from '@/stores/notes'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Inicializar IndexedDB e carregar notas
const notesStore = useNotesStore()
notesStore.loadNotes().catch(error => {
  console.error('Erro ao inicializar notas:', error)
})

app.mount('#app')

// Registrar Service Worker do PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registrado: ', registration)
      })
      .catch((registrationError) => {
        console.log('SW falhou ao registrar: ', registrationError)
      })
  })
}
