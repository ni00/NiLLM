import { afterEach, describe, expect, it, vi } from 'vitest'
import { indexedDBStorage } from './indexeddb-storage'

afterEach(() => vi.restoreAllMocks())

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

    it('reads many keys in one transaction with nulls for misses', async () => {
        await indexedDBStorage.setItem('multi-a', '1')
        const values = await indexedDBStorage.readMany([
            'multi-a',
            'multi-missing'
        ])
        expect(values).toEqual({ 'multi-a': '1', 'multi-missing': null })
    })

    it('applies puts and deletes atomically in one commit', async () => {
        await indexedDBStorage.setItem('commit-old', 'stale')
        await indexedDBStorage.commit(
            { 'commit-new': 'fresh', 'commit-old': 'replaced' },
            ['commit-gone']
        )
        expect(await indexedDBStorage.getItem('commit-old')).toBe('replaced')
        expect(await indexedDBStorage.getItem('commit-new')).toBe('fresh')
        expect(await indexedDBStorage.getItem('commit-gone')).toBeNull()
    })

    it('rolls back every queued put and delete when its transaction aborts', async () => {
        await indexedDBStorage.commit(
            {
                'rollback-old': 'original',
                'rollback-delete': 'retained'
            },
            []
        )
        const put = IDBObjectStore.prototype.put
        vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementationOnce(
            function (this: IDBObjectStore, value, key) {
                const request = put.call(this, value, key)
                const transaction = this.transaction
                queueMicrotask(() => transaction.abort())
                return request
            }
        )
        await expect(
            indexedDBStorage.commit(
                {
                    'rollback-old': 'replacement',
                    'rollback-new': 'new'
                },
                ['rollback-delete']
            )
        ).rejects.toBeInstanceOf(Error)
        expect(
            await indexedDBStorage.readMany([
                'rollback-old',
                'rollback-new',
                'rollback-delete'
            ])
        ).toEqual({
            'rollback-old': 'original',
            'rollback-new': null,
            'rollback-delete': 'retained'
        })
    })

    it('dumps every stored record as raw strings', async () => {
        const stamp = 'dump-key'
        await indexedDBStorage.setItem(stamp, 'value')
        const records = await indexedDBStorage.dump()
        expect(records[stamp]).toBe('value')
    })
})
