import { useI18n } from '@/lib/i18n'
import { Star } from 'lucide-react'
import { getStarColor, getScoreBadgeStyles } from '../../utils/metrics'

interface RatingBarProps {
    rating?: number
    ratingSource?: 'ai' | 'human'
    onRate: (score: number) => void
}

export function RatingBar({ rating, ratingSource, onRate }: RatingBarProps) {
    const t = useI18n()
    return (
        <div className="flex items-center gap-3 pt-4 border-t border-border/30 mt-4 group/rating flex-wrap">
            <div className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
                {t('Score')}
            </div>
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((score) => (
                    <button
                        key={score}
                        type="button"
                        aria-label={t('Rate {score} out of 5', { score })}
                        aria-pressed={rating === score}
                        onClick={() => onRate(score)}
                        className="min-h-11 min-w-11 inline-flex items-center justify-center p-1 hover:bg-primary/5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <Star
                            className={`w-4 h-4 transition-all ${(rating || 0) >= score ? getStarColor(rating || 0) : 'text-muted-foreground/20 group-hover/rating:text-primary/20'}`}
                        />
                    </button>
                ))}
            </div>
            {rating && (
                <div
                    className={`ml-auto flex items-center gap-2 px-3 py-1 rounded-full border transition-all hover:scale-110 active:scale-95 cursor-default ${getScoreBadgeStyles(rating)}`}
                >
                    <span className="text-xs font-black uppercase tracking-tighter opacity-80 whitespace-nowrap">
                        {ratingSource === 'ai'
                            ? t('AI Judge')
                            : ratingSource === 'human'
                              ? t('Human Judge')
                              : t('Unknown rating source')}
                    </span>
                    <span className="text-[14px] font-bold tabular-nums tracking-tight border-l pl-2 ml-0.5 border-current/20 leading-none">
                        {rating.toFixed(1)}
                    </span>
                </div>
            )}
        </div>
    )
}
