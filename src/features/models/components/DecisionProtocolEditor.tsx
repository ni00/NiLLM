import { Label } from '@/components/ui/label'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { useI18n } from '@/lib/i18n'
import type { LLMModel } from '@/lib/types'

export function DecisionProtocolEditor({
    value,
    onChange
}: {
    value: Partial<LLMModel>
    onChange: (value: Partial<LLMModel>) => void
}) {
    const t = useI18n()
    if (value.mode !== 'decision') return null
    return (
        <div className="space-y-2">
            <Label>{t('Decision API')}</Label>
            <SelectDropdown
                ariaLabel={t('Decision API')}
                value={
                    value.provider === 'typesafe'
                        ? 'system-one'
                        : (value.decisionProtocol ?? 'auto')
                }
                onChange={(protocol) =>
                    onChange({
                        ...value,
                        decisionProtocol:
                            protocol === 'auto'
                                ? undefined
                                : (protocol as LLMModel['decisionProtocol'])
                    })
                }
                options={
                    value.provider === 'typesafe'
                        ? [{ label: 'System One', value: 'system-one' }]
                        : [
                              { label: t('Automatic'), value: 'auto' },
                              { label: 'System One', value: 'system-one' },
                              {
                                  label: t('Chat Completions (JSON)'),
                                  value: 'structured'
                              },
                              {
                                  label: 'OpenAI Responses',
                                  value: 'openai-responses'
                              }
                          ]
                }
                className="w-full justify-between"
            />
            <p className="text-xs text-muted-foreground">
                {t(
                    'Automatic uses System One for Jev and structured output for language models. Responses uses the OpenAI Responses API.'
                )}
            </p>
        </div>
    )
}
