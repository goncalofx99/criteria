import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Capacitor regenerates ios/ and android/ from ignored local projects. Keep
// release transport policy in this tracked hook so every sync reapplies it.
const mobileDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const platform = process.env.CAPACITOR_PLATFORM_NAME

if (platform && platform !== 'android' && platform !== 'ios') {
  throw new Error(`Unsupported Capacitor platform: ${platform}`)
}

function writeIfChanged(path, next) {
  if (existsSync(path) && readFileSync(path, 'utf8') === next) return
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, next)
  console.log(`[native transport] Updated ${path.slice(mobileDir.length + 1)}`)
}

function requireFile(path) {
  if (!existsSync(path)) {
    throw new Error(`Missing generated native file: ${path}. Add the platform before syncing it.`)
  }
  return readFileSync(path, 'utf8')
}

function setXmlAttribute(tag, name, value) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const attribute = new RegExp(`\\s${escaped}="[^"]*"`)
  return attribute.test(tag)
    ? tag.replace(attribute, ` ${name}="${value}"`)
    : tag.replace(/\s*\/?\>$/, (ending) => ` ${name}="${value}"${ending}`)
}

function updateTag(xml, name, update) {
  const tag = new RegExp(`<${name}\\b[^>]*>`, 'm')
  if (!tag.test(xml)) throw new Error(`Missing <${name}> in native XML`)
  return xml.replace(tag, (match) => update(match))
}

function hardenAndroid() {
  const mainPath = join(mobileDir, 'android/app/src/main/AndroidManifest.xml')
  const main = requireFile(mainPath)
  writeIfChanged(
    mainPath,
    updateTag(main, 'application', (tag) =>
      setXmlAttribute(tag, 'android:usesCleartextTraffic', 'false'),
    ),
  )

  const debugPath = join(mobileDir, 'android/app/src/debug/AndroidManifest.xml')
  let debug = existsSync(debugPath)
    ? readFileSync(debugPath, 'utf8')
    : '<?xml version="1.0" encoding="utf-8"?>\n<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n</manifest>\n'

  debug = updateTag(debug, 'manifest', (tag) =>
    setXmlAttribute(tag, 'xmlns:tools', 'http://schemas.android.com/tools'),
  )
  if (!/<application\b/.test(debug)) {
    debug = debug.replace(
      /<\/manifest\s*>/,
      '    <application />\n</manifest>',
    )
  }
  debug = updateTag(debug, 'application', (tag) => {
    let next = setXmlAttribute(tag, 'android:usesCleartextTraffic', 'true')
    const currentReplacements = /\stools:replace="([^"]*)"/.exec(next)?.[1]
    const replacements = new Set(
      currentReplacements?.split(',').map((entry) => entry.trim()).filter(Boolean) ?? [],
    )
    replacements.add('android:usesCleartextTraffic')
    next = setXmlAttribute(next, 'tools:replace', [...replacements].join(','))
    return next
  })
  writeIfChanged(debugPath, debug)
}

function hardenIos() {
  const infoPath = join(mobileDir, 'ios/App/App/Info.plist')
  const info = requireFile(infoPath)
  const atsKey = /<key>NSAppTransportSecurity<\/key>/
  const permissiveAts = /\s*<key>NSAppTransportSecurity<\/key>\s*<dict>\s*<key>NSAllowsArbitraryLoads<\/key>\s*<true\s*\/>\s*<\/dict>/
  if (atsKey.test(info) && !permissiveAts.test(info)) {
    throw new Error('Info.plist has an unrecognized App Transport Security policy; review before making a Release copy.')
  }
  const releaseInfo = info.replace(permissiveAts, '')
  if (/NSAllowsArbitraryLoads/.test(releaseInfo)) {
    throw new Error('Release Info.plist would still allow arbitrary loads.')
  }
  const releasePath = join(mobileDir, 'ios/App/App/Info-Release.plist')
  writeIfChanged(releasePath, releaseInfo)

  const projectPath = join(mobileDir, 'ios/App/App.xcodeproj/project.pbxproj')
  const project = requireFile(projectPath)
  const releaseConfigs = [...project.matchAll(/\t\t[A-F0-9]+ \/\* Release \*\/ = \{[\s\S]*?\n\t\t\};/g)]
  const appReleaseConfigs = releaseConfigs.filter(([block]) =>
    /PRODUCT_BUNDLE_IDENTIFIER\s*=\s*com\.criteria\.app;/.test(block),
  )
  if (appReleaseConfigs.length !== 1) {
    throw new Error('Could not identify the App target Release build configuration in project.pbxproj.')
  }
  const releaseBlock = appReleaseConfigs[0][0]
  if (!/INFOPLIST_FILE\s*=\s*[^;]+;/.test(releaseBlock)) {
    throw new Error('App Release build configuration has no INFOPLIST_FILE setting.')
  }
  const hardenedBlock = releaseBlock.replace(
    /INFOPLIST_FILE\s*=\s*[^;]+;/,
    'INFOPLIST_FILE = App/Info-Release.plist;',
  )
  writeIfChanged(projectPath, project.replace(releaseBlock, hardenedBlock))
}

if (!platform || platform === 'android') {
  if (platform || existsSync(join(mobileDir, 'android'))) hardenAndroid()
}
if (!platform || platform === 'ios') {
  if (platform || existsSync(join(mobileDir, 'ios'))) hardenIos()
}
