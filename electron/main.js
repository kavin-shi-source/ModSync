const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const store = require('./store')
const fileManager = require('./file-manager')

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'Minecraft 多服务器模组管理器',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  })

  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

// 配置
ipcMain.handle('config:get', () => store.getConfig())
ipcMain.handle('config:save', async (_, config) => {
  for (const [key, value] of Object.entries(config)) {
    await store.setConfig(key, value)
  }
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

// 文件系统
ipcMain.handle('fs:readDirectory', (_, dirPath) => fileManager.readDirectory(dirPath))
ipcMain.handle('shell:openFolder', (_, filePath) => { shell.showItemInFolder(filePath); return true })
ipcMain.handle('fs:flattenDirectory', (_, dirPath) => syncEngine.flattenDirectory(dirPath))
ipcMain.handle('mods:checkUpdate', async (_, _mod) => {
  // 暂未实现 Modrinth API 检查，返回无更新
  return { hasUpdate: false }
})
ipcMain.handle('fs:getFileInfo', (_, filePath) => fileManager.getFileInfo(filePath))
ipcMain.handle('fs:deleteFile', (_, filePath) => fileManager.deleteFile(filePath))
ipcMain.handle('fs:renameFile', (_, oldPath, newPath) => fileManager.renameFile(oldPath, newPath))
ipcMain.handle('fs:copyFile', (_, src, dest) => fileManager.copyFile(src, dest))
ipcMain.handle('fs:computeHash', (_, filePath) => fileManager.computeHash(filePath))
ipcMain.handle('fs:fileExists', (_, filePath) => fileManager.fileExists(filePath))

const modrinth = require('./modrinth-api')

// Modrinth API
ipcMain.handle('modrinth:search', (_, query, limit) => modrinth.searchMods(query, limit))
ipcMain.handle('modrinth:versions', (_, modId, gameVersions, loaders) => modrinth.getModVersions(modId, gameVersions, loaders))
ipcMain.handle('modrinth:download', (_, url, destPath) => modrinth.downloadMod(url, destPath))
ipcMain.handle('modrinth:modInfo', (_, modId) => modrinth.getModInfo(modId))
ipcMain.handle('modrinth:identify', (_, fileName) => modrinth.identifyMod(fileName))

const syncEngine = require('./sync-engine')

// 同步引擎
ipcMain.handle('sync:diff', (_, templatePath, serverPath, overrides) => syncEngine.diffDirectories(templatePath, serverPath, overrides))
ipcMain.handle('sync:file', (_, src, dest) => syncEngine.syncFile(src, dest))
ipcMain.handle('sync:collectToTemplate', (_, serverPath, templatePath, relativePath) => syncEngine.collectToTemplate(serverPath, templatePath, relativePath))

// 同步忽略
ipcMain.handle('sync:getIgnores', (_, serverId) => store.getSyncIgnores(serverId))
ipcMain.handle('sync:addIgnore', (_, serverId, relativePath) => store.addSyncIgnore(serverId, relativePath))
ipcMain.handle('sync:removeIgnore', (_, serverId, relativePath) => store.removeSyncIgnore(serverId, relativePath))

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
