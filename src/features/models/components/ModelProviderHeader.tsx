import { useI18n } from '@/lib/i18n'
import { memo } from 'react'
import { Button } from '@/components/ui/button'
import type { ModelGroup } from '../domain/model-rows'
import type { ProviderConnection } from '@/lib/providers/discovery'

export const ModelProviderHeader = memo(function ModelProviderHeader({
    group,
    first,
    count,
    all,
    onFetch,
    onSelect
}: {
    group: ModelGroup
    first: boolean
    count: number
    all: boolean
    onFetch: (connection: ProviderConnection) => void
    onSelect: (ids: string[], active: boolean) => void
}) {
    const t = useI18n()
    return (
        <div
            className={`flex flex-wrap items-center justify-between gap-3 border-b pb-3 ${first ? '' : 'pt-4'}`}
        >
            <div className="min-w-0">
                <h2 className="text-lg font-semibold">
                    {group.models[0]?.providerName?.trim()
                        ? group.label
                        : t(group.label)}{' '}
                    <span className="text-xs text-muted-foreground">
                        {t('{count} models · {active} active', {
                            count: group.models.length,
                            active: count
                        })}
                    </span>
                </h2>
                {group.endpoint && (
                    <p
                        className="text-xs text-muted-foreground truncate max-w-lg"
                        title={group.endpoint}
                    >
                        {group.endpoint}
                    </p>
                )}
            </div>
            <div className="flex gap-2">
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onFetch(group.models[0])}
                >
                    {t('Fetch all models')}
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                        onSelect(
                            group.models.map((model) => model.id),
                            !all
                        )
                    }
                >
                    {all ? t('Deselect provider') : t('Select provider')}
                </Button>
            </div>
        </div>
    )
})
