import { useI18n } from '@/lib/i18n'
import type { BenchmarkResult } from '@/lib/types'
import { RatingBar } from '@/features/chat-arena/components/result/RatingBar'
import {
    ResponseBody,
    displayStatus
} from '@/features/chat-arena/components/result/ResponseBody'
import { resultStatus } from '@/lib/statistics'
import { formatUSD } from '@/features/stats/domain/export-csv'

export function AttemptView({
    attempt,
    index,
    mode,
    open,
    onToggle,
    onRate
}: {
    attempt: BenchmarkResult
    index: number
    mode: 'chat' | 'image' | 'decision'

    open: boolean
    onToggle: () => void
    onRate: (resultId: string, score: number) => void
}) {
    const t = useI18n()
    const completed = resultStatus(attempt) === 'completed'
    const rule = mode !== 'image' ? attempt.ruleEvaluation : undefined
    const judge = mode !== 'image' ? attempt.judgeEvaluation : undefined
    return (
        <div className="rounded-md border bg-background/60 text-xs">
            <button
                type="button"
                className="w-full min-h-11 flex items-center justify-between gap-2 p-2 text-left text-sm"
                onClick={onToggle}
                aria-expanded={open}
            >
                <span className="font-medium">
                    #{index + 1} · {t(resultStatus(attempt))}
                </span>
                <span className="text-muted-foreground tabular-nums">
                    {mode === 'decision'
                        ? `${Math.round(attempt.metrics.totalDuration)}ms`
                        : ''}
                    {attempt.metrics.ttft > 0
                        ? `TTFT ${Math.round(attempt.metrics.ttft)}ms${mode === 'chat' ? ` · ${attempt.metrics.tps.toFixed(1)} TPS` : ''}`
                        : ''}
                    {attempt.metrics.cost != null
                        ? ` · ${formatUSD(attempt.metrics.cost)}`
                        : ''}
                </span>
            </button>
            {open && (
                <div className="p-2 pt-0 space-y-2">
                    <ResponseBody
                        isDecision={mode === 'decision'}
                        response={attempt.response}
                        reasoning={attempt.reasoning}
                        isStreaming={false}
                        status={displayStatus(attempt)}
                        error={attempt.error}
                    />
                    <div className="space-y-1.5 border-t border-border/40 pt-2">
                        {completed ? (
                            <>
                                {rule ? (
                                    <div
                                        className={
                                            rule.passed
                                                ? 'text-success'
                                                : 'text-destructive'
                                        }
                                    >
                                        {t('Rule')} ({rule.type}):{' '}
                                        {rule.passed
                                            ? t('Passed')
                                            : t('Failed')}
                                        {rule.reason
                                            ? ` — ${t(rule.reason)}`
                                            : ''}{' '}
                                        ·{' '}
                                        <span className="text-muted-foreground">
                                            {new Date(
                                                rule.evaluatedAt
                                            ).toLocaleString()}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="text-muted-foreground">
                                        {mode === 'image'
                                            ? t(
                                                  'Rule scoring is not applicable to image responses.'
                                              )
                                            : t(
                                                  'Rule evaluation: not evaluated'
                                              )}
                                    </div>
                                )}
                                {judge ? (
                                    <div className="space-y-1">
                                        <div className="tabular-nums">
                                            {t('AI judging')} —{' '}
                                            {judge.judge.name}: {t('Accuracy')}{' '}
                                            {judge.accuracy}/5 ·{' '}
                                            {t('Instruction following')}{' '}
                                            {judge.instructionFollowing}
                                            /5 · {t('Completeness')}{' '}
                                            {judge.completeness}/5 ·{' '}
                                            <span className="text-muted-foreground">
                                                {new Date(
                                                    judge.judgedAt
                                                ).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="italic text-muted-foreground select-text">
                                            {judge.rationale}
                                        </div>
                                        {judge.usage?.cost != null && (
                                            <div className="text-muted-foreground tabular-nums">
                                                {t('Judging cost')}:{' '}
                                                {formatUSD(judge.usage.cost)}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-muted-foreground">
                                        {mode === 'image'
                                            ? t(
                                                  'AI judging is not applicable to image responses.'
                                              )
                                            : t('AI judging: not evaluated')}
                                    </div>
                                )}
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <RatingBar
                                        rating={attempt.rating}
                                        ratingSource={attempt.ratingSource}
                                        onRate={(score) =>
                                            onRate(attempt.id, score)
                                        }
                                    />
                                    {attempt.rating != null && (
                                        <span className="text-muted-foreground">
                                            {attempt.ratingSource === 'ai'
                                                ? t('AI Judge')
                                                : attempt.ratingSource ===
                                                    'human'
                                                  ? t('Human Judge')
                                                  : t(
                                                        'Unknown rating source'
                                                    )}{' '}
                                            ·{' '}
                                            {attempt.ratedAt !== undefined
                                                ? new Date(
                                                      attempt.ratedAt
                                                  ).toLocaleString()
                                                : t('Time unknown')}
                                        </span>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="text-muted-foreground">
                                {t('Scoring not applicable to this attempt')}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
