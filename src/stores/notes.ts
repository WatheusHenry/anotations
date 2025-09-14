/* eslint-disable @typescript-eslint/no-explicit-any */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { notesDB, type Note } from '@/utils/indexedDB'

export type { Note }

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>([])

  // Carregar notas do IndexedDB na inicialização
  const loadNotes = async () => {
    try {
      await notesDB.init()

      // Verificar se há dados no localStorage para migrar
      const localStorageNotes = localStorage.getItem('notes')
      if (localStorageNotes) {
        await notesDB.migrateFromLocalStorage()
      }

      const loadedNotes = await notesDB.getAllNotes()
      notes.value = loadedNotes
    } catch (error) {
      console.error('Erro ao carregar anotações:', error)
      // Fallback para localStorage em caso de erro
      try {
        const savedNotes = localStorage.getItem('notes')
        if (savedNotes) {
          const parsedNotes = JSON.parse(savedNotes)
          notes.value = parsedNotes.map((note: any) => ({
            ...note,
            createdAt: new Date(note.createdAt)
          }))
        }
      } catch (fallbackError) {
        console.error('Erro no fallback do localStorage:', fallbackError)
      }
    }
  }

  const sortedNotes = computed(() => {
    return notes.value.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  })

  const groupedNotesByDate = computed(() => {
    const groups: { [key: string]: Note[] } = {}

    sortedNotes.value.forEach(note => {
      const dateKey = formatDateKey(note.createdAt)
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(note)
    })

    return groups
  })

  const formatDateKey = (date: Date) => {
    const today = new Date()
    const noteDate = new Date(date)

    // Resetar horas para comparação apenas de datas
    today.setHours(0, 0, 0, 0)
    noteDate.setHours(0, 0, 0, 0)

    const diffTime = today.getTime() - noteDate.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return 'Hoje'
    } else if (diffDays === 1) {
      return 'Ontem'
    } else if (diffDays < 7) {
      return noteDate.toLocaleDateString('pt-BR', { weekday: 'long' })
    } else {
      return noteDate.toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: noteDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  const addNote = async (content: string) => {
    if (content.trim()) {
      const newNote: Note = {
        id: Date.now().toString(),
        content: content.trim(),
        createdAt: new Date(),
        type: 'text'
      }

      try {
        await notesDB.addNote(newNote)
        notes.value.push(newNote)
      } catch (error) {
        console.error('Erro ao adicionar nota no IndexedDB:', error)
        // Fallback para localStorage
        notes.value.push(newNote)
        try {
          localStorage.setItem('notes', JSON.stringify(notes.value))
        } catch (fallbackError) {
          console.error('Erro no fallback do localStorage:', fallbackError)
        }
      }
    }
  }

  const addImageNote = async (imageData: string, imageName: string, content: string = '') => {
    const newNote: Note = {
      id: Date.now().toString(),
      content: content.trim(),
      createdAt: new Date(),
      type: 'image',
      imageData,
      imageName
    }

    try {
      await notesDB.addNote(newNote)
      notes.value.push(newNote)
    } catch (error) {
      console.error('Erro ao adicionar nota com imagem no IndexedDB:', error)
      // Fallback para localStorage
      notes.value.push(newNote)
      try {
        localStorage.setItem('notes', JSON.stringify(notes.value))
      } catch (fallbackError) {
        console.error('Erro no fallback do localStorage:', fallbackError)
      }
    }
  }

  const addLinkNote = async (url: string, title?: string, description?: string, image?: string, content: string = '') => {
    const newNote: Note = {
      id: Date.now().toString(),
      content: content.trim(),
      createdAt: new Date(),
      type: 'link',
      linkUrl: url,
      linkTitle: title,
      linkDescription: description,
      linkImage: image
    }

    try {
      await notesDB.addNote(newNote)
      notes.value.push(newNote)
    } catch (error) {
      console.error('Erro ao adicionar nota com link no IndexedDB:', error)
      // Fallback para localStorage
      notes.value.push(newNote)
      try {
        localStorage.setItem('notes', JSON.stringify(notes.value))
      } catch (fallbackError) {
        console.error('Erro no fallback do localStorage:', fallbackError)
      }
    }

    return newNote.id
  }

  const updateLinkNote = async (noteId: string, linkData: { title?: string, description?: string, image?: string, favicon?: string }) => {
    console.log('Tentando atualizar nota:', noteId, linkData)
    const noteIndex = notes.value.findIndex(note => note.id === noteId)
    if (noteIndex === -1) {
      console.error('Nota não encontrada:', noteId)
      return
    }

    const note = notes.value[noteIndex]
    if (note.type !== 'link') {
      console.error('Nota não é do tipo link:', note.type)
      return
    }

    console.log('Nota antes da atualização:', note)

    // Atualizar dados do link
    if (linkData.title) note.linkTitle = linkData.title
    if (linkData.description) note.linkDescription = linkData.description
    if (linkData.image) note.linkImage = linkData.image
    if (linkData.favicon) note.linkFavicon = linkData.favicon

    console.log('Nota após atualização:', note)

    try {
      await notesDB.updateNote(note)
      console.log('Nota atualizada no IndexedDB')
    } catch (error) {
      console.error('Erro ao atualizar nota no IndexedDB:', error)
      // Fallback para localStorage
      try {
        localStorage.setItem('notes', JSON.stringify(notes.value))
        console.log('Nota atualizada no localStorage')
      } catch (fallbackError) {
        console.error('Erro no fallback do localStorage:', fallbackError)
      }
    }
  }

  const removeNote = async (id: string) => {
    const index = notes.value.findIndex(note => note.id === id)
    if (index > -1) {
      try {
        await notesDB.deleteNote(id)
        notes.value.splice(index, 1)
      } catch (error) {
        console.error('Erro ao remover nota do IndexedDB:', error)
        // Fallback para localStorage
        notes.value.splice(index, 1)
        try {
          localStorage.setItem('notes', JSON.stringify(notes.value))
        } catch (fallbackError) {
          console.error('Erro no fallback do localStorage:', fallbackError)
        }
      }
    }
  }

  const formatDate = (date: Date) => {
    const today = new Date()
    const noteDate = new Date(date)

    if (noteDate.toDateString() === today.toDateString()) {
      return 'Hoje'
    }

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (noteDate.toDateString() === yesterday.toDateString()) {
      return 'Ontem'
    }

    return noteDate.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long'
    })
  }

  // Carregar notas na inicialização
  loadNotes()

  return {
    notes,
    sortedNotes,
    groupedNotesByDate,
    addNote,
    addImageNote,
    addLinkNote,
    updateLinkNote,
    removeNote,
    formatDate,
    formatDateKey,
    loadNotes
  }
})
