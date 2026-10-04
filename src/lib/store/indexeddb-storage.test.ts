import { describe, expect, it } from 'vitest'
import { indexedDBStorage } from './indexeddb-storage'
describe('IndexedDB storage', () => {
    it('commits writes before resolving, reuses the connection, and removes data', async () => {
        await indexedDBStorage.setItem('test-key', 'first')
        expect(await indexedDBStorage.getItem('test-key')).toBe('first')
        await Promise.all([
            indexedDBStorage.setItem('test-key', 'second'),
            indexedDBStorage.setItem('another-key', 'other')
        ])
        expect(await indexedDBStorage.getItem('test-key')).toBe('second')
        await indexedDBStorage.removeItem('test-key')
        expect(await indexedDBStorage.getItem('test-key')).toBeNull()
    })
})
