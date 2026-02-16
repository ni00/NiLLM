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
        let db: IDBDatabase | null = null
        try {
            db = await openDB()
            return new Promise((resolve) => {
                if (!db) {
                    resolve(null)
                    return
                }
                try {
                    const tx = db.transaction(STORE_NAME, 'readonly')
                    const store = tx.objectStore(STORE_NAME)
                    const req = store.get(name)
                    req.onsuccess = () => {
                        db?.close()
                        resolve(req.result || null)
                    }
                    req.onerror = () => {
                        db?.close()
                        resolve(null)
                    }
                } catch {
                    db?.close()
                    resolve(null)
                }
            })
        } catch {
            db?.close()
            return null
        }
    },

    setItem: async (name: string, value: string): Promise<void> => {
        let db: IDBDatabase | null = null
        try {
            db = await openDB()
            return new Promise((resolve) => {
                if (!db) {
                    resolve()
                    return
                }
                try {
                    const tx = db.transaction(STORE_NAME, 'readwrite')
                    const store = tx.objectStore(STORE_NAME)
                    store.put(value, name)
                    tx.oncomplete = () => {
                        db?.close()
                        resolve()
                    }
                    tx.onerror = () => {
                        db?.close()
                        resolve()
                    }
                } catch {
                    db?.close()
                    resolve()
                }
            })
        } catch {
            db?.close()
        }
    },

    removeItem: async (name: string): Promise<void> => {
        let db: IDBDatabase | null = null
        try {
            db = await openDB()
            return new Promise((resolve) => {
                if (!db) {
                    resolve()
                    return
                }
                try {
                    const tx = db.transaction(STORE_NAME, 'readwrite')
                    const store = tx.objectStore(STORE_NAME)
                    store.delete(name)
                    tx.oncomplete = () => {
                        db?.close()
                        resolve()
                    }
                    tx.onerror = () => {
                        db?.close()
                        resolve()
                    }
                } catch {
                    db?.close()
                    resolve()
                }
            })
        } catch {
            db?.close()
        }
    }
}
