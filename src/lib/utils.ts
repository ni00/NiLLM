import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export async function downloadFile(
    content: string,
    fileName: string,
    mimeType: string
) {
    // Check for Tauri environment
    // @ts-ignore
    const isTauri =
        typeof window !== 'undefined' &&
        !!(window.__TAURI_INTERNALS__ || window.__TAURI__)

    if (isTauri) {
        try {
            const { save } = await import('@tauri-apps/plugin-dialog')
            const { writeTextFile } = await import('@tauri-apps/plugin-fs')

            // Determine extension from fileName
            const extension = fileName.split('.').pop() || 'txt'
            const filterName = extension.toUpperCase()

            const filePath = await save({
                defaultPath: fileName,
                filters: [
                    {
                        name: filterName,
                        extensions: [extension]
                    }
                ]
            })

            if (filePath) {
                await writeTextFile(filePath, content)
            }
            return
        } catch (e) {
            console.error(
                'Tauri save failed, falling back to browser download',
                e
            )
        }
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

export async function downloadJson(data: any, fileName: string) {
    const jsonStr = JSON.stringify(data, null, 2)
    return downloadFile(jsonStr, fileName, 'application/json')
}

export function readJsonFile(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string)
                resolve(json)
            } catch (err) {
                reject(err)
            }
        }
        reader.onerror = reject
        reader.readAsText(file)
    })
}
