import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import {
    ErrorView,
    ErrorHeader,
    ErrorDescription,
    ErrorActions
} from '@/features/errors/error-base'
import { useNavigate } from 'react-router'

export default function NotFoundErrorPage() {
    const t = useI18n()
    const navigate = useNavigate()
    return (
        <ErrorView>
            <ErrorHeader>{t('Page not found')}</ErrorHeader>
            <ErrorDescription>
                {t('Sorry, we couldn’t find the page you’re looking for.')}
            </ErrorDescription>
            <ErrorActions>
                <Button size="lg" onClick={() => navigate(-1)}>
                    {t('Go back')}
                </Button>
                <Button size="lg" variant="ghost">
                    {t('Contact support')}{' '}
                    <span aria-hidden="true" className="ml-1">
                        {'→'}
                    </span>
                </Button>
            </ErrorActions>
        </ErrorView>
    )
}

// Necessary for react router to lazy load.
export const Component = NotFoundErrorPage
