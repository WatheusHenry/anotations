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

const addNote = async () => {
  if (newNote.value.trim()) {
    await notesStore.addNote(newNote.value)
    newNote.value = ''

    // Animação de feedback no input
    const inputContainer = document.querySelector('.input-container')
    if (inputContainer) {
      inputContainer.classList.add('note-added')
      setTimeout(() => {
        inputContainer.classList.remove('note-added')
      }, 300)
    }
  }
}

const handleKeyPress = async (event: KeyboardEvent) => {
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
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (file) {
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
</script>

<template>
  <div class="app">

    <main class="app-main">

      <!-- Lista de Anotações -->
      <div class="notes-container">
        <div v-if="totalFilteredNotes === 0 && searchQuery" class="empty-state">
          <p>Nenhuma anotação encontrada</p>
        </div>

        <div v-else-if="totalFilteredNotes === 0" class="empty-state">
          <p>Nenhuma anotação ainda</p>
          <p class="empty-subtitle">Comece escrevendo sua primeira anotação abaixo</p>
        </div>

        <div v-else>
          <div v-for="(notes, dateKey) in filteredGroupedNotes" :key="dateKey" class="date-group">
            <DateHeader :date-label="String(dateKey)" />
            <div class="notes-group">
              <TransitionGroup name="note" tag="div" class="notes-list">
                <NoteCard v-for="note in notes" :key="note.id" :note="note" @delete="deleteNote" />
              </TransitionGroup>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Barra de Pesquisa -->
    <div class="search-container">
      <div class="search-input-wrapper" :class="{ 'expanded': isSearchExpanded }">
        <input v-model="searchQuery" type="text" :placeholder="isSearchExpanded ? 'Pesquisar' : 'Pesquisar'"
          class="search-input" :class="{ 'expanded': isSearchExpanded }" @focus="expandSearch"
          @blur="handleSearchBlur" />
      </div>
    </div>
    <!-- Input para Nova Anotação -->
    <footer class="app-footer">
      <div class="input-container">
        <textarea v-model="newNote" placeholder="Salvar uma nota..." class="note-input" rows="1"
          @keypress="handleKeyPress"></textarea>
        <div class="action-buttons">
          <button @click="triggerImageUpload" class="image-btn" aria-label="Adicionar imagem">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21,15 16,10 5,21" />
            </svg>
          </button>
          <button @click="addNote" :disabled="!newNote.trim()" class="send-btn" aria-label="Adicionar anotação">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22,2 15,22 11,13 2,9 22,2" />
            </svg>
          </button>
        </div>
      </div>

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
  font-weight: 600;
  color: #212529;
  margin: 0;
  text-align: center;
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
  color: #BFBFBF;
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
  color: #BFBFBF;
  transition: opacity 0.3s ease;
}

.search-input:not(.expanded)::placeholder {
  opacity: 0.8;
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
  gap: 12px;
}

/* Animações de Transição para Notas */
.note-enter-active {
  animation: noteSlideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.note-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.note-enter-from {
  opacity: 0;
}

.note-leave-to {
  opacity: 0;
  transform: translateX(100px) scale(0.9);
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
  padding: 40px 20px;
  color: #6c757d;
}

.empty-subtitle {
  font-size: 14px;
  margin-top: 8px;
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
  padding: 20px 50px;
  z-index: 10;
  box-shadow:
    0 3px 30px rgba(0, 0, 0, 0.2),
    0 1px 3px rgba(0, 0, 0, 0.1);
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
  gap: 8px;
  margin-left: 8px;
}

.note-input {
  flex: 1;
  padding: 14px 16px;
  border: none;
  border-radius: 20px;
  font-size: 16px;
  font-family: inherit;
  resize: none;
  outline: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 40px;
  max-height: 120px;
  background: transparent !important;
  color: #212529;
  /* Permitir seleção no textarea de nova nota */
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
  color: #BFBFBF;
  transition: opacity 0.3s ease;
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
    padding: 22px 12px 50px 12px;

  }

  .input-container {
    padding-inline: 10px;
  }

  .note-input {
    padding: 12px 14px;
    min-height: 36px;
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
}

/* Ajustes para PWA */
@media (display-mode: standalone) {
  .app-header {
    padding-top: env(safe-area-inset-top, 20px);
  }

  .app-footer {
    padding-bottom: env(safe-area-inset-bottom, 16px);
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
}
</style>
