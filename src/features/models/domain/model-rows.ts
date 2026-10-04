import type { LLMModel } from '@/lib/types'
import type { groupModels } from './models'

export type ModelGroup = ReturnType<typeof groupModels>[number]
export type ModelRow = {
    key: string
    group: ModelGroup
} & ({ kind: 'header'; first: boolean } | { kind: 'cards'; models: LLMModel[] })

export function modelColumns(width: number) {
    return Math.max(1, Math.min(5, Math.floor((width + 16) / 280)))
}

export function modelRows(groups: ModelGroup[], columns: number): ModelRow[] {
    const rows: ModelRow[] = []
    groups.forEach((group, index) => {
        rows.push({
            key: `header:${group.key}`,
            kind: 'header',
            group,
            first: index === 0
        })
        for (let start = 0; start < group.models.length; start += columns) {
            rows.push({
                key: `cards:${group.key}:${group.models[start].id}`,
                kind: 'cards',
                group,
                models: group.models.slice(start, start + columns)
            })
        }
    })
    return rows
}
