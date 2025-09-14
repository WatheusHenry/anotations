<!-- eslint-disable @typescript-eslint/no-unsafe-function-type -->
<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<!-- eslint-disable @typescript-eslint/no-unused-vars -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNotesStore } from '@/stores/notes'
import NoteCard from '@/components/NoteCard.vue'
import DateHeader from '@/components/DateHeader.vue'

const notesStore = useNotesStore()
const newNote = ref('')
const searchQuery = ref('')
const isSearchExpanded = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const isAddingNote = ref(false)
const noteInputRef = ref<HTMLInputElement | null>(null)

// Variáveis para swipe up
const isSwipingUp = ref(false)
const swipeStartY = ref(0)
const swipeStartTime = ref(0)

// Debounce para prevenir múltiplos cliques
const isProcessing = ref(false)
const debounceTime = 300 // ms

const addNote = async () => {
  // Prevenir múltiplos cliques/submissões
  if (newNote.value.trim() && !isAddingNote.value && !isProcessing.value) {
    isProcessing.value = true
    isAddingNote.value = true
    const content = newNote.value.trim()

    // Limpar o input imediatamente para evitar múltiplas submissões
    newNote.value = ''

    try {
      // Detectar se é um link
      const urlRegex = /(https?:\/\/[^\s]+)/g
      const urls = content.match(urlRegex)

      if (urls && urls.length > 0) {
        // Se contém links, salvar imediatamente como link básico
        const url = urls[0] // Usar o primeiro link encontrado

        try {
          // Salvar imediatamente com dados básicos
          const noteId = await notesStore.addLinkNote(
            url,
            new URL(url).hostname,
            '',
            '',
            content
          )

          // Buscar preview em background e atualizar
          fetchLinkPreview(url).then(linkData => {
            console.log('Preview carregado:', linkData)
            notesStore.updateLinkNote(noteId, {
              title: linkData.title,
              description: linkData.description,
              image: linkData.image
            })
          }).catch((error) => {
            console.error('Preview falhou:', error)
          })

        } catch (error) {
          console.error('Erro ao salvar link:', error)
          // Se falhar, salvar como texto normal
          await notesStore.addNote(content)
        }
      } else {
        // Adicionar como nota normal
        await notesStore.addNote(content)
      }

      // Esconder teclado no mobile
      if (noteInputRef.value) {
        noteInputRef.value.blur()
      }

      // Animação de feedback no input
      const inputContainer = document.querySelector('.input-container')
      if (inputContainer) {
        inputContainer.classList.add('note-added')
        setTimeout(() => {
          inputContainer.classList.remove('note-added')
        }, 300)
      }
    } catch (error) {
      console.error('Erro ao salvar nota:', error)
      // Se falhar, adicionar como nota normal
      await notesStore.addNote(content)

      // Esconder teclado mesmo em caso de erro
      if (noteInputRef.value) {
        noteInputRef.value.blur()
      }
    } finally {
      isAddingNote.value = false
      // Reset do debounce após um tempo
      setTimeout(() => {
        isProcessing.value = false
      }, debounceTime)
    }
  }
}

const handleKeyPress = async (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    await addNote()
  }
}

const handleKeyDown = async (event: KeyboardEvent) => {
  // Capturar Enter tanto no keypress quanto no keydown para melhor compatibilidade mobile
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    await addNote()
  }
}

const deleteNote = async (id: string) => {
  await notesStore.removeNote(id)
}

const expandSearch = () => {
  isSearchExpanded.value = true
}

const collapseSearch = () => {
  if (!searchQuery.value.trim()) {
    isSearchExpanded.value = false
  }
}

const handleSearchBlur = () => {
  setTimeout(() => {
    if (!searchQuery.value.trim()) {
      isSearchExpanded.value = false
    }
  }, 150)
}

const clearSearch = () => {
  searchQuery.value = ''
  isSearchExpanded.value = false
}



const filteredGroupedNotes = computed(() => {
  if (!searchQuery.value.trim()) {
    return notesStore.groupedNotesByDate
  }

  const filtered: { [key: string]: any[] } = {}
  const searchTerm = searchQuery.value.toLowerCase()

  Object.entries(notesStore.groupedNotesByDate).forEach(([dateKey, notes]) => {
    const filteredNotes = notes.filter(note =>
      note.content.toLowerCase().includes(searchTerm)
    )

    if (filteredNotes.length > 0) {
      filtered[dateKey] = filteredNotes
    }
  })

  return filtered
})

const hasAnyNotes = computed(() => {
  return Object.keys(filteredGroupedNotes.value).length > 0
})

const totalFilteredNotes = computed(() => {
  return Object.values(filteredGroupedNotes.value).reduce((total, notes) => total + notes.length, 0)
})

const triggerImageUpload = () => {
  fileInput.value?.click()
}

const handleImageUpload = async (event: Event) => {
  // Prevenir múltiplos uploads
  if (isProcessing.value) return

  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (file) {
    isProcessing.value = true
    // Verificar se é uma imagem
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem (JPG, PNG, GIF, etc.).')
      return
    }

    // Verificar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem é muito grande. Por favor, selecione uma imagem menor que 5MB.')
      return
    }

    try {
      const imageData = await convertFileToBase64(file)
      await notesStore.addImageNote(imageData, file.name)

      // Esconder teclado no mobile se estiver focado
      if (noteInputRef.value && document.activeElement === noteInputRef.value) {
        noteInputRef.value.blur()
      }

      // Feedback visual
      const inputContainer = document.querySelector('.input-container')
      if (inputContainer) {
        inputContainer.classList.add('note-added')
        setTimeout(() => {
          inputContainer.classList.remove('note-added')
        }, 300)
      }
    } catch (error) {
      console.error('Erro ao processar imagem:', error)
      alert('Erro ao processar a imagem. Tente novamente.')
    }

    // Limpar input
    target.value = ''

    // Reset do debounce
    setTimeout(() => {
      isProcessing.value = false
    }, debounceTime)
  }
}

const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Erro ao converter arquivo'))
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const fetchLinkPreview = async (url: string) => {
  console.log('🔍 Buscando preview para:', url)

  const fallbackData = () => {
    try {
      return {
        title: new URL(url).hostname,
        description: '',
        image: ''
      }
    } catch {
      return { title: url, description: '', image: '' }
    }
  }

  try {
    new URL(url) // Validar URL

    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
    console.log('📡 Proxy URL:', proxyUrl)

    const response = await fetch(proxyUrl)

    if (!response.ok) {
      console.warn('❌ Response not OK:', response.status)
      return fallbackData()
    }

    const data = await response.json()
    console.log('📦 Data received:', !!data.contents)

    if (data.contents) {
      const doc = new DOMParser().parseFromString(data.contents, 'text/html')

      const title =
        doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
        doc.querySelector('title')?.textContent ||
        new URL(url).hostname

      const description =
        doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
        doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
        ''

      let image =
        doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
        ''

      if (image && !image.startsWith('http')) {
        try {
          image = new URL(image, url).href
        } catch {
          image = ''
        }
      }

      const result = {
        title: title?.trim() || new URL(url).hostname,
        description: description?.trim() || '',
        image: image || ''
      }

      console.log('✅ Preview extraído:', result)
      return result
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  }

  return fallbackData()
}

// Prevenir zoom e gestos indesejados
const preventZoom = () => {
  // Prevenir zoom com gestos
  document.addEventListener('gesturestart', (e) => {
    e.preventDefault()
  }, { passive: false })

  document.addEventListener('gesturechange', (e) => {
    e.preventDefault()
  }, { passive: false })

  document.addEventListener('gestureend', (e) => {
    e.preventDefault()
  }, { passive: false })

  // Prevenir zoom duplo-clique
  let lastTouchEnd = 0
  document.addEventListener('touchend', (e) => {
    const now = Date.now()
    if (now - lastTouchEnd <= 300) {
      e.preventDefault()
    }
    lastTouchEnd = now
  }, { passive: false })

  // Prevenir zoom com roda do mouse + Ctrl
  document.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
      e.preventDefault()
    }
  }, { passive: false })

  // Prevenir zoom com teclado
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '0')) {
      e.preventDefault()
    }
  })
}

// Função utilitária de debounce
const debounce = (func: Function, wait: number) => {
  let timeout: ReturnType<typeof setTimeout>
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Inicializar prevenção de zoom
preventZoom()

// Função para lidar com Share Target API
const handleShareTarget = async () => {
  // Verificar se foi aberto via share target
  const urlParams = new URLSearchParams(window.location.search)
  const sharedTitle = urlParams.get('title')
  const sharedText = urlParams.get('text')
  const sharedUrl = urlParams.get('url')

  console.log('Share Target detectado:', { sharedTitle, sharedText, sharedUrl })

  // Se há dados compartilhados, processar
  if (sharedTitle || sharedText || sharedUrl) {
    let content = ''

    // Construir o conteúdo da nota
    if (sharedTitle && sharedTitle !== sharedUrl) {
      content += sharedTitle
    }

    if (sharedText && sharedText !== sharedTitle && sharedText !== sharedUrl) {
      if (content) content += '\n\n'
      content += sharedText
    }

    if (sharedUrl) {
      if (content) content += '\n\n'
      content += sharedUrl
    }

    // Se há conteúdo, salvar automaticamente
    if (content.trim()) {
      try {
        // Detectar se é um link
        const urlRegex = /(https?:\/\/[^\s]+)/g
        const urls = content.match(urlRegex)

        if (urls && urls.length > 0) {
          // Se contém links, salvar como link
          const url = urls[0]

          const noteId = await notesStore.addLinkNote(
            url,
            sharedTitle || new URL(url).hostname,
            '',
            '',
            content
          )

          // Buscar preview em background
          fetchLinkPreview(url).then(linkData => {
            notesStore.updateLinkNote(noteId, {
              title: linkData.title,
              description: linkData.description,
              image: linkData.image,
              favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`
            })
          }).catch(console.error)
        } else {
          // Salvar como nota normal
          await notesStore.addNote(content)
        }

        // Limpar URL para evitar reprocessamento
        window.history.replaceState({}, document.title, window.location.pathname)

        // Mostrar feedback visual e notificação
        showShareSuccessNotification()

      } catch (error) {
        console.error('Erro ao salvar conteúdo compartilhado:', error)
        showShareErrorNotification()
      }
    }
  }
}

// Função para mostrar notificação de sucesso
const showShareSuccessNotification = () => {
  const notification = document.createElement('div')
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #28a745;
      color: white;
      padding: 12px 24px;
      border-radius: 25px;
      font-family: 'Onest', sans-serif;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
      animation: slideDown 0.3s ease-out;
    ">
      ✓ Conteúdo salvo com sucesso!
    </div>
  `

  const style = document.createElement('style')
  style.textContent = `
    @keyframes slideDown {
      from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
  `
  document.head.appendChild(style)
  document.body.appendChild(notification)

  setTimeout(() => {
    notification.style.animation = 'slideDown 0.3s ease-out reverse'
    setTimeout(() => {
      if (document.body.contains(notification)) document.body.removeChild(notification)
      if (document.head.contains(style)) document.head.removeChild(style)
    }, 300)
  }, 3000)
}

// Função para mostrar notificação de erro
const showShareErrorNotification = () => {
  const notification = document.createElement('div')
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #dc3545;
      color: white;
      padding: 12px 24px;
      border-radius: 25px;
      font-family: 'Onest', sans-serif;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
    ">
      ✗ Erro ao salvar conteúdo
    </div>
  `

  document.body.appendChild(notification)
  setTimeout(() => {
    if (document.body.contains(notification)) document.body.removeChild(notification)
  }, 3000)
}

// Detectar iOS e mostrar instruções se necessário
const detectiOS = () => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone

  if (isIOS && !isStandalone) {
    // Mostrar instruções para adicionar à tela inicial no iOS
    setTimeout(() => {
      const instruction = document.createElement('div')
      instruction.innerHTML = `
        <div style="
          position: fixed;
          bottom: 20px;
          left: 20px;
          right: 20px;
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 16px;
          border-radius: 12px;
          font-family: 'Onest', sans-serif;
          font-size: 14px;
          z-index: 10000;
          text-align: center;
          animation: slideUp 0.3s ease-out;
        ">
          <div style="margin-bottom: 8px;">📱 Para adicionar esse aplicativo:</div>
          <div style="font-size: 12px; opacity: 0.8;">
            Toque em <strong>Compartilhar</strong> → <strong>Adicionar à Tela Inicial</strong>
          </div>
          <button onclick="this.parentElement.parentElement.remove()" style="
            background: white;
            color: black;
            border: none;
            padding: 8px 16px;
            border-radius: 20px;
            margin-top: 12px;
            font-family: 'Onest', sans-serif;
            font-weight: 500;
            cursor: pointer;
          ">Entendi</button>
        </div>
      `

      const style = document.createElement('style')
      style.textContent = `
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `
      document.head.appendChild(style)
      document.body.appendChild(instruction)

      // Remover automaticamente após 10 segundos
      setTimeout(() => {
        if (document.body.contains(instruction)) {
          instruction.remove()
        }
        if (document.head.contains(style)) {
          style.remove()
        }
      }, 10000)
    }, 2000)
  }
}

// Inicializar Share Target e detecção iOS
handleShareTarget()
detectiOS()

// Funções para swipe up no input
const handleSwipeStart = (event: TouchEvent) => {
  const touch = event.touches[0]
  swipeStartY.value = touch.clientY
  swipeStartTime.value = Date.now()
  isSwipingUp.value = false
}

const handleSwipeMove = (event: TouchEvent) => {
  if (!swipeStartY.value) return

  const touch = event.touches[0]
  const deltaY = swipeStartY.value - touch.clientY
  const deltaTime = Date.now() - swipeStartTime.value

  // Detectar swipe up: movimento para cima > 20px em menos de 400ms
  if (deltaY > 20 && deltaTime < 400) {
    isSwipingUp.value = true

    // Feedback tátil se disponível
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }
  }
}

const handleSwipeEnd = () => {
  if (isSwipingUp.value && noteInputRef.value) {
    // Focar no input e mostrar teclado
    noteInputRef.value.focus()

    // Scroll suave para o input (caso necessário)
    noteInputRef.value.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    })
  }

  // Reset
  swipeStartY.value = 0
  swipeStartTime.value = 0
  isSwipingUp.value = false
}
</script>

<template>
  <div class="app">

    <main class="app-main">

      <!-- Lista de Anotações -->
      <div class="notes-container">
        <template v-if="totalFilteredNotes === 0">
          <Transition name="empty-state" mode="out-in">
            <div v-if="searchQuery" class="empty-state" key="search-empty">
              <div class="empty-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                  <path d="M16 8a8 8 0 0 0-8 0" />
                </svg>
              </div>
              <h3 class="empty-title">Nenhuma anotação encontrada</h3>
              <p class="empty-subtitle">Tente pesquisar por outro termo</p>
            </div>

            <div v-else class="empty-state" key="no-notes">
              <div class="empty-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14,2 14,8 20,8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10,9 9,9 8,9" />
                </svg>
              </div>
              <h3 class="empty-title">Nenhuma anotação ainda</h3>
              <p class="empty-subtitle">Comece escrevendo sua primeira anotação abaixo</p>
            </div>
          </Transition>
        </template>

        <template v-else>
          <div v-for="(notes, dateKey) in filteredGroupedNotes" :key="dateKey" class="date-group">
            <DateHeader :date-label="String(dateKey)" />
            <div class="notes-group">
              <TransitionGroup name="note" tag="div" class="notes-list">
                <NoteCard v-for="note in notes" :key="note.id" :note="note" @delete="deleteNote" />
              </TransitionGroup>
            </div>
          </div>
        </template>
      </div>
    </main>

    <!-- Barra de Pesquisa -->
    <div class="search-container">
      <div class="search-input-wrapper" :class="{ 'expanded': isSearchExpanded }">
        <input v-model="searchQuery" type="text" :placeholder="isSearchExpanded ? 'Pesquisar' : 'Pesquisar'"
          class="search-input" :class="{ 'expanded': isSearchExpanded, 'has-content': searchQuery.trim() }"
          @focus="expandSearch" @blur="handleSearchBlur" />
        <button v-if="searchQuery.trim()" @click="clearSearch" class="clear-search-btn" aria-label="Limpar pesquisa">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
    <!-- Input para Nova Anotação -->
    <footer class="app-footer" @touchstart="handleSwipeStart" @touchmove="handleSwipeMove" @touchend="handleSwipeEnd">
      <!-- Área de swipe up -->
      <div class="swipe-indicator" :class="{ 'active': isSwipingUp }">
        <div class="swipe-handle"></div>
      </div>

      <form @submit.prevent="addNote" class="note-form">
        <div class="input-container">
          <input ref="noteInputRef" v-model="newNote" type="text" placeholder="Salvar uma nota..." class="note-input"
            enterkeyhint="send" autocomplete="off" autocapitalize="sentences" @keypress="handleKeyPress"
            @keydown="handleKeyDown" />
          <div class="action-buttons">
            <button type="button" @click="triggerImageUpload" class="image-btn" aria-label="Adicionar imagem">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21,15 16,10 5,21" />
              </svg>
            </button>
            <button type="submit" :disabled="!newNote.trim() || isAddingNote" class="send-btn"
              :class="{ 'loading': isAddingNote }" aria-label="Adicionar anotação">
              <svg v-if="!isAddingNote" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22,2 15,22 11,13 2,9 22,2" />
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                class="loading-spinner">
                <circle cx="12" cy="12" r="10" />
                <path
                  d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </button>
          </div>
        </div>
      </form>

      <!-- Input de arquivo oculto -->
      <input ref="fileInput" type="file" accept="image/*" @change="handleImageUpload" style="display: none" />
    </footer>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  /* Desabilitar seleção de texto em toda a aplicação */
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  /* Desabilitar highlight de toque no mobile */
  -webkit-tap-highlight-color: transparent;
  /* Prevenir zoom e comportamentos indesejados */
  touch-action: manipulation;
  -webkit-touch-callout: none;
  -webkit-text-size-adjust: 100%;
  -ms-text-size-adjust: 100%;
  /* Prevenir scroll horizontal */
  overflow-x: hidden;
  /* Melhorar performance de scroll */
  -webkit-overflow-scrolling: touch;
  /* Aplicar fonte Onest */
  font-family: 'Onest', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
}

.app-header {
  background: #ffffff;
  padding: 20px 16px 16px;
  border-bottom: 1px solid #e9ecef;
  position: sticky;
  top: 0;
  z-index: 10;
}

.app-title {
  font-size: 24px;
  font-weight: 700;
  color: #212529;
  margin: 0;
  text-align: center;
  font-family: 'Onest', sans-serif;
}

.app-main {
  flex: 1;
  padding: 16px;
  padding-bottom: 100px;
  overflow-y: auto;
}

.search-container {
  width: fit-content;
  margin-bottom: 20px;
  position: fixed;
  bottom: 8%;
  left: 0;
  right: 0;
  margin-inline: auto;
  z-index: 10;
  padding-bottom: 3rem;
  min-width: 290px;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}


.search-input {
  padding: 8px 12px 8px 12px;
  border: 1px solid #EAE4E4;
  border-radius: 25px;
  font-size: 16px;
  background: #FFFFFF;
  color: #6c757d;
  outline: none;
  text-align: center;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: center;
  box-shadow:
    0 3px 30px rgba(0, 0, 0, 0.2),
    0 1px 3px rgba(0, 0, 0, 0.1);
  width: 280px;
  /* Permitir seleção no input de pesquisa */
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
  font-family: 'Onest', sans-serif;
  font-weight: 400;
}

.search-input-wrapper:has(.clear-search-btn) .search-input {
  padding-right: 45px;
  /* Espaço para o botão de limpar */
}

/* Fallback para navegadores que não suportam :has() */
.search-input.has-content {
  padding-right: 45px;
}

.search-input.expanded {
  /* Estado expandido - maior */
  width: 350px;
  color: #212529;
  text-align: start;
  transform: scaleX(1.05);
  animation: expandFromCenter 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes expandFromCenter {
  0% {
    transform: scaleX(1);
  }

  50% {
    transform: scaleX(1.08);
  }

  100% {
    transform: scaleX(1);
  }
}

@keyframes contractToCenter {
  0% {
    transform: scaleX(1);
  }

  50% {
    transform: scaleX(0.95);
  }

  100% {
    transform: scaleX(1);
  }
}

.search-input:not(.expanded) {
  animation: contractToCenter 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.search-input::placeholder {
  color: #6c757d;
  transition: opacity 0.3s ease;
}

.search-input::-webkit-input-placeholder {
  color: #6c757d;
}

.search-input::-moz-placeholder {
  color: #6c757d;
  opacity: 1;
}

.search-input:-ms-input-placeholder {
  color: #6c757d;
}

.search-input:not(.expanded)::placeholder {
  opacity: 0.9;
}

.search-input:focus,
.search-input.expanded:focus {
  border-color: #007bff;
  background: #ffffff;
  color: #212529;
  box-shadow:
    0 3px 30px rgba(0, 0, 0, 0.25),
    0 1px 3px rgba(0, 0, 0, 0.1),
    0 0 0 3px rgba(0, 123, 255, 0.1);
}

.clear-search-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%) scale(0.8);
  background: rgba(108, 117, 125, 0.1);
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6c757d;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  opacity: 0;
  animation: clearBtnAppear 0.3s ease-out 0.1s forwards;
}

.clear-search-btn:hover {
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
  transform: translateY(-50%) scale(1);
}

.clear-search-btn:active {
  transform: translateY(-50%) scale(0.9);
  background: rgba(220, 53, 69, 0.2);
}

@keyframes clearBtnAppear {
  0% {
    opacity: 0;
    transform: translateY(-50%) scale(0.5);
  }

  100% {
    opacity: 0.8;
    transform: translateY(-50%) scale(1);
  }
}

.notes-container {
  margin-bottom: 20px;
}

.date-group {
  margin-bottom: 8px;
}

.date-group:last-child {
  margin-bottom: 0;
}

.notes-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notes-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Animações de Transição para Notas */
.note-enter-active {
  animation: noteSlideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.note-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.note-enter-from {
  opacity: 0;
}

.note-leave-to {
  opacity: 0;
  transform: translateX(-50px) scale(0.9);
  max-height: 0;
  margin-bottom: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.note-move {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes noteSlideIn {
  0% {
    opacity: 0;
    transform: translateY(-30px) scale(0.9);
  }

  60% {
    opacity: 0.8;
    transform: translateY(5px) scale(1.02);
  }

  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #6c757d;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  animation: emptyStateAppear 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.empty-icon {
  margin-bottom: 24px;
  color: #bdc3c7;
  animation: iconFloat 3s ease-in-out infinite;
}

.empty-icon svg {
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
}

.empty-title {
  font-size: 20px;
  font-weight: 700;
  color: #495057;
  margin: 0 0 12px 0;
  animation: titleSlideUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both;
  font-family: 'Onest', sans-serif;
}

.empty-subtitle {
  font-size: 16px;
  margin: 0;
  color: #6c757d;
  line-height: 1.5;
  animation: subtitleSlideUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s both;
  font-family: 'Onest', sans-serif;
  font-weight: 400;
}

/* Animações do estado vazio */
@keyframes emptyStateAppear {
  0% {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }

  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes iconFloat {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-8px);
  }
}

@keyframes titleSlideUp {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes subtitleSlideUp {
  0% {
    opacity: 0;
    transform: translateY(15px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Transições do estado vazio */
.empty-state-enter-active {
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.empty-state-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 1, 1);
}

.empty-state-enter-from {
  opacity: 0;
  transform: scale(0.8) translateY(30px);
}

.empty-state-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(-20px);
}

.app-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(233, 236, 239, 0.3);
  border-radius: 2.5rem 2.5rem 0 0;
  padding: 8px 50px 20px;
  z-index: 10;
  box-shadow:
    0 3px 30px rgba(0, 0, 0, 0.2),
    0 1px 3px rgba(0, 0, 0, 0.1);
}

.swipe-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 0 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.swipe-handle {
  width: 40px;
  height: 4px;
  background: #e9ecef;
  border-radius: 2px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.swipe-indicator.active .swipe-handle {
  background: #007bff;
  width: 60px;
  height: 5px;
  animation: swipeUpPulse 0.3s ease-out;
}

@keyframes swipeUpPulse {
  0% {
    transform: scaleX(1);
    background: #e9ecef;
  }

  50% {
    transform: scaleX(1.2);
    background: #007bff;
  }

  100% {
    transform: scaleX(1);
    background: #007bff;
  }
}

.note-form {
  width: 100%;
}

.input-container {
  display: flex;
  align-items: center;
  width: 90%;
  margin: 0 auto;
  position: relative;
  background: #FFFFFF;
  border: 1px solid #EAE4E4;
  border-radius: 20px;
  padding: 4px;
  box-shadow:
    0 2px 15px rgba(0, 0, 0, 0.1),
    0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.action-buttons {
  display: flex;
  align-items: center;
}

.note-input {
  flex: 1;
  padding: 10px 10px;
  border: none;
  border-radius: 20px;
  font-size: 16px;
  font-family: 'Onest', sans-serif;
  font-weight: 400;
  outline: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  height: 40px;
  background: transparent !important;
  color: #212529;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  /* Permitir seleção no input de nova nota */
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
}

.note-input:focus {
  background: transparent !important;
  outline: none !important;
}

.note-input:active,
.note-input:hover,
.note-input:-webkit-autofill,
.note-input:-webkit-autofill:hover,
.note-input:-webkit-autofill:focus {
  background: transparent !important;
  -webkit-box-shadow: 0 0 0 1000px transparent inset !important;
  box-shadow: 0 0 0 1000px transparent inset !important;
}

.input-container:focus-within {
  border-color: #007bff;
}

.input-container.note-added {
  animation: noteAddedPulse 0.3s ease-out;
}

@keyframes noteAddedPulse {
  0% {
    transform: scale(1);
    border-color: #EAE4E4;
  }

  50% {
    transform: scale(1.02);
    border-color: #28a745;
    box-shadow:
      0 4px 20px rgba(0, 0, 0, 0.15),
      0 2px 8px rgba(0, 0, 0, 0.1),
      0 0 0 3px rgba(40, 167, 69, 0.2);
  }

  100% {
    transform: scale(1);
    border-color: #EAE4E4;
  }
}

.note-input::placeholder {
  color: #6c757d;
  transition: opacity 0.3s ease;
}

.note-input::-webkit-input-placeholder {
  color: #6c757d;
}

.note-input::-moz-placeholder {
  color: #6c757d;
  opacity: 1;
}

.note-input:-ms-input-placeholder {
  color: #6c757d;
}

.send-btn {
  background: transparent;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #007bff;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  padding: 0.5rem;
}

.send-btn:hover:not(:disabled) {
  /* background: rgba(0, 123, 255, 0.1); */
  color: #0056b3;
  transform: scale(1.1);
}

.send-btn:active:not(:disabled) {
  transform: scale(0.95);
  transition: all 0.1s ease;
}

.send-btn:disabled {
  color: #BFBFBF;
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
}

.send-btn.loading {
  color: #007bff;
  opacity: 1;
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.image-btn {
  background: transparent;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #BFBFBF;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.image-btn:hover {
  background: rgba(0, 123, 255, 0.1);
  color: #0056b3;
  transform: scale(1.1);
}

.image-btn:active {
  transform: scale(0.95);
}

/* Responsividade */
@media (max-width: 768px) {
  .app-header {
    padding: 16px;
  }

  .app-title {
    font-size: 20px;
  }

  .app-main {
    padding: 12px;
    padding-bottom: 100px;
  }

  .app-footer {
    height: 110px;
    padding: 8px 12px 50px 12px;
  }

  .swipe-indicator {
    padding: 6px 0 8px;
  }

  .swipe-handle {
    width: 35px;
    height: 3px;
  }

  .swipe-indicator.active .swipe-handle {
    width: 50px;
    height: 4px;
  }

  .input-container {
    padding-inline: 10px;
  }

  .note-input {
    padding: 10px 6px;
    height: 36px;
  }

  .send-btn {
    width: 36px;
    height: 36px;
  }

  /* Ajustes do input de pesquisa para mobile */
  .search-input {
    width: 130px;
    /* Tamanho maior para não cortar "Pesquisar" */
  }

  .search-input.expanded {
    width: 100%;
  }
}

/* Para telas muito pequenas */
@media (max-width: 480px) {
  .search-container {
    min-width: 140px;
  }

  .search-input {
    width: 120px;
  }

  .search-input.expanded {
    width: 100%;
  }

  .empty-state {
    padding: 40px 16px;
    min-height: 250px;
  }

  .empty-icon svg {
    width: 48px;
    height: 48px;
  }

  .empty-title {
    font-size: 18px;
  }

  .empty-subtitle {
    font-size: 14px;
  }

  .clear-search-btn {
    width: 24px;
    height: 24px;
    right: 8px;
  }

  .clear-search-btn svg {
    width: 14px;
    height: 14px;
  }
}

/* Ajustes para PWA */
@media (display-mode: standalone) {
  .app {
    padding-top: env(safe-area-inset-top, 0);
    padding-bottom: env(safe-area-inset-bottom, 0);
    padding-left: env(safe-area-inset-left, 0);
    padding-right: env(safe-area-inset-right, 0);
  }

  .app-header {
    padding-top: calc(env(safe-area-inset-top, 0) + 20px);
  }

  .app-footer {
    padding-bottom: calc(env(safe-area-inset-bottom, 0) + 16px);
  }
}

/* Melhorias específicas para iOS PWA */
@supports (-webkit-touch-callout: none) {
  .app {
    /* Prevenir bounce scroll no iOS */
    overscroll-behavior-y: none;
  }

  body {
    /* Fixar altura no iOS para evitar problemas com a barra de endereços */
    height: -webkit-fill-available;
  }
}

/* Regras globais para desabilitar seleção */
button,
svg,
.empty-state,
.action-buttons {
  -webkit-user-select: none !important;
  -moz-user-select: none !important;
  -ms-user-select: none !important;
  user-select: none !important;
  -webkit-tap-highlight-color: transparent !important;
}

/* Garantir que imagens não sejam selecionáveis */
img {
  -webkit-user-select: none !important;
  -moz-user-select: none !important;
  -ms-user-select: none !important;
  user-select: none !important;
  -webkit-user-drag: none !important;
  -khtml-user-drag: none !important;
  -moz-user-drag: none !important;
  -o-user-drag: none !important;
  user-drag: none !important;
  /* Prevenir zoom em imagens */
  touch-action: manipulation !important;
}

/* Estilos globais para prevenir zoom e melhorar PWA */
* {
  /* Prevenir zoom em elementos */
  touch-action: manipulation;
  /* Melhorar performance */
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  /* Aplicar fonte Onest globalmente */
  font-family: 'Onest', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
}

/* Prevenir zoom duplo-clique em toda a aplicação */
html {
  touch-action: manipulation;
  -webkit-text-size-adjust: 100%;
  -ms-text-size-adjust: 100%;
}

body {
  touch-action: manipulation;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  /* Prevenir scroll bounce no iOS */
  overscroll-behavior: none;
  /* Fixar altura para PWA */
  position: fixed;
  width: 100%;
  height: 100%;
  overflow: hidden;
  /* Aplicar fonte Onest */
  font-family: 'Onest', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
}

#app {
  width: 100%;
  height: 100%;
  overflow: auto;
  /* Melhorar scroll no mobile */
  -webkit-overflow-scrolling: touch;
}
</style>
