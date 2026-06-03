const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const store = require('./store')

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
