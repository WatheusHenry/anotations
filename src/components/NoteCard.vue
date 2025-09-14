<template>
  <!-- Modal de imagem -->
  <div v-if="showImageModal" class="image-modal" @click="closeImageModal" @touchstart="closeImageModal">
    <div class="image-modal-content" @click.stop @touchstart.stop>
      <button class="close-modal-btn" @click="closeImageModal" @touchstart="closeImageModal">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <img :src="note.imageData" :alt="note.imageName || 'Imagem da anotação'" class="modal-image" />
      <div v-if="note.imageName" class="modal-image-name">{{ note.imageName }}</div>
    </div>
  </div>

  <div class="note-card-container"
    :class="{ 'swiping': isSwiping, 'deleting': isDeleting, 'image-card-container': note.type === 'image' }">
    <!-- Fundo de exclusão - apenas para cards não-imagem -->
    <div v-if="note.type !== 'image'" class="delete-background">
      <div class="delete-icon" :class="{ 'active': swipeDistance <= deleteThreshold }">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c0-1 1-2 2-2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      </div>
    </div>

    <!-- Indicador de exclusão flutuante para cards de imagem -->
    <div v-if="note.type === 'image' && isSwiping" class="floating-delete-indicator"
      :class="{ 'ready-to-delete': swipeDistance <= deleteThreshold }"
      :style="{ opacity: Math.min(Math.abs(swipeDistance) / 50, 1) }">
      <div class="delete-circle">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c0-1 1-2 2-2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      </div>
    </div>

    <!-- Card principal que desliza -->
    <div class="note-card" :class="{ 'swiping': isSwiping, 'deleting': isDeleting }"
      :style="{ transform: `translateX(${swipeDistance}px)` }" @touchstart="handleTouchStart"
      @touchmove="handleTouchMove" @touchend="handleTouchEnd" @touchcancel="handleTouchEnd" @mousedown="handleMouseDown"
      @mousemove="handleMouseMove" @mouseup="handleMouseUp" @mouseleave="handleMouseUp">
      <div class="note-content">
        <!-- Exibir imagem se for uma nota de imagem -->
        <div v-if="note.type === 'image' && note.imageData" class="note-image-container">
          <img :src="note.imageData" :alt="note.imageName || 'Imagem da anotação'" class="note-image"
            @click="openImageModal" />
          <div v-if="note.imageName" class="image-name">{{ note.imageName }}</div>
        </div>

        <!-- Exibir preview de link se for uma nota de link -->
        <div v-if="note.type === 'link' && note.linkUrl" class="link-preview" @click="openLink">
          <div v-if="note.linkImage" class="link-image">
            <img :src="note.linkImage" :alt="note.linkTitle || 'Preview do link'" />
          </div>
          <div class="link-content">
            <div class="link-header">
              <img v-if="note.linkFavicon" :src="note.linkFavicon" :alt="'Favicon'" class="link-favicon" />
              <div class="link-title" :style="{ fontSize: linkTitleFontSize }">{{ note.linkTitle || note.linkUrl }}
              </div>
            </div>
            <div v-if="note.linkDescription" class="link-description" :style="{ fontSize: linkDescriptionFontSize }">{{
              note.linkDescription }}</div>
            <div class="link-url">{{ note.linkUrl }}</div>
          </div>
          <div class="link-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
        </div>

        <!-- Exibir texto se houver -->
        <div v-if="note.content" class="note-text" :class="{ 'link-text': note.type === 'link' }"
          :style="{ fontSize: dynamicFontSize, lineHeight: dynamicLineHeight }">
          {{ note.content }}
        </div>
      </div>
      <button class="copy-btn" @click.stop="copyToClipboard" @mousedown.stop @touchstart.stop
        :aria-label="copied ? 'Copiado!' : 'Copiar anotação'" :class="{ 'copied': copied }">
        <svg v-if="!copied" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20,6 9,17 4,12" />
        </svg>
      </button>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, computed } from 'vue'
import type { Note } from '@/stores/notes'

interface Props {
  note: Note
}

interface Emits {
  delete: [id: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Calcular tamanho da fonte baseado no comprimento do texto
const dynamicFontSize = computed(() => {
  if (!props.note.content) return '16px'

  const textLength = props.note.content.length
  const noteType = props.note.type

  // Ajustar breakpoints baseado no tipo de nota
  let baseFontSize = 16
  let minFontSize = 12

  // Para links, usar fonte menor por padrão (já que há título e descrição)
  if (noteType === 'link') {
    baseFontSize = 14
    minFontSize = 11
  }

  // Calcular tamanho da fonte de forma mais suave
  if (textLength <= 30) {
    return `${baseFontSize}px`
  } else if (textLength <= 80) {
    return `${baseFontSize - 1}px`
  } else if (textLength <= 150) {
    return `${baseFontSize - 2}px`
  } else if (textLength <= 300) {
    return `${baseFontSize - 3}px`
  } else if (textLength <= 500) {
    return `${baseFontSize - 4}px`
  } else {
    return `${minFontSize}px`
  }
})

// Calcular altura da linha baseada no tamanho da fonte
const dynamicLineHeight = computed(() => {
  const fontSize = parseInt(dynamicFontSize.value)
  return `${fontSize * 1.4}px` // Line height 1.4x o tamanho da fonte
})

// Tamanho da fonte para títulos de link (baseado no comprimento do título)
const linkTitleFontSize = computed(() => {
  if (!props.note.linkTitle) return '14px'

  const titleLength = props.note.linkTitle.length

  if (titleLength <= 30) {
    return '14px' // Título curto
  } else if (titleLength <= 60) {
    return '13px' // Título médio
  } else {
    return '12px' // Título longo
  }
})

// Tamanho da fonte para descrições de link
const linkDescriptionFontSize = computed(() => {
  if (!props.note.linkDescription) return '12px'

  const descLength = props.note.linkDescription.length

  if (descLength <= 100) {
    return '12px' // Descrição curta
  } else if (descLength <= 200) {
    return '11px' // Descrição média
  } else {
    return '10px' // Descrição longa
  }
})



const copied = ref(false)
const isSwiping = ref(false)
const isDeleting = ref(false)
const swipeDistance = ref(0)
const isDragging = ref(false)
const startX = ref(0)
const startY = ref(0)
const currentX = ref(0)
const showImageModal = ref(false)
const deleteThreshold = -50 // Distância mínima para excluir (pixels) - mais fácil
const maxSwipeDistance = -100 // Distância máxima de arraste

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

    // Se for um link, copiar a URL e título
    if (props.note.type === 'link') {
      textToCopy = props.note.linkUrl || ''
      if (props.note.linkTitle) {
        textToCopy = `${props.note.linkTitle} - ${textToCopy}`
      }
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

      if (props.note.type === 'link') {
        textToCopy = props.note.linkUrl || ''
        if (props.note.linkTitle) {
          textToCopy = `${props.note.linkTitle} - ${textToCopy}`
        }
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
    showImageModal.value = true
    // Prevenir scroll do body quando modal está aberto
    document.body.style.overflow = 'hidden'

    // Esconder elementos fixos no mobile para evitar sobreposição
    const searchContainer = document.querySelector('.search-container')
    const appFooter = document.querySelector('.app-footer')

    if (searchContainer) {
      (searchContainer as HTMLElement).style.display = 'none'
    }
    if (appFooter) {
      (appFooter as HTMLElement).style.display = 'none'
    }
  }
}

const closeImageModal = () => {
  showImageModal.value = false
  // Restaurar scroll do body
  document.body.style.overflow = ''

  // Restaurar elementos fixos
  const searchContainer = document.querySelector('.search-container')
  const appFooter = document.querySelector('.app-footer')

  if (searchContainer) {
    (searchContainer as HTMLElement).style.display = ''
  }
  if (appFooter) {
    (appFooter as HTMLElement).style.display = ''
  }
}

const openLink = () => {
  if (props.note.type === 'link' && props.note.linkUrl) {
    window.open(props.note.linkUrl, '_blank', 'noopener,noreferrer')
  }
}

// Funções para Swipe (Touch)
const handleTouchStart = (event: TouchEvent) => {
  if (event.target && (event.target as Element).closest('.copy-btn')) {
    return // Não ativar swipe no botão de copiar
  }

  const touch = event.touches[0]
  startSwipe(touch.clientX, touch.clientY)
}

const handleTouchMove = (event: TouchEvent) => {
  if (!isDragging.value) return

  const touch = event.touches[0]
  updateSwipe(touch.clientX, touch.clientY)

  // Só prevenir o comportamento padrão se estivermos realmente fazendo swipe horizontal
  if (isSwiping.value) {
    event.preventDefault()
  }
}

const handleTouchEnd = () => {
  endSwipe()
}

// Funções para Swipe (Mouse)
const handleMouseDown = (event: MouseEvent) => {
  if (event.target && (event.target as Element).closest('.copy-btn')) {
    return // Não ativar swipe no botão de copiar
  }

  // Só ativar swipe no botão esquerdo
  if (event.button === 0) {
    startSwipe(event.clientX, event.clientY)
  }
}

const handleMouseMove = (event: MouseEvent) => {
  if (!isDragging.value) return

  updateSwipe(event.clientX, event.clientY)

  // Só prevenir o comportamento padrão se estivermos realmente fazendo swipe horizontal
  if (isSwiping.value) {
    event.preventDefault()
  }
}

const handleMouseUp = () => {
  endSwipe()
}

// Iniciar Swipe
const startSwipe = (x: number, y: number) => {
  isDragging.value = true
  startX.value = x
  startY.value = y
  currentX.value = x
  isSwiping.value = false
  swipeDistance.value = 0
}

// Atualizar Swipe
const updateSwipe = (x: number, y: number) => {
  if (!isDragging.value) return

  const deltaX = x - startX.value
  const deltaY = y - startY.value

  // Verificar se é um movimento horizontal (swipe) ou vertical (scroll)
  if (!isSwiping.value) {
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    // Só ativar swipe se o movimento horizontal for significativamente maior que o vertical
    if (absX > 10 && absX > absY * 1.5) {
      isSwiping.value = true
    }
    // Se o movimento vertical for maior, não ativar swipe (permitir scroll)
    else if (absY > absX) {
      // Cancelar o dragging para permitir scroll normal
      isDragging.value = false
      return
    }
  }

  if (isSwiping.value) {
    // Só permitir movimento para a esquerda com limite máximo
    if (deltaX < 0) {
      // Limitar o arraste ao máximo definido
      swipeDistance.value = Math.max(deltaX, maxSwipeDistance)
    } else {
      // Resistência forte ao arrastar para direita
      swipeDistance.value = Math.min(deltaX * 0.15, 10)
    }
  }
}

// Finalizar Swipe
const endSwipe = () => {
  if (!isDragging.value) return

  isDragging.value = false

  if (isSwiping.value) {
    // Se passou do threshold, excluir
    if (swipeDistance.value <= deleteThreshold) {
      deleteNote()
    } else {
      // Voltar à posição original
      resetSwipe()
    }
  }

  isSwiping.value = false
}

// Resetar posição do swipe
const resetSwipe = () => {
  // Animação suave de retorno
  const startDistance = swipeDistance.value
  const duration = 300
  const startTime = Date.now()

  const animate = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)

    // Easing function para animação suave
    const easeOut = 1 - Math.pow(1 - progress, 3)

    swipeDistance.value = startDistance * (1 - easeOut)

    if (progress < 1) {
      requestAnimationFrame(animate)
    } else {
      swipeDistance.value = 0
      isSwiping.value = false
    }
  }

  requestAnimationFrame(animate)
}

// Excluir nota com animação melhorada
const deleteNote = () => {
  isDeleting.value = true

  // Primeira fase: acelerar o swipe
  const startDistance = swipeDistance.value
  const intermediateDistance = -window.innerWidth * 0.4
  const finalDistance = -window.innerWidth

  // Fase 1: Swipe acelerado (100ms)
  const phase1Duration = 100
  const phase1StartTime = Date.now()

  const animatePhase1 = () => {
    const elapsed = Date.now() - phase1StartTime
    const progress = Math.min(elapsed / phase1Duration, 1)

    // Easing acelerado
    const easeIn = progress * progress * progress

    swipeDistance.value = startDistance + (intermediateDistance - startDistance) * easeIn

    if (progress < 1) {
      requestAnimationFrame(animatePhase1)
    } else {
      // Iniciar fase 2
      animatePhase2()
    }
  }

  // Fase 2: Saída final com fade (150ms)
  const animatePhase2 = () => {
    const phase2Duration = 150
    const phase2StartTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - phase2StartTime
      const progress = Math.min(elapsed / phase2Duration, 1)

      // Easing suave para saída
      const easeOut = 1 - Math.pow(1 - progress, 2)

      swipeDistance.value = intermediateDistance + (finalDistance - intermediateDistance) * easeOut

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        // Pequeno delay para suavizar a transição
        setTimeout(() => {
          emit('delete', props.note.id)
        }, 20)
      }
    }

    requestAnimationFrame(animate)
  }

  requestAnimationFrame(animatePhase1)
}

// Lifecycle hooks
onUnmounted(() => {
  // Limpar qualquer estado de swipe ativo
  isDragging.value = false
  isSwiping.value = false
  swipeDistance.value = 0

  // Restaurar scroll do body se modal estiver aberto
  if (showImageModal.value) {
    document.body.style.overflow = ''
  }
})

</script>

<style scoped>
.note-card-container {
  position: relative;
  overflow: hidden;
  background: #dc3545;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.note-card-container.deleting {
  animation: containerFadeOut 0.25s ease-out forwards;
}

@keyframes containerFadeOut {
  0% {
    opacity: 1;
    transform: scale(1);
  }

  100% {
    opacity: 0.3;
    transform: scale(0.98);
  }
}

.note-card {
  background: #eeeeee;
  padding: 16px;
  position: relative;
  transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  /* Desabilitar seleção de texto no card */
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  /* Desabilitar highlight de toque no mobile */
  -webkit-tap-highlight-color: transparent;
  width: 100%;
  min-height: 100%;
}

.note-card:hover:not(.swiping) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.note-card.swiping {
  transition: none;
}

.note-card.deleting {
  transition: none;
  /* Sem transição CSS, usamos JavaScript para controle total */
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
  font-family: 'Onest', sans-serif;
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
  font-family: 'Onest', sans-serif;
  font-weight: 400;
}



.note-text {
  transition: font-size 0.3s ease, line-height 0.3s ease;
  font-family: 'Onest', sans-serif;
  font-weight: 400;
}

.note-text.link-text {
  font-size: 12px;
  font-style: italic;
  color: #6c757d;
}

/* Preview de link */
.link-preview {
  display: flex;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 8px;
  background: #f8f9fa;
}

.link-preview:hover {
  border-color: #007bff;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
  transform: translateY(-1px);
}

.link-image {
  flex-shrink: 0;
  width: 80px;
  height: 80px;
  overflow: hidden;
}

.link-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.link-content {
  flex: 1;
  padding: 12px;
  min-width: 0;
}

.link-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.link-favicon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border-radius: 2px;
  object-fit: cover;
}

.link-title {
  font-weight: 600;
  font-size: 14px;
  color: #212529;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
  transition: font-size 0.3s ease;
  font-family: 'Onest', sans-serif;
}

.link-description {
  font-size: 12px;
  color: #6c757d;
  line-height: 1.4;
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: font-size 0.3s ease;
}

.link-url {
  font-size: 11px;
  color: #007bff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link-icon {
  display: flex;
  align-items: center;
  padding: 12px;
  color: #6c757d;
}

.link-preview:hover .link-icon {
  color: #007bff;
}

/* Fundo de exclusão para cards normais */
.delete-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 24px;
  background: linear-gradient(90deg, rgba(220, 53, 69, 0.8) 0%, #dc3545 100%);
  border-radius: 0;
}

.delete-icon {
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform: scale(0.9);
  opacity: 0.7;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.delete-icon.active {
  color: white;
  transform: scale(1.15);
  opacity: 1;
  animation: deleteIconPulse 0.5s ease-in-out;
}

.delete-icon svg {
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.3));
}

@keyframes deleteIconPulse {
  0% {
    transform: scale(1.15);
  }

  50% {
    transform: scale(1.3);
  }

  100% {
    transform: scale(1.15);
  }
}

.note-card-container.deleting .delete-icon {
  animation: deleteIconSuccess 0.25s ease-out forwards;
}

/* Indicador flutuante de exclusão para cards de imagem */
.floating-delete-indicator {
  position: absolute;
  top: 50%;
  right: 16px;
  transform: translateY(-50%);
  z-index: 5;
  pointer-events: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.delete-circle {
  width: 44px;
  height: 44px;
  background: rgba(220, 53, 69, 0.95);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
  transform: scale(0.8);
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.floating-delete-indicator.ready-to-delete .delete-circle {
  background: #dc3545;
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(220, 53, 69, 0.6);
  animation: deleteReadyPulse 0.6s ease-in-out infinite alternate;
}

@keyframes deleteReadyPulse {
  0% {
    transform: scale(1.1);
  }

  100% {
    transform: scale(1.2);
  }
}

/* Melhorias para mobile */
@media (max-width: 768px) {
  .delete-background {
    padding-right: 20px;
  }

  .floating-delete-indicator {
    right: 12px;
  }

  .delete-circle {
    width: 40px;
    height: 40px;
  }

  .delete-icon {
    transform: scale(0.85);
  }

  .delete-icon.active {
    transform: scale(1.1);
  }
}

@keyframes deleteIconSuccess {
  0% {
    transform: scale(1.2);
    color: white;
  }

  50% {
    transform: scale(1.5);
    color: #fff;
  }

  100% {
    transform: scale(1.2);
    color: rgba(255, 255, 255, 0.9);
  }
}

/* Modal de imagem */
.image-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
  animation: modalFadeIn 0.3s ease-out;
  /* Garantir que fique acima de tudo */
  isolation: isolate;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.image-modal-content {
  position: relative;
  max-width: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.close-modal-btn {
  position: absolute;
  top: -50px;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #333;
  transition: all 0.2s ease;
  z-index: 10001;
  backdrop-filter: blur(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.close-modal-btn:hover {
  background: white;
  transform: scale(1.1);
}

.modal-image {
  max-width: 100%;
  max-height: calc(100vh - 120px);
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.modal-image-name {
  color: white;
  font-size: 14px;
  margin-top: 16px;
  text-align: center;
  background: rgba(0, 0, 0, 0.7);
  padding: 8px 16px;
  border-radius: 20px;
  backdrop-filter: blur(4px);
}

/* Responsivo para mobile */
@media (max-width: 768px) {
  .image-modal {
    padding: 20px 10px;
  }

  .close-modal-btn {
    top: 10px;
    right: 10px;
    width: 44px;
    height: 44px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
  }

  .close-modal-btn:hover {
    background: rgba(0, 0, 0, 0.8);
    color: white;
  }

  .modal-image {
    max-height: calc(100vh - 80px);
    max-width: calc(100vw - 20px);
  }

  .modal-image-name {
    font-size: 12px;
    margin-top: 12px;
    padding: 6px 12px;
  }
}
</style>
