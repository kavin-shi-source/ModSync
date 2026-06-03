const fs = require('fs')
const fsPromises = require('fs/promises')
const path = require('path')
const crypto = require('crypto')

async function readDirectory(dirPath) {
  try {
    const entries = await fsPromises.readdir(dirPath, { withFileTypes: true })
    const result = []
    for (const entry of entries) {
      const isFile = entry.isFile()
      const isDirectory = entry.isDirectory()
      result.push({
        name: entry.name,
        type: isFile ? 'file' : isDirectory ? 'directory' : 'other',
        isDirectory,
        isFile,
        path: path.join(dirPath, entry.name)
      })
    }
    result.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    return result
  } catch (err) {
    throw new Error(`读取目录失败: ${err.message}`)
  }
}

async function getFileInfo(filePath) {
  try {
    const stat = await fsPromises.stat(filePath)
    return {
      name: path.basename(filePath),
      path: filePath,
      size: stat.size,
      isDirectory: stat.isDirectory(),
      isFile: stat.isFile(),
      modifiedTime: stat.mtime.toISOString(),
      createdTime: stat.birthtime.toISOString()
    }
  } catch (err) {
    throw new Error(`获取文件信息失败: ${err.message}`)
  }
}

async function deleteFile(filePath) {
  try {
    const stat = await fsPromises.stat(filePath)
    if (stat.isDirectory()) {
      await fsPromises.rm(filePath, { recursive: true })
    } else {
      await fsPromises.unlink(filePath)
    }
    return true
  } catch (err) {
    throw new Error(`删除失败: ${err.message}`)
  }
}

async function renameFile(oldPath, newPath) {
  try {
    await fsPromises.rename(oldPath, newPath)
    return true
  } catch (err) {
    throw new Error(`重命名失败: ${err.message}`)
  }
}

async function copyFile(src, dest) {
  try {
    await fsPromises.mkdir(path.dirname(dest), { recursive: true })
    await fsPromises.copyFile(src, dest)
    return true
  } catch (err) {
    throw new Error(`复制失败: ${err.message}`)
  }
}

async function computeHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = fs.createReadStream(filePath)
    stream.on('data', data => hash.update(data))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', err => reject(new Error(`计算哈希失败: ${err.message}`)))
  })
}

async function fileExists(filePath) {
  try {
    await fsPromises.access(filePath)
    return true
  } catch {
    return false
  }
}

module.exports = {
  readDirectory, getFileInfo, deleteFile, renameFile, copyFile, computeHash, fileExists
}
