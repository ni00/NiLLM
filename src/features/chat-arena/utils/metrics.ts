export const getMetricColor = (
    value: number,
    min: number,
    max: number,
    type: 'min-best' | 'max-best'
) => {
    if (min === max || value === 0) return 'text-foreground'

    if (type === 'min-best') {
        if (value === min)
            return 'text-emerald-600 dark:text-emerald-400 font-bold'
        if (value === max) return 'text-rose-600 dark:text-rose-400'
    } else {
        if (value === max)
            return 'text-emerald-600 dark:text-emerald-400 font-bold'
        if (value === min) return 'text-rose-600 dark:text-rose-400'
    }
    return 'text-foreground'
}

export const getStarColor = (score: number) => {
    switch (score) {
        case 1:
            return 'text-red-500 fill-red-500'
        case 2:
            return 'text-orange-500 fill-orange-500'
        case 3:
            return 'text-yellow-500 fill-yellow-500'
        case 4:
            return 'text-lime-500 fill-lime-500'
        case 5:
            return 'text-emerald-500 fill-emerald-500'
        default:
            return 'text-muted-foreground/40'
    }
}

export const getScoreBadgeStyles = (score: number) => {
    const s = Math.round(score)
    switch (s) {
        case 1:
            return 'bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-400 shadow-[0_0_12px_-4px_rgba(239,68,68,0.5)]'
        case 2:
            return 'bg-orange-500/15 border-orange-500/30 text-orange-600 dark:text-orange-400 shadow-[0_0_12px_-4px_rgba(249,115,22,0.5)]'
        case 3:
            return 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-[0_0_12px_-4px_rgba(245,158,11,0.5)]'
        case 4:
            return 'bg-lime-500/15 border-lime-500/30 text-lime-600 dark:text-lime-400 shadow-[0_0_12px_-4px_rgba(132,204,22,0.5)]'
        case 5:
            return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-[0_0_12px_-4px_rgba(16,185,129,0.5)]'
        default:
            return 'bg-muted/30 border-border text-muted-foreground'
    }
}
