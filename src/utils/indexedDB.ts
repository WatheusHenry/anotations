export interface Note {
  id: string
  content: string
  createdAt: Date
  type: 'text' | 'image' | 'link'
  imageData?: string // Base64 da imagem
  imageName?: string // Nome original do arquivo
  linkUrl?: string // URL do link
  linkTitle?: string // Título da página
  linkDescription?: string // Descrição da página
  linkImage?: string // Imagem de preview do link
}

class NotesDB {
  private dbName = 'NotesApp'
  private version = 1
  private storeName = 'notes'
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        console.error('Erro ao abrir IndexedDB:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Criar object store se não existir
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' })

          // Criar índices
          store.createIndex('createdAt', 'createdAt', { unique: false })
          store.createIndex('content', 'content', { unique: false })
        }
      }
    })
  }

  async getAllNotes(): Promise<Note[]> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()

      request.onsuccess = () => {
        const notes = request.result.map((note: any) => ({
          ...note,
          createdAt: new Date(note.createdAt)
        }))
        resolve(notes)
      }

      request.onerror = () => {
        console.error('Erro ao buscar notas:', request.error)
        reject(request.error)
      }
    })
  }

  async addNote(note: Note): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.add(note)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        console.error('Erro ao adicionar nota:', request.error)
        reject(request.error)
      }
    })
  }

  async updateNote(note: Note): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.put(note)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        console.error('Erro ao atualizar nota:', request.error)
        reject(request.error)
      }
    })
  }

  async deleteNote(id: string): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(id)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        console.error('Erro ao deletar nota:', request.error)
        reject(request.error)
      }
    })
  }

  async clearAllNotes(): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        console.error('Erro ao limpar notas:', request.error)
        reject(request.error)
      }
    })
  }

  // Migração do localStorage para IndexedDB
  async migrateFromLocalStorage(): Promise<void> {
    try {
      const localStorageNotes = localStorage.getItem('notes')
      if (localStorageNotes) {
        const notes = JSON.parse(localStorageNotes)

        for (const note of notes) {
          await this.addNote({
            ...note,
            createdAt: new Date(note.createdAt)
          })
        }

        // Remover do localStorage após migração bem-sucedida
        localStorage.removeItem('notes')
        console.log('Migração do localStorage concluída com sucesso')
      }
    } catch (error) {
      console.error('Erro na migração do localStorage:', error)
    }
  }
}

// Singleton instance
export const notesDB = new NotesDB()
