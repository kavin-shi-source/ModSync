const fs = require('fs')
const fsPromises = require('fs/promises')
const path = require('path')
const crypto = require('crypto')

const templateExcludedDirs = ['.manager', '.git', 'node_modules', 'cache', 'logs', 'libraries', 'versions', 'assets', 'crash-reports', 'debug']
const templateExcludedFiles = ['servers.dat', 'usercache.json', 'usernamecache.json', 'ops.json', 'whitelist.json', 'banned-players.json', 'banned-ips.json', 'eula.txt', 'server.properties', 'bukkit.yml', 'spigot.yml', 'paper.yml', 'purpur.yml']

function isExcluded(relativePath) {
  const parts = relativePath.split(/[/\\]/)
  for (const part of parts) {
    if (templateExcludedDirs.includes(part)) return true
  }
  const fileName = path.basename(relativePath)
  if (templateExcludedFiles.includes(fileName)) return true
  return false
}

async function flattenDirectory(dirPath, relativeDir = '') {
  const result = []
  try {
    const entries = await fsPromises.readdir(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name
      const fullPath = path.join(dirPath, entry.name)

      if (isExcluded(relativePath)) continue

      if (entry.isDirectory()) {
        const subFiles = await flattenDirectory(fullPath, relativePath)
        result.push(...subFiles)
      } else if (entry.isFile()) {
        result.push({
          relativePath,
          fullPath,
          name: entry.name
        })
      }
    }
  } catch (err) {
    console.error(`读取目录失败 ${dirPath}: ${err.message}`)
  }
  return result
}

function computeHashSync(filePath) {
  try {
    const content = fs.readFileSync(filePath)
    return crypto.createHash('sha256').update(content).digest('hex')
  } catch {
    return null
  }
}

async function diffDirectories(templatePath, serverPath, overrides = []) {
  const overriddenSet = new Set(overrides.map(o => o.relativePath))
  const templateFiles = await flattenDirectory(templatePath)
  const serverFiles = await flattenDirectory(serverPath)
  const templateMap = new Map(templateFiles.map(f => [f.relativePath, f]))
  const serverMap = new Map(serverFiles.map(f => [f.relativePath, f]))

  const allPaths = new Set([...templateMap.keys(), ...serverMap.keys()])
  const added = []
  const modified = []
  const deleted = []
  const conflicted = []

  for (const relativePath of allPaths) {
    const templateFile = templateMap.get(relativePath)
    const serverFile = serverMap.get(relativePath)

    if (!templateFile && serverFile) {
      // 模板没有，服务器有 = 服务器独有
      added.push({
        type: 'serverOnly',
        relativePath,
        serverFile,
        templateFile: null
      })
    } else if (templateFile && !serverFile) {
      // 模板有，服务器没有 = 需要添加到服务器
      added.push({
        type: 'templateOnly',
        relativePath,
        templateFile,
        serverFile: null
      })
    } else if (templateFile && serverFile) {
      const templateHash = computeHashSync(templateFile.fullPath)
      const serverHash = computeHashSync(serverFile.fullPath)
      if (templateHash !== serverHash) {
        if (overriddenSet.has(relativePath)) {
          modified.push({
            type: 'overridden',
            relativePath,
            templateFile,
            serverFile,
            templateHash,
            serverHash
          })
        } else {
          modified.push({
            type: 'modified',
            relativePath,
            templateFile,
            serverFile,
            templateHash,
            serverHash
          })
        }
      }
    }
  }

  return { added, modified, deleted, conflicted }
}

async function syncFile(src, dest) {
  try {
    await fsPromises.mkdir(path.dirname(dest), { recursive: true })
    await fsPromises.copyFile(src, dest)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function collectToTemplate(serverPath, templatePath, relativePath) {
  try {
    const src = path.join(serverPath, relativePath)
    const dest = path.join(templatePath, relativePath)
    await fsPromises.mkdir(path.dirname(dest), { recursive: true })
    await fsPromises.copyFile(src, dest)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

module.exports = {
  diffDirectories, syncFile, collectToTemplate, flattenDirectory, templateExcludedDirs, templateExcludedFiles
}
