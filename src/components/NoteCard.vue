<template>
  <div 
    class="note-card"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
    @touchcancel="handleTouchEnd"
    @mousedown="handleMouseDown"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
    @contextmenu.prevent="handleContextMenu"
  >
    <div class="note-content">
      <!-- Exibir imagem se for uma nota de imagem -->
      <div v-if="note.type === 'image' && note.imageData" class="note-image-container">
        <img 
          :src="note.imageData" 
          :alt="note.imageName || 'Imagem da anotação'"
          class="note-image"
          @click="openImageModal"
        />
        <div v-if="note.imageName" class="image-name">{{ note.imageName }}</div>
      </div>
      
      <!-- Exibir texto se houver -->
      <div v-if="note.content" class="note-text">
        {{ note.content }}
      </div>
    </div>
    <button 
      class="copy-btn"
      @click.stop="copyToClipboard"
      @mousedown.stop
      @touchstart.stop
      :aria-label="copied ? 'Copiado!' : 'Copiar anotação'"
      :class="{ 'copied': copied }"
    >
      <svg v-if="!copied" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
      <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20,6 9,17 4,12"/>
      </svg>
    </button>

    <!-- Menu de Contexto -->
    <div v-if="showMenu" class="context-menu" :style="menuPosition">
      <button class="menu-item delete-item" @click="deleteNote">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c0-1 1-2 2-2v2"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
        Excluir
      </button>
    </div>

    <!-- Overlay para fechar menu -->
    <div v-if="showMenu" class="menu-overlay" @click="hideContextMenu"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, onMounted } from 'vue'
import type { Note } from '@/stores/notes'

interface Props {
  note: Note
}

interface Emits {
  delete: [id: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const copied = ref(false)
const showMenu = ref(false)
const menuPosition = ref({ top: '0px', left: '0px' })
const longPressTimer = ref<number | null>(null)
const longPressDuration = 500 // 500ms para ativar
const isLongPressing = ref(false)

const copyToClipboard = async () => {
  try {
    let textToCopy = props.note.content
    
    // Se for uma imagem, copiar o nome do arquivo ou uma descrição
    if (props.note.type === 'image') {
      textToCopy = props.note.imageName || 'Imagem da anotação'
      if (props.note.content) {
        textToCopy += ` - ${props.note.content}`
      }
    }
    
    await navigator.clipboard.writeText(textToCopy)
    copied.value = true
    
    // Reset o estado após 2 segundos
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (error) {
    console.error('Erro ao copiar para área de transferência:', error)
    
    // Fallback para navegadores mais antigos
    try {
      let textToCopy = props.note.content
      
      if (props.note.type === 'image') {
        textToCopy = props.note.imageName || 'Imagem da anotação'
        if (props.note.content) {
          textToCopy += ` - ${props.note.content}`
        }
      }
      
      const textArea = document.createElement('textarea')
      textArea.value = textToCopy
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      textArea.remove()
      
      copied.value = true
      setTimeout(() => {
        copied.value = false
      }, 2000)
    } catch (fallbackError) {
      console.error('Erro no fallback de cópia:', fallbackError)
    }
  }
}

const openImageModal = () => {
  if (props.note.type === 'image' && props.note.imageData) {
    // Abrir imagem em nova aba
    const newWindow = window.open()
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>${props.note.imageName || 'Imagem da anotação'}</title>
            <style>
              body { margin: 0; padding: 20px; background: #000; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
              img { max-width: 100%; max-height: 100%; object-fit: contain; }
            </style>
          </head>
          <body>
            <img src="${props.note.imageData}" alt="${props.note.imageName || 'Imagem da anotação'}" />
          </body>
        </html>
      `)
    }
  }
}

// Funções para Long Press (Touch)
const handleTouchStart = (event: TouchEvent) => {
  if (event.target && (event.target as Element).closest('.copy-btn')) {
    return // Não ativar long press no botão de copiar
  }
  
  const touch = event.touches[0]
  startLongPress(touch.clientX, touch.clientY)
}

const handleTouchEnd = () => {
  cancelLongPress()
}

// Funções para Long Press (Mouse)
const handleMouseDown = (event: MouseEvent) => {
  if (event.target && (event.target as Element).closest('.copy-btn')) {
    return // Não ativar long press no botão de copiar
  }
  
  // Só ativar long press no botão esquerdo
  if (event.button === 0) {
    startLongPress(event.clientX, event.clientY)
  }
}

const handleMouseUp = () => {
  cancelLongPress()
}

// Função para context menu (botão direito)
const handleContextMenu = (event: MouseEvent) => {
  event.preventDefault()
  if (event.target && (event.target as Element).closest('.copy-btn')) {
    return // Não mostrar menu no botão de copiar
  }
  showContextMenu(event.clientX, event.clientY)
}

// Iniciar Long Press
const startLongPress = (x: number, y: number) => {
  // Cancelar qualquer timer anterior
  cancelLongPress()
  
  isLongPressing.value = true
  
  longPressTimer.value = window.setTimeout(() => {
    if (isLongPressing.value) {
      showContextMenu(x, y)
    }
  }, longPressDuration)
}

// Cancelar Long Press
const cancelLongPress = () => {
  isLongPressing.value = false
  
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
}

// Mostrar menu de contexto
const showContextMenu = (x?: number, y?: number) => {
  // Esconder menu anterior primeiro
  hideContextMenu()
  
  if (x !== undefined && y !== undefined) {
    // Usar setTimeout para garantir que a posição seja calculada corretamente
    setTimeout(() => {
      const menuWidth = 120
      const menuHeight = 50
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const padding = 10
      
      let adjustedX = Math.max(padding, Math.min(x, viewportWidth - menuWidth - padding))
      let adjustedY = Math.max(padding, Math.min(y, viewportHeight - menuHeight - padding))
      
      menuPosition.value = {
        top: `${adjustedY}px`,
        left: `${adjustedX}px`
      }
      
      showMenu.value = true
    }, 10)
  } else {
    showMenu.value = true
  }
}

// Esconder menu de contexto
const hideContextMenu = () => {
  showMenu.value = false
}

// Excluir nota
const deleteNote = () => {
  emit('delete', props.note.id)
  hideContextMenu()
}

// Listener global para fechar menu
const handleGlobalClick = (event: Event) => {
  if (showMenu.value && event.target) {
    const target = event.target as Element
    if (!target.closest('.context-menu') && !target.closest('.note-card')) {
      hideContextMenu()
    }
  }
}

// Lifecycle hooks
onMounted(() => {
  document.addEventListener('click', handleGlobalClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick)
  cancelLongPress()
  hideContextMenu()
})

</script>

<style scoped>
.note-card {
  background: #eeeeee;
  /* border-radius: 12px; */
  padding: 16px;
  /* border: 1px solid #e9ecef; */
  transition: all 0.2s ease;
  position: relative;
}

.note-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}


.copy-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(255, 255, 255, 0.8);
  border: none;
  color: #6c757d;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  opacity: 1;
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.copy-btn:hover {
  background: rgba(255, 255, 255, 0.95);
  color: #007bff;
  transform: scale(1.05);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.copy-btn.copied {
  color: #28a745;
  background: rgba(40, 167, 69, 0.15);
  opacity: 1;
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 8px rgba(40, 167, 69, 0.2);
}

.copy-btn.copied:hover {
  background: rgba(40, 167, 69, 0.2);
  transform: scale(1.05);
}

.note-content {
  color: #212529;
  line-height: 1.5;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.note-image-container {
  margin-bottom: 8px;
}

.note-image {
  width: 100%;
  max-height: 300px;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.note-image:hover {
  transform: scale(1.02);
}

.image-name {
  font-size: 12px;
  color: #6c757d;
  margin-top: 4px;
  font-style: italic;
}

.note-text {
  margin-top: 8px;
}

/* Menu de Contexto */
.context-menu {
  position: fixed;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  padding: 4px;
  z-index: 1000;
  min-width: 120px;
  animation: menuFadeIn 0.2s ease-out;
}

@keyframes menuFadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #212529;
  transition: all 0.2s ease;
}

.menu-item:hover {
  background: rgba(0, 0, 0, 0.05);
}

.delete-item {
  color: #dc3545;
}

.delete-item:hover {
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
}

.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
  background: transparent;
}
</style>
