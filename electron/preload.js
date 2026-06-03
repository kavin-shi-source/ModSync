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
