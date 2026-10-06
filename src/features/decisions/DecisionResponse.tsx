import { useI18n } from '@/lib/i18n'
import { decisionResponseSchema } from '@/lib/decisions'

export function DecisionResponse({ response }: { response: string }) {
    const t = useI18n()
    let value: unknown
    try {
        value = JSON.parse(response)
    } catch {
        return <pre className="whitespace-pre-wrap break-all">{response}</pre>
    }
    const parsed = decisionResponseSchema.safeParse(value)
    if (!parsed.success)
        return <pre className="whitespace-pre-wrap break-all">{response}</pre>
    const { answers, model, confidenceSource } = parsed.data
    return (
        <div className="space-y-3" data-testid="decision-response">
            {model && (
                <p className="text-xs text-muted-foreground break-all">
                    {t('Resolved model')}: {model}
                </p>
            )}
            {Object.entries(answers).map(([id, answer]) => (
                <section key={id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex justify-between flex-wrap gap-2 text-sm">
                        <span className="font-medium break-all">
                            {id}{' '}
                            <span className="text-xs text-muted-foreground">
                                ({answer.type})
                            </span>
                        </span>
                        <strong>
                            {answer.type === 'choice'
                                ? answer.choice
                                : answer.type === 'score'
                                  ? Number(answer.score.toFixed(4))
                                  : `${(answer.noul * 100).toFixed(1)}% ${t('Yes')}`}
                        </strong>
                    </div>
                    {answer.type !== 'noul' && (
                        <>
                            <table className="w-full text-xs">
                                <caption className="sr-only">
                                    {t('Probability distribution')}
                                </caption>
                                <thead>
                                    <tr>
                                        <th scope="col" className="text-left">
                                            {t('Option')}
                                        </th>
                                        <th scope="col" className="text-right">
                                            {t('Probability')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(answer.probabilities).map(
                                        ([option, probability]) => (
                                            <tr key={option}>
                                                <th
                                                    scope="row"
                                                    className="text-left font-normal break-all pr-2"
                                                >
                                                    {answer.type === 'score'
                                                        ? `${option}: ${typeof answer.legend[option] === 'string' ? answer.legend[option] : JSON.stringify(answer.legend[option])}`
                                                        : option}
                                                </th>
                                                <td className="text-right tabular-nums">
                                                    {(
                                                        probability * 100
                                                    ).toFixed(2)}
                                                    %
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                            <p className="text-xs text-muted-foreground">
                                {t(
                                    confidenceSource === 'self-reported'
                                        ? 'Self-reported confidence'
                                        : 'Provider confidence'
                                )}
                                : {(answer.confidence * 100).toFixed(1)}%
                            </p>
                        </>
                    )}
                </section>
            ))}
            <details className="text-xs">
                <summary className="cursor-pointer min-h-11 flex items-center">
                    {t('Raw decision JSON')}
                </summary>
                <pre className="whitespace-pre-wrap break-all overflow-x-auto">
                    {response}
                </pre>
            </details>
        </div>
    )
}
