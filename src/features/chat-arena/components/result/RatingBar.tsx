import { Star } from 'lucide-react'
import { getStarColor, getScoreBadgeStyles } from '../../utils/metrics'

interface RatingBarProps {
    rating?: number
    ratingSource?: 'ai' | 'human'
    onRate: (score: number) => void
}

export function RatingBar({ rating, ratingSource, onRate }: RatingBarProps) {
    if (!rating) return null

    return (
        <div className="flex items-center gap-3 pt-4 border-t border-border/30 mt-4 group/rating">
            <div className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                Score
            </div>
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((score) => (
                    <button
                        key={score}
                        onClick={() => onRate(score)}
                        className="focus:outline-none p-1 hover:bg-primary/5 rounded-full transition-all hover:scale-110 active:scale-90"
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
                    <span className="text-[10px] font-black uppercase tracking-tighter opacity-80 whitespace-nowrap">
                        {ratingSource === 'ai' ? 'AI Judge' : 'Human Judge'}
                    </span>
                    <span className="text-[14px] font-bold tabular-nums tracking-tight border-l pl-2 ml-0.5 border-current/20 leading-none">
                        {rating.toFixed(1)}
                    </span>
                </div>
            )}
        </div>
    )
}
