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

        const isTauri =
            typeof window !== 'undefined' &&
            // @ts-expect-error Tauri internal properties not typed
            !!(window.__TAURI_INTERNALS__ || window.__TAURI__)

        let savedViaTauri = false

        if (isTauri) {
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
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = fileName
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
        }
    } catch (error) {
        console.error('Failed to download image:', error)
    }
}
