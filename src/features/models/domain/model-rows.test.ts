import { describe, expect, it } from 'vitest'
import { groupModels } from './models'
import { modelColumns, modelRows } from './model-rows'
import { model } from '@/test/fixtures'

describe('virtual model rows', () => {
    it('preserves every model and provider boundary across responsive grids', () => {
        const models = Array.from({ length: 1200 }, (_, index) => ({
            ...model(String(index)),
            providerName: `Provider ${Math.floor(index / 200)}`
        }))
        const groups = groupModels(models)
        for (const columns of [1, 3, 5]) {
            const rows = modelRows(groups, columns)
            expect(rows.filter((row) => row.kind === 'header')).toHaveLength(6)
            expect(
                rows.flatMap((row) => (row.kind === 'cards' ? row.models : []))
            ).toEqual(models)
            expect(new Set(rows.map((row) => row.key)).size).toBe(rows.length)
        }
    })
    it('keeps cards readable on mobile and caps wide grids', () => {
        expect(modelColumns(358)).toBe(1)
        expect(modelColumns(900)).toBe(3)
        expect(modelColumns(3000)).toBe(5)
    })
})
