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

  flattenDirectory: (dirPath) => ipcRenderer.invoke('fs:flattenDirectory', dirPath),
  openFolder: (filePath) => ipcRenderer.invoke('shell:openFolder', filePath),
  getFileInfo: (filePath) => ipcRenderer.invoke('fs:getFileInfo', filePath),
  deleteFile: (filePath) => ipcRenderer.invoke('fs:deleteFile', filePath),
  renameFile: (oldPath, newPath) => ipcRenderer.invoke('fs:renameFile', oldPath, newPath),
  copyFile: (src, dest) => ipcRenderer.invoke('fs:copyFile', src, dest),
  computeHash: (filePath) => ipcRenderer.invoke('fs:computeHash', filePath),
  fileExists: (filePath) => ipcRenderer.invoke('fs:fileExists', filePath),
  readFile: (path) => ipcRenderer.invoke('fs:readFile', path),

  // 同步引擎
  diffDirectories: (templatePath, serverPath, overrides) => ipcRenderer.invoke('sync:diff', templatePath, serverPath, overrides),
  syncFile: (src, dest) => ipcRenderer.invoke('sync:file', src, dest),
  syncCollectToTemplate: (serverPath, templatePath, relativePath) => ipcRenderer.invoke('sync:collectToTemplate', serverPath, templatePath, relativePath),

  // 同步忽略
  getIgnores: (serverId) => ipcRenderer.invoke('sync:getIgnores', serverId),
  addIgnore: (serverId, relativePath) => ipcRenderer.invoke('sync:addIgnore', serverId, relativePath),
  removeIgnore: (serverId, relativePath) => ipcRenderer.invoke('sync:removeIgnore', serverId, relativePath),
})
