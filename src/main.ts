import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'

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

// PWA Auto-update
const updateSW = registerSW({
  onNeedRefresh() {
    // Mostrar notificação de atualização disponível
    if (confirm('Nova versão disponível! Deseja atualizar agora?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('App pronto para funcionar offline!')
  },
  onRegistered(r) {
    // Verificar por atualizações a cada 60 segundos
    r && setInterval(() => {
      r.update()
    }, 60000)
  },
  onRegisterError(error) {
    console.log('Erro ao registrar SW:', error)
  },
})
