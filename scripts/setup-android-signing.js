import fs from 'fs'

const filePath = 'build.gradle.kts'
let content = fs.readFileSync(filePath, 'utf8')

const importsToAdd = []
if (!content.includes('import java.io.FileInputStream')) {
    importsToAdd.push('import java.io.FileInputStream')
}
if (!content.includes('import java.util.Properties')) {
    importsToAdd.push('import java.util.Properties')
}

if (importsToAdd.length > 0) {
    const newImports = importsToAdd.join('\n')
    content = content.replace(/(plugins\s*\{[^}]*\})/, `$1\n\n${newImports}`)
}

const signingConfig = `    signingConfigs {
        create("release") {
            val keystorePropertiesFile = rootProject.file("keystore.properties")
            val keystoreProperties = Properties()
            if (keystorePropertiesFile.exists()) {
                keystoreProperties.load(FileInputStream(keystorePropertiesFile))
            }
            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["keyPassword"] as String
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["storePassword"] as String
        }
    }
`

content = content.replace(
    /(android\s*\{[\s\S]*?)(\n\s*buildTypes\s*\{)/,
    `$1\n${signingConfig}$2`
)

content = content.replace(
    /(getByName\("release"\)\s*\{)/,
    `$1\n        signingConfig = signingConfigs.getByName("release")`
)

fs.writeFileSync(filePath, content)
