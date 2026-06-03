# Minecraft 多服务器模组管理器 — 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 subagent-driven-development（推荐）或 executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 构建一个 Windows 桌面应用（Electron + Vue 3），统一管理多个 Minecraft Forge/NeoForge 服务端的模组和目录文件。支持公共模板 + 服务器覆盖的同步模式，集成 Modrinth 模组搜索与更新。

**架构：** Electron 主进程处理文件系统操作、Modrinth API 调用和同步引擎，通过 IPC（contextBridge）暴露给 Vue 3 渲染进程。数据存储使用 better-sqlite3。

**技术栈：** Electron 28+、Vue 3 + Vite、Element Plus、better-sqlite3、electron-builder

**规格文档：** `docs/superpowers/specs/2026-06-03-minecraft-server-mod-manager-design.md`

---

### 任务 1：项目初始化和依赖安装

**文件：**
- 创建：`package.json`
- 创建：`vite.config.js`
- 创建：`index.html`

- [ ] **步骤 1：初始化项目并安装依赖**

```bash
cd "e:\java-xuexi\服务端模组更新器"
npm init -y
```

安装依赖：

```bash
# Electron
npm install electron electron-builder --save-dev

# Vite + Vue 3
npm install vue@3 vue-router@4 pinia
npm install vite @vitejs/plugin-vue --save-dev

# UI
npm install element-plus @element-plus/icons-vue

# Database
npm install better-sqlite3

# Build
npm install concurrently wait-on --save-dev

# Utilities
npm install uuid
```

- [ ] **步骤 2：创建 vite.config.js**

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    port: 5173
  }
})
```

- [ ] **步骤 3：创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Minecraft 多服务器模组管理器</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **步骤 4：配置 package.json 的 scripts**

编辑 `package.json`，添加：

```json
{
  "main": "electron/main.js",
  "scripts": {
    "dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\"",
    "build:renderer": "vite build",
    "build": "npm run build:renderer && electron-builder",
    "preview": "vite preview"
  }
}
```

- [ ] **步骤 5：验证项目结构可启动**

运行：`npm run dev`（确认 Electron 窗口能打开，Vite 开发服务器正常）
提交：`git add -A && git commit -m "chore: initialize Electron + Vue 3 project"`

---

### 任务 2：Electron 主进程 — 基础框架

**文件：**
- 创建：`electron/main.js`
- 创建：`electron/preload.js`

- [ ] **步骤 1：编写 electron/main.js**

```javascript
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Minecraft 多服务器模组管理器',
    show: false,
  })

  // 开发模式加载 Vite 开发服务器，生产模式加载打包文件
  const isDev = !app.isPackaged
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **步骤 2：编写 electron/preload.js**

```javascript
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 配置管理
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (config) => ipcRenderer.invoke('config:save', config),
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),

  // 服务器管理
  getServers: () => ipcRenderer.invoke('server:list'),
  saveServer: (server) => ipcRenderer.invoke('server:save', server),
  deleteServer: (id) => ipcRenderer.invoke('server:delete', id),

  // 文件系统
  readDirectory: (dirPath) => ipcRenderer.invoke('fs:readDirectory', dirPath),
  getFileInfo: (filePath) => ipcRenderer.invoke('fs:getFileInfo', filePath),
  deleteFile: (filePath) => ipcRenderer.invoke('fs:deleteFile', filePath),
  renameFile: (oldPath, newPath) => ipcRenderer.invoke('fs:renameFile', oldPath, newPath),
  copyFile: (src, dest) => ipcRenderer.invoke('fs:copyFile', src, dest),
  computeHash: (filePath) => ipcRenderer.invoke('fs:computeHash', filePath),
  fileExists: (filePath) => ipcRenderer.invoke('fs:fileExists', filePath),

  // Modrinth API
  searchMods: (query, limit) => ipcRenderer.invoke('modrinth:search', query, limit),
  getModVersions: (modId) => ipcRenderer.invoke('modrinth:versions', modId),
  downloadMod: (url, destPath) => ipcRenderer.invoke('modrinth:download', url, destPath),
  getModrinthModInfo: (modId) => ipcRenderer.invoke('modrinth:modInfo', modId),
  identifyMod: (fileName) => ipcRenderer.invoke('modrinth:identify', fileName),

  // 同步引擎
  diffDirectories: (templatePath, serverPath, overrides) => ipcRenderer.invoke('sync:diff', templatePath, serverPath, overrides),
  syncFile: (src, dest) => ipcRenderer.invoke('sync:file', src, dest),
  syncCollectToTemplate: (serverPath, templatePath, relativePath) => ipcRenderer.invoke('sync:collectToTemplate', serverPath, templatePath, relativePath),
})
```

- [ ] **步骤 3：验证 Electron 窗口能正常打开**

运行：`npm run dev`
预期：Electron 窗口打开，加载 Vue 页面（目前空白），控制台无报错

- [ ] **步骤 4：Commit**

```bash
git add electron/ package.json
git commit -m "feat: add Electron main process with preload"
```

---

### 任务 3：配置管理模块

**文件：**
- 创建：`electron/store.js`

- [ ] **步骤 1：编写 electron/store.js**

```javascript
const Database = require('better-sqlite3')
const path = require('path')
const { app } = require('electron')

const dbPath = path.join(app.getPath('userData'), 'manager.db')
const db = new Database(dbPath)

// 初始化表结构
db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS servers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    excludedDirs TEXT DEFAULT '[]',
    excludedFiles TEXT DEFAULT '[]',
    sortOrder INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS mods_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serverId TEXT NOT NULL,
    fileName TEXT NOT NULL,
    modId TEXT,
    displayName TEXT,
    version TEXT,
    enabled INTEGER DEFAULT 1,
    source TEXT DEFAULT 'server-only',
    modrinthId TEXT,
    latestVersion TEXT,
    hasUpdate INTEGER DEFAULT 0,
    UNIQUE(serverId, fileName)
  );
`)

function getConfig() {
  const rows = db.prepare('SELECT key, value FROM config').all()
  const config = {}
  rows.forEach(row => {
    try { config[row.key] = JSON.parse(row.value) }
    catch { config[row.key] = row.value }
  })
  return config
}

function setConfig(key, value) {
  const str = typeof value === 'string' ? value : JSON.stringify(value)
  db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, str)
}

// 服务器管理
function getServers() {
  return db.prepare('SELECT * FROM servers ORDER BY sortOrder').all().map(s => ({
    ...s,
    excludedDirs: JSON.parse(s.excludedDirs),
    excludedFiles: JSON.parse(s.excludedFiles),
  }))
}

function saveServer(server) {
  db.prepare(`
    INSERT OR REPLACE INTO servers (id, name, path, excludedDirs, excludedFiles, sortOrder)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    server.id,
    server.name,
    server.path,
    JSON.stringify(server.excludedDirs || []),
    JSON.stringify(server.excludedFiles || []),
    server.sortOrder || 0
  )
}

function deleteServer(id) {
  db.prepare('DELETE FROM servers WHERE id = ?').run(id)
  db.prepare('DELETE FROM mods_cache WHERE serverId = ?').run(id)
}

// 模组缓存
function getModsCache(serverId) {
  return db.prepare('SELECT * FROM mods_cache WHERE serverId = ?').all(serverId)
}

function upsertModCache(serverId, mod) {
  db.prepare(`
    INSERT OR REPLACE INTO mods_cache (serverId, fileName, modId, displayName, version, enabled, source, modrinthId, latestVersion, hasUpdate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    serverId, mod.fileName, mod.modId || null, mod.displayName || null,
    mod.version || null, mod.enabled ? 1 : 0, mod.source || 'server-only',
    mod.modrinthId || null, mod.latestVersion || null, mod.hasUpdate ? 1 : 0
  )
}

function deleteModCache(serverId, fileName) {
  db.prepare('DELETE FROM mods_cache WHERE serverId = ? AND fileName = ?').run(serverId, fileName)
}

function clearModsCache(serverId) {
  db.prepare('DELETE FROM mods_cache WHERE serverId = ?').run(serverId)
}

module.exports = {
  getConfig, setConfig,
  getServers, saveServer, deleteServer,
  getModsCache, upsertModCache, deleteModCache, clearModsCache,
}
```

- [ ] **步骤 2：在主进程中注册配置相关的 IPC handlers**

在 `electron/main.js` 中追加（紧跟在 `createWindow` 函数之后，`app.whenReady` 之前）：

```javascript
const store = require('./store')

// 配置
ipcMain.handle('config:get', () => store.getConfig())
ipcMain.handle('config:save', (_, config) => {
  Object.entries(config).forEach(([key, value]) => store.setConfig(key, value))
  return true
})

// 目录选择对话框
ipcMain.handle('dialog:selectDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  return result.canceled ? null : result.filePaths[0]
})

// 服务器管理
ipcMain.handle('server:list', () => store.getServers())
ipcMain.handle('server:save', (_, server) => store.saveServer(server))
ipcMain.handle('server:delete', (_, id) => store.deleteServer(id))
```

- [ ] **步骤 3：Commit**

```bash
git add electron/store.js electron/main.js
git commit -m "feat: add SQLite configuration store"
```

---

### 任务 4：文件系统管理模块

**文件：**
- 创建：`electron/file-manager.js`

- [ ] **步骤 1：编写 electron/file-manager.js**

```javascript
const fs = require('fs')
const fsp = require('fs/promises')
const path = require('path')
const crypto = require('crypto')

/**
 * 读取目录结构（递归），返回树形数据
 */
async function readDirectory(dirPath, excludedDirs = [], excludedFiles = []) {
  const result = []
  try {
    const entries = await fsp.readdir(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      if (excludedDirs.includes(entry.name) || excludedFiles.includes(entry.name)) continue
      const fullPath = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        result.push({
          name: entry.name,
          path: fullPath,
          type: 'directory',
          children: await readDirectory(fullPath, excludedDirs, excludedFiles),
        })
      } else {
        const stat = await fsp.stat(fullPath)
        result.push({
          name: entry.name,
          path: fullPath,
          type: 'file',
          size: stat.size,
          mtime: stat.mtimeMs,
          disabled: entry.name.endsWith('.disabled'),
        })
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dirPath}:`, err.message)
  }
  return result
}

/**
 * 获取文件信息
 */
async function getFileInfo(filePath) {
  try {
    const stat = await fsp.stat(filePath)
    return {
      name: path.basename(filePath),
      path: filePath,
      size: stat.size,
      mtime: stat.mtimeMs,
      disabled: filePath.endsWith('.disabled'),
    }
  } catch {
    return null
  }
}

/**
 * 删除文件
 */
async function deleteFile(filePath) {
  try {
    await fsp.unlink(filePath)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * 重命名文件（用于启用/禁用模组）
 */
async function renameFile(oldPath, newPath) {
  try {
    await fsp.rename(oldPath, newPath)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * 复制文件（带进度回调）
 */
async function copyFile(src, dest, onProgress) {
  const rs = fs.createReadStream(src)
  const ws = fs.createWriteStream(dest)
  const stat = await fsp.stat(src)
  let bytesRead = 0

  rs.on('data', (chunk) => {
    bytesRead += chunk.length
    if (onProgress) onProgress(bytesRead / stat.size)
  })

  return new Promise((resolve, reject) => {
    rs.on('error', (err) => reject({ success: false, error: err.message }))
    ws.on('error', (err) => reject({ success: false, error: err.message }))
    ws.on('finish', () => resolve({ success: true }))
    rs.pipe(ws)
  })
}

/**
 * 计算文件 SHA256 哈希
 */
async function computeHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const rs = fs.createReadStream(filePath)
    rs.on('data', (chunk) => hash.update(chunk))
    rs.on('end', () => resolve(hash.digest('hex')))
    rs.on('error', (err) => reject(null))
  })
}

/**
 * 检查文件是否存在
 */
async function fileExists(filePath) {
  try {
    await fsp.access(filePath)
    return true
  } catch {
    return false
  }
}

module.exports = {
  readDirectory, getFileInfo, deleteFile, renameFile, copyFile, computeHash, fileExists,
}
```

- [ ] **步骤 2：在主进程中注册文件系统 IPC handlers**

在 `electron/main.js` 中添加：

```javascript
const fileManager = require('./file-manager')

// 文件系统 IPC handlers
ipcMain.handle('fs:readDirectory', (_, dirPath, excludedDirs, excludedFiles) =>
  fileManager.readDirectory(dirPath, excludedDirs, excludedFiles))

ipcMain.handle('fs:getFileInfo', (_, filePath) =>
  fileManager.getFileInfo(filePath))

ipcMain.handle('fs:deleteFile', (_, filePath) =>
  fileManager.deleteFile(filePath))

ipcMain.handle('fs:renameFile', (_, oldPath, newPath) =>
  fileManager.renameFile(oldPath, newPath))

ipcMain.handle('fs:copyFile', async (_, src, dest) => {
  return fileManager.copyFile(src, dest)
})

ipcMain.handle('fs:computeHash', (_, filePath) =>
  fileManager.computeHash(filePath))

ipcMain.handle('fs:fileExists', (_, filePath) =>
  fileManager.fileExists(filePath))
```

- [ ] **步骤 3：Commit**

```bash
git add electron/file-manager.js electron/main.js
git commit -m "feat: add file system manager module"
```

---

### 任务 5：Modrinth API 客户端

**文件：**
- 创建：`electron/modrinth-api.js`

- [ ] **步骤 1：编写 electron/modrinth-api.js**

```javascript
const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')
const URL = require('url').URL

const MODRINTH_API = 'https://api.modrinth.com/v2'
const USER_AGENT = 'Minecraft-Server-Mod-Manager/1.0'

// 请求队列管理（应对 rate limit）
class RequestQueue {
  constructor(maxConcurrent = 3, retryDelay = 1000) {
    this.queue = []
    this.running = 0
    this.maxConcurrent = maxConcurrent
    this.retryDelay = retryDelay
  }

  async add(fn) {
    if (this.running >= this.maxConcurrent) {
      await new Promise(resolve => this.queue.push(resolve))
    }
    this.running++
    try {
      return await fn()
    } catch (err) {
      if (err.message?.includes('429')) {
        // Rate limited — 指数退避
        await new Promise(r => setTimeout(r, this.retryDelay))
        this.retryDelay *= 2
        return this.add(fn)
      }
      throw err
    } finally {
      this.running--
      this.queue.shift()?.()
    }
  }
}

const requestQueue = new RequestQueue()

/**
 * 发起 HTTPS 请求
 */
function apiRequest(urlPath) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${MODRINTH_API}${urlPath}`)
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: { 'User-Agent': USER_AGENT },
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode === 429) {
          reject(new Error('429 Rate Limited'))
        } else if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)) }
          catch { resolve(data) }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`))
        }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

/**
 * 搜索模组
 * @param {string} query - 搜索关键词
 * @param {number} limit - 返回数量 (默认 20)
 */
async function searchMods(query, limit = 20) {
  return requestQueue.add(() =>
    apiRequest(`/search?query=${encodeURIComponent(query)}&limit=${limit}&facets=${encodeURIComponent('["project_type:mod"]')}`)
  )
}

/**
 * 获取模组信息
 */
async function getModInfo(modId) {
  return requestQueue.add(() => apiRequest(`/project/${modId}`))
}

/**
 * 获取模组的所有版本
 */
async function getModVersions(modId, gameVersions = [], loaders = []) {
  let url = `/project/${modId}/version`
  const params = []
  if (gameVersions.length) params.push(`game_versions=${encodeURIComponent(JSON.stringify(gameVersions))}`)
  if (loaders.length) params.push(`loaders=${encodeURIComponent(JSON.stringify(loaders))}`)
  if (params.length) url += '?' + params.join('&')
  return requestQueue.add(() => apiRequest(url))
}

/**
 * 下载模组文件
 * @param {string} url - 下载 URL
 * @param {string} destPath - 保存路径
 */
async function downloadMod(url, destPath) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const file = fs.createWriteStream(destPath)
    const protocol = parsedUrl.protocol === 'https:' ? https : http

    const req = protocol.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // 处理重定向
        downloadMod(res.headers.location, destPath).then(resolve).catch(reject)
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Download failed: HTTP ${res.statusCode}`))
        return
      }
      res.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve({ success: true, path: destPath })
      })
    })
    req.on('error', (err) => {
      fs.unlink(destPath, () => {})
      reject(err)
    })
  })
}

/**
 * 通过文件名尝试识别 Modrinth ID（缓存查询）
 * 用于版本检测时匹配本地模组
 */
async function identifyMod(fileName) {
  // 从文件名提取模组名称（去掉版本号部分）
  const baseName = path.basename(fileName, '.jar').replace(/\.disabled$/, '')
  const modName = baseName.replace(/-\d+[\w.]*$/, '').replace(/-\d+$/, '')
  const result = await requestQueue.add(() => searchMods(modName, 1))
  if (result.hits && result.hits.length > 0) {
    const hit = result.hits[0]
    return {
      modrinthId: hit.project_id,
      displayName: hit.title,
      description: hit.description,
      latestVersion: hit.latest_version,
    }
  }
  return null
}

module.exports = {
  searchMods, getModInfo, getModVersions, downloadMod, identifyMod,
}
```

- [ ] **步骤 2：在主进程中注册 Modrinth IPC handlers**

在 `electron/main.js` 中添加：

```javascript
const modrinth = require('./modrinth-api')

ipcMain.handle('modrinth:search', (_, query, limit) => modrinth.searchMods(query, limit))
ipcMain.handle('modrinth:modInfo', (_, modId) => modrinth.getModInfo(modId))
ipcMain.handle('modrinth:versions', (_, modId) => modrinth.getModVersions(modId))
ipcMain.handle('modrinth:download', async (_, url, destPath) => {
  return modrinth.downloadMod(url, destPath)
})
ipcMain.handle('modrinth:identify', (_, fileName) => modrinth.identifyMod(fileName))
```

- [ ] **步骤 3：Commit**

```bash
git add electron/modrinth-api.js electron/main.js
git commit -m "feat: add Modrinth API client with rate limiting"
```

---

### 任务 6：同步引擎

**文件：**
- 创建：`electron/sync-engine.js`

- [ ] **步骤 1：编写 electron/sync-engine.js**

```javascript
const fileManager = require('./file-manager')
const path = require('path')
const fs = require('fs')

/**
 * 比较两个目录的差异
 * @param {string} templatePath - 公共模板路径
 * @param {string} serverPath - 服务器路径
 * @param {object} overrides - 覆盖关系 { overriddenFiles: [], serverOnlyFiles: [] }
 * @returns {object} { added: [], modified: [], deleted: [], conflicted: [], serverOnly: [] }
 */
async function diffDirectories(templatePath, serverPath, overrides = { overriddenFiles: [], serverOnlyFiles: [] }) {
  const result = { added: [], modified: [], deleted: [], conflicted: [], serverOnly: [] }
  const overriddenSet = new Set(overrides.overriddenFiles || [])
  const serverOnlySet = new Set(overrides.serverOnlyFiles || [])

  // 读取模板目录结构（平坦化）
  const templateFiles = await flattenDirectory(templatePath)
  // 读取服务器目录结构（平坦化）
  const serverFiles = await flattenDirectory(serverPath)

  const templateMap = new Map(templateFiles.map(f => [f.relativePath, f]))
  const serverMap = new Map(serverFiles.map(f => [f.relativePath, f]))

  // 检查模板中有但服务器中没有的 → added
  for (const [relPath, tFile] of templateMap) {
    if (serverOnlySet.has(relPath)) continue
    if (!serverMap.has(relPath)) {
      result.added.push({ relativePath: relPath, templateFile: tFile })
    }
  }

  // 检查模板和服务器都有的文件 → 比对哈希
  for (const [relPath, tFile] of templateMap) {
    if (overriddenSet.has(relPath)) continue
    if (serverOnlySet.has(relPath)) continue
    const sFile = serverMap.get(relPath)
    if (sFile) {
      const tHash = await fileManager.computeHash(tFile.fullPath)
      const sHash = await fileManager.computeHash(sFile.fullPath)
      if (tHash !== sHash) {
        // 模板和服务器内容不一致
        // 检查是否模板被修改（需要记录上次同步的哈希）
        result.modified.push({
          relativePath: relPath,
          templateFile: tFile,
          serverFile: sFile,
        })
      }
    }
  }

  // 检查服务器中有但模板中没有的 → serverOnly
  for (const [relPath, sFile] of serverMap) {
    if (!templateMap.has(relPath)) {
      result.serverOnly.push({ relativePath: relPath, serverFile: sFile })
    }
  }

  return result
}

/**
 * 将目录结构展开为平坦文件列表（相对路径）
 */
async function flattenDirectory(dirPath, basePath = dirPath) {
  const result = []
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      const relativePath = path.relative(basePath, fullPath)
      if (entry.isDirectory()) {
        const children = await flattenDirectory(fullPath, basePath)
        result.push(...children)
      } else {
        result.push({ fullPath, relativePath, name: entry.name })
      }
    }
  } catch { /* 目录不存在则跳过 */ }
  return result
}

/**
 * 同步单个文件（从模板到服务器）
 */
async function syncFile(src, dest) {
  // 确保目标目录存在
  const destDir = path.dirname(dest)
  await fs.promises.mkdir(destDir, { recursive: true })
  return fileManager.copyFile(src, dest)
}

/**
 * 收集服务器文件到模板（反向同步）
 */
async function collectToTemplate(serverPath, templatePath, relativePath) {
  const src = path.join(serverPath, relativePath)
  const dest = path.join(templatePath, relativePath)
  const destDir = path.dirname(dest)
  await fs.promises.mkdir(destDir, { recursive: true })
  return fileManager.copyFile(src, dest)
}

module.exports = {
  diffDirectories, flattenDirectory, syncFile, collectToTemplate,
}
```

- [ ] **步骤 2：在主进程中注册同步引擎 IPC handlers**

在 `electron/main.js` 中添加：

```javascript
const syncEngine = require('./sync-engine')

ipcMain.handle('sync:diff', (_, templatePath, serverPath, overrides) =>
  syncEngine.diffDirectories(templatePath, serverPath, overrides))

ipcMain.handle('sync:file', (_, src, dest) =>
  syncEngine.syncFile(src, dest))

ipcMain.handle('sync:collectToTemplate', (_, serverPath, templatePath, relativePath) =>
  syncEngine.collectToTemplate(serverPath, templatePath, relativePath))
```

- [ ] **步骤 3：Commit**

```bash
git add electron/sync-engine.js electron/main.js
git commit -m "feat: add sync engine with directory diff"
```

---

### 任务 7：Vue 应用入口和路由

**文件：**
- 创建：`src/main.js`
- 创建：`src/App.vue`
- 创建：`src/router/index.js`
- 创建：`src/stores/app.js`

- [ ] **步骤 1：编写 src/main.js**

```javascript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(ElementPlus, { locale: zhCn })
app.use(router)
app.mount('#app')
```

- [ ] **步骤 2：编写 src/App.vue**

```vue
<template>
  <el-container style="height: 100vh">
    <el-aside width="220px" class="app-sidebar">
      <div class="sidebar-header">
        <h2>📦 模组管理器</h2>
      </div>
      <el-menu
        :default-active="currentRoute"
        router
        class="sidebar-menu"
      >
        <el-menu-item index="/template">
          <el-icon><Folder /></el-icon>
          <span>公共模板</span>
        </el-menu-item>
        <el-sub-menu index="servers" v-if="servers.length > 0">
          <template #title>
            <el-icon><Server /></el-icon>
            <span>服务器</span>
          </template>
          <el-menu-item
            v-for="server in servers"
            :key="server.id"
            :index="`/server/${server.id}`"
          >
            <span>{{ server.name }}</span>
          </el-menu-item>
        </el-sub-menu>
        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <span>设置</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-main class="app-main">
        <router-view />
      </el-main>
      <el-footer height="30px" class="app-footer">
        <span v-if="currentServerId">当前服务器模组: {{ modCount }} 个</span>
        <span v-if="updateCount > 0"> | 可更新: {{ updateCount }} 个</span>
        <span> | 同步状态: {{ syncStatus }}</span>
      </el-footer>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { Folder, Server, Setting } from '@element-plus/icons-vue'

const route = useRoute()
const store = useAppStore()

const currentRoute = computed(() => route.path)
const servers = computed(() => store.servers)
const currentServerId = computed(() => store.currentServerId)
const modCount = computed(() => store.modCount)
const updateCount = computed(() => store.updateCount)
const syncStatus = computed(() => store.syncStatus)

store.loadConfig()
</script>

<style>
body { margin: 0; }
.app-sidebar { background: #f5f7fa; border-right: 1px solid #e4e7ed; }
.sidebar-header { padding: 16px; text-align: center; border-bottom: 1px solid #e4e7ed; }
.sidebar-header h2 { margin: 0; font-size: 16px; }
.sidebar-menu { border-right: none; }
.app-main { background: #fff; padding: 20px; }
.app-footer { display: flex; align-items: center; font-size: 12px; color: #909399; border-top: 1px solid #e4e7ed; }
</style>
```

- [ ] **步骤 3：编写 src/router/index.js**

```javascript
import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/template' },
  {
    path: '/template',
    name: 'Template',
    component: () => import('@/views/TemplateView.vue'),
  },
  {
    path: '/server/:id',
    name: 'Server',
    component: () => import('@/views/ServerView.vue'),
    props: true,
  },
  {
    path: '/server/:id/mods',
    name: 'ServerMods',
    component: () => import('@/views/ModManager.vue'),
    props: true,
  },
  {
    path: '/sync',
    name: 'Sync',
    component: () => import('@/views/SyncPanel.vue'),
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/SettingsView.vue'),
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
```

- [ ] **步骤 4：编写 src/stores/app.js**

```javascript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAppStore = defineStore('app', () => {
  const config = ref({})
  const servers = ref([])
  const currentServerId = ref(null)
  const modCount = ref(0)
  const updateCount = ref(0)
  const syncStatus = ref('未配置')

  async function loadConfig() {
    if (window.electronAPI) {
      const cfg = await window.electronAPI.getConfig()
      config.value = cfg || {}
      await loadServers()
    }
  }

  async function loadServers() {
    if (window.electronAPI) {
      const allServers = []
      // 从 store 读取服务器列表
      // 临时通过 config 读取 — 实际需通过 IPC
      servers.value = allServers
    }
  }

  function setCurrentServer(id) {
    currentServerId.value = id
  }

  return {
    config, servers, currentServerId, modCount, updateCount, syncStatus,
    loadConfig, loadServers, setCurrentServer,
  }
})
```

- [ ] **步骤 5：Commit**

```bash
git add src/
git commit -m "feat: add Vue app entry, router and store"
```

---

### 任务 8：设置页面

**文件：**
- 创建：`src/views/SettingsView.vue`

- [ ] **步骤 1：编写 src/views/SettingsView.vue**

```vue
<template>
  <div class="settings-page">
    <h3>设置</h3>
    <el-form label-width="140px">
      <el-form-item label="公共模板路径">
        <el-input v-model="templatePath" placeholder="选择公共模板目录" readonly>
          <template #append>
            <el-button @click="selectTemplatePath">选择</el-button>
          </template>
        </el-input>
      </el-form-item>
      <el-divider>服务器管理</el-divider>
      <div v-for="(server, index) in serverList" :key="server.id" class="server-item">
        <el-input v-model="server.name" placeholder="显示名称" style="width:150px; margin-right:8px" />
        <el-input v-model="server.path" placeholder="服务器路径" readonly style="flex:1; margin-right:8px">
          <template #append>
            <el-button @click="selectServerPath(index)">选择</el-button>
          </template>
        </el-input>
        <el-button type="danger" :icon="Delete" @click="removeServer(index)" circle />
      </div>
      <el-form-item>
        <el-button type="primary" @click="addServer">+ 添加服务器</el-button>
      </el-form-item>
      <el-divider />
      <el-form-item>
        <el-button type="success" @click="saveSettings">保存设置</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import { v4 as uuidv4 } from 'uuid'

const templatePath = ref('')
const serverList = ref([])

async function selectTemplatePath() {
  const dir = await window.electronAPI.selectDirectory()
  if (dir) templatePath.value = dir
}

async function selectServerPath(index) {
  const dir = await window.electronAPI.selectDirectory()
  if (dir) serverList.value[index].path = dir
}

function addServer() {
  serverList.value.push({
    id: uuidv4(),
    name: `服务器 ${serverList.value.length + 1}`,
    path: '',
    excludedDirs: ['logs', 'crash-reports'],
    excludedFiles: [],
  })
}

function removeServer(index) {
  serverList.value.splice(index, 1)
}

async function saveSettings() {
  // 保存模板路径
  await window.electronAPI.saveConfig({ templatePath: templatePath.value })
  // 保存服务器列表
  for (const server of serverList.value) {
    await window.electronAPI.saveServer(server)
  }
  ElMessage.success('设置已保存')
}

onMounted(async () => {
  // 加载已有配置
  if (window.electronAPI) {
    const cfg = await window.electronAPI.getConfig()
    if (cfg.templatePath) templatePath.value = cfg.templatePath
  }
})
</script>

<style scoped>
.settings-page { max-width: 800px; }
.server-item { display: flex; align-items: center; margin-bottom: 12px; }
</style>
```

- [ ] **步骤 2：Commit**

```bash
git add src/views/SettingsView.vue
git commit -m "feat: add settings page"
```

---

### 任务 9：文件浏览器组件和公共模板视图

**文件：**
- 创建：`src/components/FileBrowser.vue`
- 创建：`src/views/TemplateView.vue`

- [ ] **步骤 1：编写 src/components/FileBrowser.vue**

```vue
<template>
  <div class="file-browser">
    <el-input v-model="searchQuery" placeholder="搜索文件..." clearable style="margin-bottom:12px" />
    <el-tree
      :data="filteredTreeData"
      :props="treeProps"
      node-key="path"
      default-expand-all
      :highlight-current="true"
      @node-click="onNodeClick"
    >
      <template #default="{ node, data }">
        <span class="file-item">
          <span v-if="data.type === 'directory'">📁</span>
          <span v-else-if="data.disabled">🔒</span>
          <span v-else>📄</span>
          <span :class="{ 'file-disabled': data.disabled }">{{ data.name }}</span>
          <span v-if="data.type === 'file'" class="file-size">{{ formatSize(data.size) }}</span>
        </span>
      </template>
    </el-tree>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  fileData: { type: Array, default: () => [] },
})

const emit = defineEmits(['fileClick'])

const searchQuery = ref('')
const treeProps = { children: 'children', label: 'name' }

const filteredTreeData = computed(() => {
  if (!searchQuery.value) return props.fileData
  return filterTree(props.fileData, searchQuery.value.toLowerCase())
})

function filterTree(nodes, query) {
  return nodes
    .map(node => {
      if (node.type === 'file') {
        return node.name.toLowerCase().includes(query) ? node : null
      }
      const children = filterTree(node.children || [], query)
      return children.length > 0 ? { ...node, children } : null
    })
    .filter(Boolean)
}

function onNodeClick(data) {
  if (data.type === 'file') emit('fileClick', data)
}

function formatSize(bytes) {
  if (!bytes) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return `(${size.toFixed(1)} ${units[i]})`
}
</script>

<style scoped>
.file-item { display: flex; align-items: center; gap: 4px; font-size: 13px; }
.file-disabled { color: #999; text-decoration: line-through; }
.file-size { color: #999; font-size: 11px; margin-left: 8px; }
</style>
```

- [ ] **步骤 2：编写 src/views/TemplateView.vue**

```vue
<template>
  <div class="template-view">
    <div class="page-header">
      <h3>📁 公共模板</h3>
      <span class="path-hint">{{ templatePath || '未设置模板路径' }}</span>
    </div>
    <FileBrowser v-if="templatePath" :fileData="templateFiles" @fileClick="onFileClick" />
    <div v-else class="empty-state">
      <p>尚未设置公共模板目录</p>
      <el-button type="primary" @click="goSettings">前往设置</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import FileBrowser from '@/components/FileBrowser.vue'

const router = useRouter()
const templatePath = ref('')
const templateFiles = ref([])

function goSettings() { router.push('/settings') }
function onFileClick(file) { /* 预留：文件操作 */ }

onMounted(async () => {
  if (window.electronAPI) {
    const cfg = await window.electronAPI.getConfig()
    if (cfg.templatePath) {
      templatePath.value = cfg.templatePath
      templateFiles.value = await window.electronAPI.readDirectory(cfg.templatePath, cfg.templateExcludedDirs || [])
    }
  }
})
</script>

<style scoped>
.template-view { height: 100%; }
.page-header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.page-header h3 { margin: 0; }
.path-hint { color: #909399; font-size: 12px; }
.empty-state { text-align: center; padding: 80px 0; color: #909399; }
</style>
```

- [ ] **步骤 3：Commit**

```bash
git add src/components/FileBrowser.vue src/views/TemplateView.vue
git commit -m "feat: add file browser component and template view"
```

---

### 任务 10：服务器详情视图

**文件：**
- 创建：`src/views/ServerView.vue`
- 创建：`src/components/ServerCard.vue`

- [ ] **步骤 1：编写 src/components/ServerCard.vue**

```vue
<template>
  <div class="server-card" @click="$emit('select', server.id)">
    <div class="card-header">
      <el-input
        v-if="editing"
        v-model="editName"
        ref="nameInput"
        size="small"
        @blur="saveName"
        @keyup.enter="saveName"
        @click.stop
      />
      <span v-else class="server-name">{{ server.name }}</span>
      <el-button
        :icon="Edit"
        size="small"
        circle
        @click.stop="startEditing"
      />
    </div>
    <div class="card-info">
      <span class="path">{{ server.path }}</span>
    </div>
    <div class="card-actions">
      <el-button size="small" @click.stop="$emit('enter', server.id)">管理模组</el-button>
      <el-button size="small" @click.stop="$emit('sync', server.id)">同步</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Edit } from '@element-plus/icons-vue'

const props = defineProps({
  server: { type: Object, required: true },
})
const emit = defineEmits(['select', 'enter', 'sync', 'update:name'])

const editing = ref(false)
const editName = ref('')

function startEditing() { editing.value = true; editName.value = props.server.name }
function saveName() {
  if (editName.value.trim()) {
    emit('update:name', props.server.id, editName.value)
  }
  editing.value = false
}
</script>

<style scoped>
.server-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: box-shadow 0.2s;
}
.server-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
.card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.server-name { font-weight: bold; font-size: 16px; }
.card-info .path { font-size: 12px; color: #909399; }
.card-actions { margin-top: 12px; display: flex; gap: 8px; }
</style>
```

- [ ] **步骤 2：编写 src/views/ServerView.vue**

```vue
<template>
  <div class="server-view">
    <div class="page-header">
      <h3>{{ currentServer?.name || '服务器' }}</h3>
      <span class="path-hint">{{ currentServer?.path }}</span>
    </div>
    <el-row :gutter="16" style="margin-bottom:16px">
      <el-col :span="6">
        <el-statistic title="模组总数" :value="modCount" />
      </el-col>
      <el-col :span="6">
        <el-statistic title="已启用" :value="enabledCount" />
      </el-col>
      <el-col :span="6">
        <el-statistic title="已禁用" :value="disabledCount" />
      </el-col>
      <el-col :span="6">
        <el-statistic title="可更新" :value="updateCount" />
      </el-col>
    </el-row>
    <el-button type="primary" @click="goToMods">管理模组</el-button>
    <el-button @click="goToSync">同步到模板</el-button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const router = useRouter()
const store = useAppStore()
const serverId = computed(() => route.params.id)
const currentServer = computed(() => store.servers.find(s => s.id === serverId.value))
const modCount = ref(0)
const enabledCount = ref(0)
const disabledCount = ref(0)
const updateCount = ref(0)

function goToMods() { router.push(`/server/${serverId.value}/mods`) }
function goToSync() { router.push('/sync') }

onMounted(() => {
  store.setCurrentServer(serverId.value)
})
</script>

<style scoped>
.page-header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.page-header h3 { margin: 0; }
.path-hint { color: #909399; font-size: 12px; }
</style>
```

- [ ] **步骤 3：Commit**

```bash
git add src/views/ServerView.vue src/components/ServerCard.vue
git commit -m "feat: add server view with statistics"
```

---

### 任务 11：模组管理页面

**文件：**
- 创建：`src/views/ModManager.vue`
- 创建：`src/components/ModList.vue`

- [ ] **步骤 1：编写 src/components/ModList.vue**

```vue
<template>
  <div class="mod-list">
    <div class="toolbar">
      <el-input v-model="search" placeholder="搜索模组..." clearable style="width:240px" />
      <el-select v-model="statusFilter" placeholder="状态" clearable style="width:120px">
        <el-option label="全部" value="" />
        <el-option label="已启用" value="enabled" />
        <el-option label="已禁用" value="disabled" />
        <el-option label="可更新" value="hasUpdate" />
      </el-select>
      <el-select v-model="sourceFilter" placeholder="来源" clearable style="width:120px">
        <el-option label="全部" value="" />
        <el-option label="模板" value="template" />
        <el-option label="专属" value="server-only" />
      </el-select>
      <el-button type="primary" :icon="Plus" @click="$emit('install')">从 Modrinth 安装</el-button>
    </div>
    <el-table :data="filteredMods" style="width:100%" @selection-change="onSelectionChange">
      <el-table-column type="selection" width="40" />
      <el-table-column prop="fileName" label="文件名" min-width="200" />
      <el-table-column prop="displayName" label="模组名称" width="160" />
      <el-table-column prop="version" label="版本" width="120" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag v-if="row.hasUpdate" type="warning" size="small">可更新</el-tag>
          <el-tag v-else-if="!row.enabled" type="info" size="small">已禁用</el-tag>
          <el-tag v-else type="success" size="small">已启用</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="source" label="来源" width="80" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="$emit('toggle', row)">
            {{ row.enabled ? '禁用' : '启用' }}
          </el-button>
          <el-button size="small" type="warning" @click="$emit('update', row)" :disabled="!row.modrinthId">
            更新
          </el-button>
          <el-button size="small" type="danger" @click="$emit('delete', row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Plus } from '@element-plus/icons-vue'

const props = defineProps({
  mods: { type: Array, default: () => [] },
})
const emit = defineEmits(['install', 'toggle', 'update', 'delete', 'selectionChange'])

const search = ref('')
const statusFilter = ref('')
const sourceFilter = ref('')

const filteredMods = computed(() => {
  return props.mods.filter(mod => {
    if (search.value && !mod.fileName.toLowerCase().includes(search.value.toLowerCase())) return false
    if (statusFilter.value === 'enabled' && !mod.enabled) return false
    if (statusFilter.value === 'disabled' && mod.enabled) return false
    if (statusFilter.value === 'hasUpdate' && !mod.hasUpdate) return false
    if (sourceFilter.value && mod.source !== sourceFilter.value) return false
    return true
  })
})

function onSelectionChange(selection) {
  emit('selectionChange', selection)
}
</script>

<style scoped>
.toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
</style>
```

- [ ] **步骤 2：编写 src/views/ModManager.vue**

```vue
<template>
  <div class="mod-manager">
    <div class="page-header">
      <h3>{{ serverName }} — 模组管理</h3>
      <el-button @click="scanMods">重新扫描</el-button>
      <el-button :loading="checkingUpdates" @click="checkAllUpdates">检查更新</el-button>
    </div>
    <ModList
      :mods="mods"
      @install="showInstallDialog"
      @toggle="toggleMod"
      @update="updateMod"
      @delete="deleteMod"
    />

    <!-- Modrinth 安装对话框 -->
    <el-dialog v-model="installVisible" title="从 Modrinth 安装模组" width="600px">
      <el-input v-model="searchQuery" placeholder="搜索模组..." @keyup.enter="searchModrinth">
        <template #append>
          <el-button @click="searchModrinth">搜索</el-button>
        </template>
      </el-input>
      <div v-if="searchResults.length > 0" style="margin-top:16px">
        <el-card
          v-for="hit in searchResults"
          :key="hit.project_id"
          style="margin-bottom:8px; cursor:pointer"
          @click="selectModVersion(hit)"
        >
          <div style="display:flex; justify-content:space-between; align-items:center">
            <div>
              <strong>{{ hit.title }}</strong>
              <p style="margin:4px 0 0; font-size:12px; color:#909399">{{ hit.description }}</p>
            </div>
            <el-tag>{{ hit.latest_version }}</el-tag>
          </div>
        </el-card>
      </div>
      <template #footer>
        <el-button @click="installVisible = false">取消</el-button>
      </template>
    </el-dialog>

    <!-- 版本选择对话框 -->
    <el-dialog v-model="versionVisible" title="选择版本" width="500px">
      <el-radio-group v-model="selectedVersion" direction="vertical">
        <el-radio
          v-for="v in availableVersions"
          :key="v.id"
          :value="v.id"
          style="margin-bottom:8px"
        >
          {{ v.version_number }} ({{ v.game_versions?.join(', ') }})
        </el-radio>
      </el-radio-group>
      <template #footer>
        <el-button @click="versionVisible = false">取消</el-button>
        <el-button type="primary" :loading="downloading" @click="confirmInstall">确认安装</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import ModList from '@/components/ModList.vue'

const route = useRoute()
const serverId = computed(() => route.params.id)
const serverName = ref('')
const serverPath = ref('')
const mods = ref([])
const checkingUpdates = ref(false)

// 安装对话框
const installVisible = ref(false)
const searchQuery = ref('')
const searchResults = ref([])
const versionVisible = ref(false)
const availableVersions = ref([])
const selectedVersion = ref('')
const selectedModInfo = ref(null)
const downloading = ref(false)

async function scanMods() {
  if (!window.electronAPI) return
  const modsDir = `${serverPath.value}/mods`
  const files = await window.electronAPI.readDirectory(modsDir)
  const modList = []
  for (const file of files) {
    if (file.type === 'file' && (file.name.endsWith('.jar') || file.name.endsWith('.jar.disabled'))) {
      const isDisabled = file.name.endsWith('.disabled')
      const cleanName = isDisabled ? file.name.replace('.disabled', '') : file.name
      modList.push({
        fileName: file.name,
        displayName: cleanName.replace(/-\d+[\w.]*\.jar$/, ''),
        version: (cleanName.match(/[\d.]+(?=\.jar$)/) || [''])[0],
        enabled: !isDisabled,
        source: 'server-only',
        modrinthId: null,
        hasUpdate: false,
        path: file.path,
      })
    }
  }
  mods.value = modList
}

async function toggleMod(mod) {
  const oldPath = mod.path
  const newPath = mod.enabled
    ? oldPath.replace('.jar', '.jar.disabled')
    : oldPath.replace('.jar.disabled', '.jar')
  const result = await window.electronAPI.renameFile(oldPath, newPath)
  if (result.success) {
    mod.enabled = !mod.enabled
    mod.path = newPath
    mod.fileName = mod.enabled ? mod.fileName.replace('.disabled', '') : mod.fileName + '.disabled'
    ElMessage.success(mod.enabled ? '已启用' : '已禁用')
  } else {
    ElMessage.error('操作失败: ' + result.error)
  }
}

async function deleteMod(mod) {
  try {
    await ElMessageBox.confirm(`确定删除 ${mod.fileName}？`, '确认删除')
    const result = await window.electronAPI.deleteFile(mod.path)
    if (result.success) {
      mods.value = mods.value.filter(m => m.path !== mod.path)
      ElMessage.success('已删除')
    } else {
      ElMessage.error('删除失败: ' + result.error)
    }
  } catch { /* 用户取消 */ }
}

async function updateMod(mod) {
  if (!mod.modrinthId) {
    ElMessage.warning('该模组并非来自 Modrinth，无法自动更新')
    return
  }
  try {
    const versions = await window.electronAPI.getModVersions(mod.modrinthId)
    if (versions && versions.length > 0) {
      const latest = versions[0]
      // 下载最新版本
      const primaryFile = latest.files?.find(f => f.primary) || latest.files?.[0]
      if (primaryFile) {
        await window.electronAPI.downloadMod(primaryFile.url, mod.path)
        ElMessage.success('更新完成')
        await scanMods()
      }
    }
  } catch (err) {
    ElMessage.error('更新失败: ' + err.message)
  }
}

async function showInstallDialog() {
  installVisible.value = true
  searchResults.value = []
  searchQuery.value = ''
}

async function searchModrinth() {
  if (!searchQuery.value) return
  const result = await window.electronAPI.searchMods(searchQuery.value)
  searchResults.value = result.hits || []
}

async function selectModVersion(hit) {
  selectedModInfo.value = hit
  const versions = await window.electronAPI.getModVersions(hit.project_id)
  availableVersions.value = versions || []
  versionVisible.value = true
}

async function confirmInstall() {
  if (!selectedVersion.value) { ElMessage.warning('请选择版本'); return }
  downloading.value = true
  try {
    const version = availableVersions.value.find(v => v.id === selectedVersion.value)
    const primaryFile = version.files?.find(f => f.primary) || version.files?.[0]
    if (primaryFile) {
      const destPath = `${serverPath.value}/mods/${primaryFile.filename}`
      await window.electronAPI.downloadMod(primaryFile.url, destPath)
      ElMessage.success('安装成功')
      installVisible.value = false
      versionVisible.value = false
      await scanMods()
    }
  } catch (err) {
    ElMessage.error('安装失败: ' + err.message)
  } finally {
    downloading.value = false
  }
}

async function checkAllUpdates() {
  checkingUpdates.value = true
  let updated = 0
  for (const mod of mods.value) {
    if (!mod.modrinthId) {
      // 尝试识别模组
      try {
        const info = await window.electronAPI.identifyMod(mod.fileName)
        if (info) {
          mod.modrinthId = info.modrinthId
          mod.displayName = info.displayName
          mod.latestVersion = info.latestVersion
        }
      } catch { /* 跳过 */ }
    }
    if (mod.modrinthId) {
      try {
        const versions = await window.electronAPI.getModVersions(mod.modrinthId)
        if (versions && versions.length > 0) {
          const latest = versions[0].version_number
          if (latest !== mod.version) {
            mod.hasUpdate = true
            mod.latestVersion = latest
            updated++
          }
        }
      } catch { /* 跳过 */ }
    }
  }
  checkingUpdates.value = false
  ElMessage.success(`检查完成，${updated} 个模组可更新`)
}

onMounted(async () => {
  if (window.electronAPI) {
    const servers = await window.electronAPI.getServers()
    const server = servers.find(s => s.id === serverId.value)
    if (server) {
      serverName.value = server.name
      serverPath.value = server.path
      await scanMods()
    }
  }
})
</script>

<style scoped>
.page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.page-header h3 { margin: 0; }
</style>
```

- [ ] **步骤 2：Commit**

```bash
git add src/views/ModManager.vue src/components/ModList.vue
git commit -m "feat: add mod manager with Modrinth integration"
```

---

### 任务 12：同步面板

**文件：**
- 创建：`src/views/SyncPanel.vue`
- 创建：`src/components/SyncDiff.vue`

- [ ] **步骤 1：编写 src/components/SyncDiff.vue**

```vue
<template>
  <div class="sync-diff">
    <div v-if="diffs.length === 0" class="empty">✅ 所有服务器与模板保持一致</div>
    <div v-for="diff in diffs" :key="diff.relativePath" class="diff-item">
      <div class="diff-header">
        <el-tag :type="diffTagType(diff.type)" size="small">{{ diff.label }}</el-tag>
        <span class="diff-path">{{ diff.relativePath }}</span>
      </div>
      <div class="diff-actions">
        <el-button size="small" @click="handleAction(diff)">{{ diff.actionText }}</el-button>
        <el-button v-if="diff.type === 'conflicted'" size="small" @click="showConflictDetail(diff)">
          查看差异
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  diffs: { type: Array, default: () => [] },
})
const emit = defineEmits(['action', 'showConflict'])

function diffTagType(type) {
  return { added: 'success', modified: 'warning', deleted: 'danger', conflicted: 'danger', serverOnly: 'info' }[type] || 'info'
}

function handleAction(diff) {
  emit('action', diff)
}

function showConflictDetail(diff) {
  emit('showConflict', diff)
}
</script>

<style scoped>
.diff-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; border-bottom: 1px solid #f0f0f0;
}
.diff-header { display: flex; align-items: center; gap: 8px; }
.diff-path { font-family: monospace; font-size: 13px; }
.empty { text-align: center; padding: 40px; color: #67c23a; font-size: 16px; }
</style>
```

- [ ] **步骤 2：编写 src/views/SyncPanel.vue**

```vue
<template>
  <div class="sync-panel">
    <div class="page-header">
      <h3>🔄 同步管理</h3>
      <el-button type="primary" @click="scanDiffs" :loading="scanning">扫描差异</el-button>
      <el-button type="success" @click="syncAll" :disabled="diffs.length === 0" :loading="syncing">
        同步全部
      </el-button>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane v-for="server in servers" :key="server.id" :label="server.name" :name="server.id">
        <SyncDiff
          :diffs="serverDiffs[server.id] || []"
          @action="handleAction(server, $event)"
          @showConflict="showConflict"
        />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import SyncDiff from '@/components/SyncDiff.vue'

const servers = ref([])
const templatePath = ref('')
const serverDiffs = reactive({})
const scanning = ref(false)
const syncing = ref(false)
const activeTab = ref('')

async function scanDiffs() {
  scanning.value = true
  for (const server of servers.value) {
    try {
      const result = await window.electronAPI.diffDirectories(templatePath.value, server.path, {
        overriddenFiles: [],
        serverOnlyFiles: [],
      })
      serverDiffs[server.id] = [
        ...result.added.map(f => ({ ...f, type: 'added', label: '新增', actionText: '推送到服务器' })),
        ...result.modified.map(f => ({ ...f, type: 'modified', label: '已修改', actionText: '推送到服务器' })),
        ...result.serverOnly.map(f => ({ ...f, type: 'serverOnly', label: '服务器独有', actionText: '收集到模板' })),
      ]
    } catch (err) {
      serverDiffs[server.id] = []
      ElMessage.error(`扫描 ${server.name} 失败: ${err.message}`)
    }
  }
  scanning.value = false
}

async function handleAction(server, diff) {
  if (diff.type === 'serverOnly') {
    // 收集到模板
    const result = await window.electronAPI.syncCollectToTemplate(server.path, templatePath.value, diff.relativePath)
    if (result.success) ElMessage.success(`已收集 ${diff.relativePath}`)
    else ElMessage.error(`收集失败: ${result.error}`)
  } else {
    // 推送到服务器
    const dest = `${server.path}/${diff.relativePath}`
    const result = await window.electronAPI.syncFile(diff.templateFile.fullPath, dest)
    if (result.success) ElMessage.success(`已同步 ${diff.relativePath}`)
    else ElMessage.error(`同步失败: ${result.error}`)
  }
}

async function syncAll() {
  syncing.value = true
  let successCount = 0
  let failCount = 0
  for (const server of servers.value) {
    const diffs = serverDiffs[server.id] || []
    for (const diff of diffs) {
      try {
        if (diff.type === 'serverOnly') {
          const result = await window.electronAPI.syncCollectToTemplate(server.path, templatePath.value, diff.relativePath)
          if (result.success) successCount++
          else failCount++
        } else {
          const dest = `${server.path}/${diff.relativePath}`
          const result = await window.electronAPI.syncFile(diff.templateFile.fullPath, dest)
          if (result.success) successCount++
          else failCount++
        }
      } catch {
        failCount++
      }
    }
  }
  syncing.value = false
  ElMessage.success(`同步完成: 成功 ${successCount} 个，失败 ${failCount} 个`)
  await scanDiffs()
}

async function showConflict(diff) {
  if (diff.type === 'modified') {
    try {
      await ElMessageBox.confirm(
        `文件 "${diff.relativePath}" 在模板和服务器端均有修改。\n\n` +
        `模板文件哈希: ${diff.templateHash || 'N/A'}\n` +
        `服务器文件哈希: ${diff.serverHash || 'N/A'}\n\n` +
        `选择"覆盖"将用模板版本覆盖服务器版本；选择"保留"将不做任何更改。`,
        '文件冲突',
        {
          confirmButtonText: '覆盖',
          cancelButtonText: '保留',
          type: 'warning',
        }
      )
      // 用户选择覆盖
      const server = servers.value.find(s => s.id === activeTab.value)
      if (server) await handleAction(server, { ...diff, type: 'modified' })
    } catch {
      // 用户选择保留，不做任何操作
    }
  } else {
    ElMessage.info('该文件无冲突')
  }
}

onMounted(async () => {
  try {
    const config = await window.electronAPI.getConfig()
    templatePath.value = config.templatePath || ''
    servers.value = (await window.electronAPI.getServers()) || []
    if (servers.value.length > 0) activeTab.value = servers.value[0].id
    if (templatePath.value) await scanDiffs()
  } catch (err) {
    ElMessage.error('加载同步面板失败: ' + err.message)
  }
})
</script>

<style scoped>
.sync-panel {
  padding: 20px;
}
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.page-header h3 {
  margin: 0;
  flex: 1;
}
</style>
```