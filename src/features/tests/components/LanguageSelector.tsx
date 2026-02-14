import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from '@/components/ui/popover'
import { Languages } from 'lucide-react'

type Language = 'en' | 'zh' | 'ja'

interface LanguageSelectorProps {
    currentLanguage: Language
    onChange: (lang: Language) => void
}

const languageLabels: Record<Language, string> = {
    en: '🇺🇸 English',
    zh: '🇨🇳 中文',
    ja: '🇯🇵 日本語'
}

export function LanguageSelector({
    currentLanguage,
    onChange
}: LanguageSelectorProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className="h-9 px-4 group gap-2 shadow-sm transition-all active:scale-95"
                >
                    <Languages className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-xs font-medium">
                        {languageLabels[currentLanguage]}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1" align="end">
                <div className="grid gap-1">
                    {(Object.keys(languageLabels) as Language[]).map((lang) => (
                        <Button
                            key={lang}
                            variant="ghost"
                            className="justify-start font-normal h-8 px-2"
                            onClick={() => onChange(lang)}
                        >
                            {languageLabels[lang]}
                        </Button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    )
}
