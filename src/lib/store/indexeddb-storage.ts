import { StateStorage } from 'zustand/middleware'

const DB_NAME = 'nillm-db'
const DB_VERSION = 1
const STORE_NAME = 'store'

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME)
            }
        }

        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

export const indexedDBStorage: StateStorage = {
    getItem: async (name: string): Promise<string | null> => {
        try {
            const db = await openDB()
            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(STORE_NAME, 'readonly')
                    const store = tx.objectStore(STORE_NAME)
                    const req = store.get(name)
                    req.onsuccess = () => resolve(req.result || null)
                    req.onerror = () => resolve(null)
                } catch {
                    resolve(null)
                }
            })
        } catch {
            return null
        }
    },

    setItem: async (name: string, value: string): Promise<void> => {
        try {
            const db = await openDB()
            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(STORE_NAME, 'readwrite')
                    const store = tx.objectStore(STORE_NAME)
                    store.put(value, name)
                    tx.oncomplete = () => resolve()
                    tx.onerror = () => resolve()
                } catch {
                    resolve()
                }
            })
        } catch {
            void 0
        }
    },

    removeItem: async (name: string): Promise<void> => {
        try {
            const db = await openDB()
            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(STORE_NAME, 'readwrite')
                    const store = tx.objectStore(STORE_NAME)
                    store.delete(name)
                    tx.oncomplete = () => resolve()
                } catch {
                    resolve()
                }
            })
        } catch {
            void 0
        }
    }
}
