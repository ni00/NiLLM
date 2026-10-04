import { useI18n } from '@/lib/i18n'
import { relaunch } from '@tauri-apps/plugin-process'
import { Button } from '@/components/ui/button'
import {
    ErrorView,
    ErrorHeader,
    ErrorDescription,
    ErrorActions
} from '@/features/errors/error-base'

export default function AppErrorPage() {
    const t = useI18n()
    return (
        <ErrorView>
            <ErrorHeader>{t("We're fixing it")}</ErrorHeader>
            <ErrorDescription>
                {t('The app encountered an error and needs to be restarted.')}
                <br />
                {t("We know about it and we're working to fix it.")}
            </ErrorDescription>
            <ErrorActions>
                <Button size="lg" onClick={relaunch}>
                    {t('Relaunch app')}
                </Button>
            </ErrorActions>
        </ErrorView>
    )
}
