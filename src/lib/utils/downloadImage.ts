import { downloadBlob, isTauriRuntime } from '@/lib/utils'

export async function downloadImage(src: string): Promise<void> {
    if (!src) return

    let ext = 'png'
    const mimeMatch = src.match(/^data:image\/(\w+);/)
    if (mimeMatch) {
        ext = mimeMatch[1] === 'jpeg' ? 'jpg' : mimeMatch[1]
    }
    const fileName = `generated-image-${Date.now()}.${ext}`

    try {
        let blob: Blob

        if (src.startsWith('data:')) {
            const base64Match = src.match(/^data:image\/\w+;base64,(.+)$/)
            if (!base64Match) {
                console.error('Invalid data URL format')
                return
            }
            const byteCharacters = atob(base64Match[1])
            const byteNumbers = new Array(byteCharacters.length)
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i)
            }
            const byteArray = new Uint8Array(byteNumbers)
            const mimeType =
                src.match(/^data:(image\/\w+);/)?.[1] || 'image/png'
            blob = new Blob([byteArray], { type: mimeType })
        } else {
            const response = await fetch(src)
            blob = await response.blob()
        }

        let savedViaTauri = false

        if (isTauriRuntime()) {
            try {
                const { save } = await import('@tauri-apps/plugin-dialog')
                const { writeFile } = await import('@tauri-apps/plugin-fs')

                const filePath = await save({
                    defaultPath: fileName,
                    filters: [{ name: ext.toUpperCase(), extensions: [ext] }]
                })

                if (filePath) {
                    const arrayBuffer = await blob.arrayBuffer()
                    await writeFile(filePath, new Uint8Array(arrayBuffer))
                    savedViaTauri = true
                }
            } catch (tauriError) {
                console.warn(
                    'Tauri save failed, trying browser fallback:',
                    tauriError
                )
            }
        }

        if (!savedViaTauri) {
            downloadBlob(blob, fileName)
        }
    } catch (error) {
        console.error('Failed to download image:', error)
    }
}
