const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron')
const path = require('path')
const fs = require('fs')
const store = require('./store')
const fileManager = require('./file-manager')
let mainWindow = null

const ALLOWED_TEXT_EXTENSIONS = ['.json', '.yml', '.yaml', '.txt', '.properties', '.toml', '.cfg', '.xml', '.md', '.gitignore', '.ini', '.conf', '.js', '.ts', '.css', '.html']

app.commandLine.appendSwitch('disable-http-cache')
app.commandLine.appendSwitch('ignore-gpu-blocklist')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')

function createWindow() {
  Menu.setApplicationMenu(null)
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'Minecraft 多服务器模组管理器',
    show: false,
    backgroundColor: '#f5f5f5',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      // 启用 WebGL 加速和硬件渲染
      webgl: true,
      experimentalFeatures: false,
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
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

const syncEngine = require('./sync-engine')

// 文件系统
ipcMain.handle('fs:readDirectory', (_, dirPath) => fileManager.readDirectory(dirPath))
ipcMain.handle('shell:openFolder', (_, filePath) => { shell.showItemInFolder(filePath); return true })
ipcMain.handle('fs:flattenDirectory', (_, dirPath) => syncEngine.flattenDirectory(dirPath))
ipcMain.handle('fs:getFileInfo', (_, filePath) => fileManager.getFileInfo(filePath))
ipcMain.handle('fs:deleteFile', (_, filePath) => fileManager.deleteFile(filePath))
ipcMain.handle('fs:renameFile', (_, oldPath, newPath) => fileManager.renameFile(oldPath, newPath))
ipcMain.handle('fs:copyFile', (_, src, dest) => fileManager.copyFile(src, dest))
ipcMain.handle('fs:computeHash', (_, filePath) => fileManager.computeHash(filePath))
ipcMain.handle('fs:fileExists', (_, filePath) => fileManager.fileExists(filePath))
ipcMain.handle('fs:readFile', async (_, filePath) => {
  const config = store.getConfig()
  const servers = store.getServers()
  const allowedPaths = [config.templatePath, ...servers.map(s => s.path)].filter(Boolean)
  const resolvedPath = path.resolve(filePath)
  const isAllowed = allowedPaths.some(allowed => {
    const resolvedAllowed = path.resolve(allowed)
    const prefix = resolvedAllowed.endsWith(path.sep) ? resolvedAllowed : resolvedAllowed + path.sep
    return resolvedPath === resolvedAllowed || resolvedPath.startsWith(prefix)
  })
  if (!isAllowed) throw new Error('不允许读取指定路径的文件')

  const ext = path.extname(filePath).toLowerCase()
  if (!ALLOWED_TEXT_EXTENSIONS.includes(ext)) throw new Error(`不支持预览 ${ext} 类型的文件`)

  return fs.readFileSync(resolvedPath, 'utf-8')
})

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
