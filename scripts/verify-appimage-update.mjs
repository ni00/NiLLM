import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { basename, resolve } from 'node:path'

// Run after all bundle renaming/modification, before uploading either asset.
const [directory, expectedUpdateInfo] = process.argv.slice(2)
assert(
    directory && expectedUpdateInfo,
    'Usage: node scripts/verify-appimage-update.mjs <directory> <update-information>'
)
const [transport, owner, repo, channel, pattern, ...extra] =
    expectedUpdateInfo.split('|')
assert(
    transport === 'gh-releases-zsync' &&
        owner &&
        repo &&
        ['latest', 'nightly'].includes(channel) &&
        pattern &&
        extra.length === 0,
    'Expected GitHub Releases update information for latest or nightly'
)
const filenamePattern = new RegExp(
    `^${pattern
        .split('*')
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*')}$`
)
const images = (await readdir(directory)).filter((name) =>
    name.endsWith('.AppImage')
)
assert(images.length > 0, 'No AppImage found to validate')

for (const filename of images) {
    const imagePath = resolve(directory, filename)
    const actualUpdateInfo = execFileSync(
        imagePath,
        ['--appimage-updateinformation'],
        {
            encoding: 'utf8'
        }
    ).trim()
    assert.equal(
        actualUpdateInfo,
        expectedUpdateInfo,
        `${filename}: incorrect embedded update information`
    )
    assert(
        filenamePattern.test(`${filename}.zsync`),
        `${filename}: does not match the update asset pattern`
    )

    const zsync = await readFile(`${imagePath}.zsync`)
    const headerEnd = zsync.indexOf('\n\n')
    assert(
        headerEnd > 0 && headerEnd < zsync.length - 2,
        `${filename}: invalid or empty zsync file`
    )
    const headers = new Map(
        zsync
            .subarray(0, headerEnd)
            .toString('utf8')
            .split('\n')
            .map((line) => {
                const separator = line.indexOf(': ')
                return [line.slice(0, separator), line.slice(separator + 2)]
            })
    )
    assert(headers.has('zsync'), `${filename}: missing zsync format version`)
    assert.equal(
        headers.get('Filename'),
        filename,
        `${filename}: stale zsync filename`
    )
    const url = headers.get('URL')
    assert(url, `${filename}: missing zsync download URL`)
    // appimagetool uses a relative asset URL; also accept a release-specific absolute URL.
    const assetUrl = new URL(
        url,
        `https://github.com/${owner}/${repo}/releases/download/test/`
    )
    assert.equal(
        decodeURIComponent(basename(assetUrl.pathname)),
        filename,
        `${filename}: incorrect zsync download URL`
    )

    const image = await readFile(imagePath)
    assert.equal(
        Number(headers.get('Length')),
        image.length,
        `${filename}: incorrect zsync file size`
    )
    assert.equal(
        headers.get('SHA-1'),
        createHash('sha1').update(image).digest('hex'),
        `${filename}: zsync checksum mismatch`
    )
    console.log(
        `Verified ${filename}: ${channel} update channel and matching .zsync`
    )
}
