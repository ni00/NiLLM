import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const version = process.argv[2]

if (!version) {
    console.error('Please provide a version number (e.g., 1.0.1)')
    process.exit(1)
}

// 1. Update package.json
const pkgPath = path.join(rootDir, 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
pkg.version = version
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + '\n')
console.log(`Updated package.json to ${version}`)

// 2. Update src-tauri/tauri.conf.json
const tauriConfPath = path.join(rootDir, 'src-tauri', 'tauri.conf.json')
if (fs.existsSync(tauriConfPath)) {
    const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf-8'))
    tauriConf.version = version
    fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n')
    console.log(`Updated tauri.conf.json to ${version}`)
}

// 3. Update src-tauri/Cargo.toml
const cargoPath = path.join(rootDir, 'src-tauri', 'Cargo.toml')
if (fs.existsSync(cargoPath)) {
    let cargo = fs.readFileSync(cargoPath, 'utf-8')
    cargo = cargo.replace(/^version = ".*"$/m, `version = "${version}"`)
    fs.writeFileSync(cargoPath, cargo)
    console.log(`Updated Cargo.toml to ${version}`)
}

console.log('Successfully bumped version to ' + version)
