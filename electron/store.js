const Database = require('better-sqlite3')
const path = require('path')
const { app } = require('electron')

const DB_PATH = path.join(app.getPath('userData'), 'mod-manager.db')

let db = null

function getDb() {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    initTables()
  }
  return db
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS mods_cache (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      modrinth_id TEXT,
      display_name TEXT,
      latest_version TEXT,
      last_checked TEXT,
      file_hash TEXT,
      disabled INTEGER DEFAULT 0,
      FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
    );
  `)
}

// 配置读写
function getConfig() {
  const rows = getDb().prepare('SELECT key, value FROM config').all()
  const config = {}
  rows.forEach(row => {
    config[row.key] = row.value
  })
  return config
}

function setConfig(key, value) {
  getDb().prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, String(value))
}

// 服务器 CRUD
function getServers() {
  return getDb().prepare('SELECT * FROM servers ORDER BY sort_order ASC').all()
}

function saveServer(server) {
  const existing = getDb().prepare('SELECT id FROM servers WHERE id = ?').get(server.id)
  if (existing) {
    getDb().prepare('UPDATE servers SET name = ?, path = ?, sort_order = ? WHERE id = ?')
      .run(server.name, server.path, server.sort_order || 0, server.id)
  } else {
    getDb().prepare('INSERT INTO servers (id, name, path, sort_order) VALUES (?, ?, ?, ?)')
      .run(server.id, server.name, server.path, server.sort_order || 0)
  }
}

function deleteServer(id) {
  getDb().prepare('DELETE FROM servers WHERE id = ?').run(id)
}

// 模组缓存
function getModsCache(serverId) {
  return getDb().prepare('SELECT * FROM mods_cache WHERE server_id = ?').all(serverId)
}

function upsertModCache(mod) {
  getDb().prepare(`
    INSERT OR REPLACE INTO mods_cache (id, server_id, file_name, file_path, modrinth_id, display_name, latest_version, last_checked, file_hash, disabled)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(mod.id, mod.server_id, mod.file_name, mod.file_path, mod.modrinth_id, mod.display_name, mod.latest_version, mod.last_checked, mod.file_hash, mod.disabled || 0)
}

function deleteModCache(id) {
  getDb().prepare('DELETE FROM mods_cache WHERE id = ?').run(id)
}

function clearModsCache(serverId) {
  getDb().prepare('DELETE FROM mods_cache WHERE server_id = ?').run(serverId)
}

module.exports = {
  getConfig, setConfig,
  getServers, saveServer, deleteServer,
  getModsCache, upsertModCache, deleteModCache, clearModsCache
}
