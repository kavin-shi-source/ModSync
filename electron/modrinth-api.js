const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')
const url = require('url')

const BASE_URL = 'https://api.modrinth.com/v2'
const USER_AGENT = 'Minecraft-Mod-Manager/1.0 (your@email.com)'
const MAX_RETRIES = 3
const RATE_LIMIT_DELAY = 1000

class RequestQueue {
  constructor() {
    this.queue = []
    this.processing = false
    this.lastRequestTime = 0
  }

  async add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject })
      this.processNext()
    })
  }

  async processNext() {
    if (this.processing || this.queue.length === 0) return
    this.processing = true

    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
      await sleep(RATE_LIMIT_DELAY - timeSinceLastRequest)
    }

    const item = this.queue.shift()
    try {
      this.lastRequestTime = Date.now()
      const result = await item.fn()
      item.resolve(result)
    } catch (err) {
      item.reject(err)
    } finally {
      this.processing = false
      this.processNext()
    }
  }
}

const requestQueue = new RequestQueue()

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function makeRequest(options, retries = MAX_RETRIES) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode === 429 && retries > 0) {
          const retryAfter = parseInt(res.headers['retry-after']) || 5
          setTimeout(() => {
            makeRequest(options, retries - 1).then(resolve).catch(reject)
          }, retryAfter * 1000)
          return
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`))
          return
        }
        try {
          resolve(JSON.parse(data))
        } catch {
          resolve(data)
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(30000, () => {
      req.destroy()
      reject(new Error('请求超时'))
    })
    if (options.body) {
      req.write(options.body)
    }
    req.end()
  })
}

async function searchMods(query, limit = 20, facets = []) {
  const params = new url.URLSearchParams({
    query,
    limit: String(limit)
  })
  if (facets.length > 0) {
    params.set('facets', JSON.stringify(facets))
  }
  return makeRequest({
    hostname: 'api.modrinth.com',
    path: `/v2/search?${params.toString()}`,
    method: 'GET',
    headers: {
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/json'
    }
  })
}

async function getModInfo(modId) {
  return makeRequest({
    hostname: 'api.modrinth.com',
    path: `/v2/project/${modId}`,
    method: 'GET',
    headers: {
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/json'
    }
  })
}

async function getModVersions(modId, gameVersions = [], loaders = []) {
  let path = `/v2/project/${modId}/version`
  const params = new url.URLSearchParams()
  if (gameVersions.length > 0) {
    gameVersions.forEach(v => params.append('game_versions', v))
  }
  if (loaders.length > 0) {
    loaders.forEach(l => params.append('loaders', l))
  }
  const queryString = params.toString()
  if (queryString) path += '?' + queryString
  return makeRequest({
    hostname: 'api.modrinth.com',
    path,
    method: 'GET',
    headers: {
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/json'
    }
  })
}

async function downloadMod(downloadUrl, destPath) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(downloadUrl)
    const httpModule = parsedUrl.protocol === 'https:' ? https : http
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: { 'User-Agent': USER_AGENT },
      timeout: 120000
    }
    const req = httpModule.request(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadMod(res.headers.location, destPath).then(resolve).catch(reject)
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error(`下载失败: HTTP ${res.statusCode}`))
        return
      }
      fs.mkdirSync(path.dirname(destPath), { recursive: true })
      const fileStream = fs.createWriteStream(destPath)
      res.pipe(fileStream)
      fileStream.on('finish', () => {
        fileStream.close()
        resolve({ success: true, destPath })
      })
      fileStream.on('error', reject)
    })
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('下载超时'))
    })
    req.end()
  })
}

async function identifyMod(fileName) {
  const baseName = path.basename(fileName, '.jar').replace(/\.disabled$/, '')
  const modName = baseName.replace(/-\d+[\w.]*$/, '').replace(/-\d+$/, '')
  const result = await searchMods(modName, 1)
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
  searchMods: (...args) => requestQueue.add(() => searchMods(...args)),
  getModInfo: (...args) => requestQueue.add(() => getModInfo(...args)),
  getModVersions: (...args) => requestQueue.add(() => getModVersions(...args)),
  downloadMod: (...args) => requestQueue.add(() => downloadMod(...args)),
  identifyMod: (...args) => requestQueue.add(() => identifyMod(...args))
}
