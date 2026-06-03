const initSqlJs = require('sql.js')
const path = require('path')
const fs = require('fs')
const { app } = require('electron')

const DB_PATH = path.join(app.getPath('userData'), 'mod-manager.db')

let db = null
let SQL = null
let initPromise = null

async function getDb() {
  if (db) return db
  if (!initPromise) {
    initPromise = (async () => {
      SQL = await initSqlJs()
      try {
        if (fs.existsSync(DB_PATH)) {
          const buffer = fs.readFileSync(DB_PATH)
          db = new SQL.Database(buffer)
        } else {
          db = new SQL.Database()
        }
      } catch {
        db = new SQL.Database()
      }
      initTables()
      return db
    })()
  }
  return initPromise
}

function saveDb() {
  if (!db) return
  const data = db.export()
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(DB_PATH, Buffer.from(data))
}

function initTables() {
  if (!db) return
  db.run(`CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT NOT NULL)`)
  db.run(`CREATE TABLE IF NOT EXISTS servers (id TEXT PRIMARY KEY, name TEXT NOT NULL, path TEXT NOT NULL, sort_order INTEGER DEFAULT 0)`)
  db.run(`CREATE TABLE IF NOT EXISTS sync_ignores (server_id TEXT NOT NULL, relative_path TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')), PRIMARY KEY (server_id, relative_path), FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE)`) 
  saveDb()
}

function queryAll(sql, params = []) {
  if (!db) return []
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params)
  const results = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

function queryOne(sql, params = []) {
  if (!db) return null
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params)
  let result = null
  if (stmt.step()) {
    result = stmt.getAsObject()
  }
  stmt.free()
  return result
}

function runSql(sql, params = []) {
  if (!db) return
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params)
  stmt.step()
  stmt.free()
}

// 配置读写
async function getConfig() {
  await getDb()
  const rows = queryAll('SELECT key, value FROM config')
  const config = {}
  rows.forEach(row => { config[row.key] = row.value })
  return config
}

async function setConfig(key, value) {
  await getDb()
  runSql('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [key, String(value)])
  saveDb()
}

// 服务器 CRUD
async function getServers() {
  await getDb()
  return queryAll('SELECT * FROM servers ORDER BY sort_order ASC')
}

async function saveServer(server) {
  await getDb()
  const existing = queryOne('SELECT id FROM servers WHERE id = ?', [server.id])
  if (existing) {
    runSql('UPDATE servers SET name = ?, path = ?, sort_order = ? WHERE id = ?',
      [server.name, server.path, server.sort_order || 0, server.id])
  } else {
    runSql('INSERT INTO servers (id, name, path, sort_order) VALUES (?, ?, ?, ?)',
      [server.id, server.name, server.path, server.sort_order || 0])
  }
  saveDb()
}

async function deleteServer(id) {
  await getDb()
  runSql('DELETE FROM servers WHERE id = ?', [id])
  saveDb()
}

// 同步忽略
async function getSyncIgnores(serverId) {
  await getDb()
  return queryAll('SELECT relative_path, created_at FROM sync_ignores WHERE server_id = ?', [serverId])
}

async function addSyncIgnore(serverId, relativePath) {
  await getDb()
  runSql('INSERT OR IGNORE INTO sync_ignores (server_id, relative_path) VALUES (?, ?)', [serverId, relativePath])
  saveDb()
}

async function removeSyncIgnore(serverId, relativePath) {
  await getDb()
  runSql('DELETE FROM sync_ignores WHERE server_id = ? AND relative_path = ?', [serverId, relativePath])
  saveDb()
}

async function clearSyncIgnores(serverId) {
  await getDb()
  runSql('DELETE FROM sync_ignores WHERE server_id = ?', [serverId])
  saveDb()
}

module.exports = {
  getConfig, setConfig,
  getServers, saveServer, deleteServer,
  getSyncIgnores, addSyncIgnore, removeSyncIgnore, clearSyncIgnores
}
