import type { StateStorage } from 'zustand/middleware'

const DB_NAME = 'nillm-db'
const STORE_NAME = 'store'
let database: Promise<IDBDatabase> | undefined

function openDB(): Promise<IDBDatabase> {
    if (!database) {
        database = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1)
            request.onupgradeneeded = () => {
                if (!request.result.objectStoreNames.contains(STORE_NAME))
                    request.result.createObjectStore(STORE_NAME)
            }
            request.onsuccess = () => {
                const db = request.result
                db.onversionchange = () => {
                    db.close()
                    database = undefined
                }
                db.onclose = () => {
                    database = undefined
                }
                resolve(db)
            }
            request.onerror = () => {
                database = undefined
                reject(request.error)
            }
        })
        // A missing IndexedDB implementation must allow a later retry.
        database.catch(() => {
            database = undefined
        })
    }
    return database
}

async function transact<T>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode)
        const request = operation(tx.objectStore(STORE_NAME))
        tx.oncomplete = () => resolve(request.result)
        tx.onerror = tx.onabort = () =>
            reject(
                tx.error ||
                    request.error ||
                    new Error('Storage transaction failed.')
            )
    })
}

export const indexedDBStorage: StateStorage = {
    getItem: async (name) =>
        (await transact('readonly', (store) => store.get(name))) ?? null,
    setItem: async (name, value) => {
        await transact('readwrite', (store) => store.put(value, name))
    },
    removeItem: async (name) => {
        await transact('readwrite', (store) => store.delete(name))
    }
}
