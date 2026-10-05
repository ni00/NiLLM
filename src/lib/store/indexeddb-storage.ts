import type { StateStorage } from 'zustand/middleware'

const DB_NAME = 'nillm-db'
const STORE_NAME = 'store'
let database: Promise<IDBDatabase> | undefined

/** Commit puts/deletes atomically; dump reads a consistent record snapshot. */
export interface AppStorage extends StateStorage {
    readMany(keys: string[]): Promise<Record<string, string | null>>
    commit(puts: Record<string, string>, deletes: string[]): Promise<void>
    dump(): Promise<Record<string, string>>
}

function openDB(): Promise<IDBDatabase> {
    if (!database) {
        const { promise, resolve, reject } =
            Promise.withResolvers<IDBDatabase>()
        database = promise
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
        // A missing IndexedDB implementation must allow a later retry.
        promise.catch(() => {
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
    const { promise, resolve, reject } = Promise.withResolvers<T>()
    const tx = db.transaction(STORE_NAME, mode)
    const request = operation(tx.objectStore(STORE_NAME))
    tx.oncomplete = () => resolve(request.result)
    tx.onerror = tx.onabort = () =>
        reject(
            tx.error ||
                request.error ||
                new Error('Storage transaction failed.')
        )
    return promise
}

export const indexedDBStorage: AppStorage = {
    getItem: async (name) =>
        (await transact('readonly', (store) => store.get(name))) ?? null,
    setItem: async (name, value) => {
        await transact('readwrite', (store) => store.put(value, name))
    },
    removeItem: async (name) => {
        await transact('readwrite', (store) => store.delete(name))
    },
    readMany: async (keys) => {
        const db = await openDB()
        const { promise, resolve, reject } =
            Promise.withResolvers<Record<string, string | null>>()
        const entries: Record<string, string | null> = {}
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        for (const key of keys) {
            const request = store.get(key)
            request.onsuccess = () => {
                entries[key] = (request.result as string | undefined) ?? null
            }
        }
        tx.oncomplete = () => resolve(entries)
        tx.onerror = tx.onabort = () =>
            reject(tx.error || new Error('Storage read failed.'))
        return promise
    },
    commit: async (puts, deletes) => {
        const db = await openDB()
        const { promise, resolve, reject } = Promise.withResolvers<void>()
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        for (const [key, value] of Object.entries(puts)) store.put(value, key)
        for (const key of deletes) store.delete(key)
        tx.oncomplete = () => resolve()
        tx.onerror = tx.onabort = () =>
            reject(tx.error || new Error('Storage commit failed.'))
        await promise
    },
    dump: async () => {
        const db = await openDB()
        const { promise, resolve, reject } =
            Promise.withResolvers<Record<string, string>>()
        const records: Record<string, string> = {}
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const keysRequest = store.getAllKeys()
        const valuesRequest = store.getAll()
        tx.oncomplete = () => {
            keysRequest.result.forEach((key, index) => {
                const value = valuesRequest.result[index]
                if (typeof value === 'string') records[String(key)] = value
            })
            resolve(records)
        }
        tx.onerror = tx.onabort = () =>
            reject(tx.error || new Error('Storage dump failed.'))
        return promise
    }
}
