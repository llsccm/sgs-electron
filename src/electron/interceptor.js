const { app, session, net } = require('electron')
const path = require('path')
const fs = require('fs')
const fsp = require('fs/promises')
const { pathToFileURL } = require('url')

const programDir = app.isPackaged ? path.dirname(app.getPath('exe')) : app.getAppPath()
const resourceDir = path.join(programDir, 'resources')
const hasAfterJs = fs.existsSync(path.join(resourceDir, 'after.js'))

// 合并后的 webRequest 过滤器：既有规则 + 缓存控制资源规则
const combinedFilter = {
  urls: [
    // 现有规则
    '*://web.sanguosha.com/220/h5_2/libs/*',
    '*://sdk.rum.aliyuncs.com/*',
    // 缓存控制资源规则
    '*://web.sanguosha.com/220/h5_2/res/runtime/pc/general/*/dynamic/*/*',
    '*://web.sanguosha.com/220/h5_2/res/runtime/pc/animate/skinEffectBig/*/*',
    '*://web.sanguosha.com/220/h5_2/res/runtime/pc/animate/skinEffectNew/*/*',
    '*://web.sanguosha.com/220/h5_2/res/assets/font/*.ttf',
    '*://web.sanguosha.com/220/h5_2/res/runtime/pc/voice/*.mp3',
    '*://web.sanguosha.com/220/h5_2/res/runtime/pc/animate/skinEffectNew/*/*.dds'
  ]
}

// 缓存本地存放根目录
const CACHE_DIR = path.join(app.getPath('userData'), 'LayaCache')

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
}

// TTL 设定为 7 天 (7 * 24 * 60 * 60 * 1000 毫秒)
const DISK_TTL = 7 * 24 * 60 * 60 * 1000

// 精确匹配正则表达式（用于 onBeforeRequest 中的二次精确匹配）
const dynamicResourcePattern =
  /\/220\/h5_2\/res\/runtime\/pc\/(?:general\/(?:seat|big)\/dynamic|animate\/skinEffect(?:Big|New))\/[\d_]+\/[^/?#]+\.(?:json|atlas|dds)(?:[?#]|$)/i
const fontResourcePattern = /\/220\/h5_2\/res\/assets\/font\/[^/?#]+\.ttf(?:[?#]|$)/i
const voiceResourcePattern = /\/220\/h5_2\/res\/runtime\/pc\/voice\/(.+)\.mp3(?:[?#]|$)/

// MIME 类型映射表
const MIME_MAP = {
  '.json': 'application/json',
  '.atlas': 'text/plain',
  '.mp3': 'audio/mp3',
  '.ttf': 'font/ttf'
}
const DEFAULT_MIME = 'application/octet-stream'

// 自定义缓存协议名称
const CACHE_PROTOCOL = 'laya-cache'

// ============================================================
// LRU 内存缓存：避免每次请求都进行磁盘 I/O
// ============================================================
const MEM_CACHE_MAX_SIZE = 200 * 1024 * 1024 // 最大内存占用 200MB
const MEM_CACHE_MAX_ENTRIES = 100 // 最大缓存条目数

class LRUCache {
  constructor(maxSize, maxEntries) {
    this._maxSize = maxSize
    this._maxEntries = maxEntries
    this._currentSize = 0
    this._map = new Map() // key → { buffer, meta, size }
  }

  get(key) {
    if (!this._map.has(key)) return null
    // 访问时移到末尾（最近使用）
    const entry = this._map.get(key)
    this._map.delete(key)
    this._map.set(key, entry)
    return entry
  }

  set(key, buffer, meta) {
    const size = buffer.length
    // 如果单个文件超过最大缓存的一半，不缓存到内存
    if (size > this._maxSize / 2) return

    // 如果已存在，先移除旧条目
    if (this._map.has(key)) {
      const old = this._map.get(key)
      this._currentSize -= old.size
      this._map.delete(key)
    }

    // 淘汰最久未使用的条目，直到有足够空间
    while (this._currentSize + size > this._maxSize || this._map.size >= this._maxEntries) {
      if (this._map.size === 0) break
      const oldestKey = this._map.keys().next().value
      const oldest = this._map.get(oldestKey)
      this._currentSize -= oldest.size
      this._map.delete(oldestKey)
    }

    this._map.set(key, { buffer, meta, size })
    this._currentSize += size
  }

  // 更新已有条目的 meta（不影响 LRU 顺序，不重新读取 buffer）
  updateMeta(key, meta) {
    if (!this._map.has(key)) return
    const entry = this._map.get(key)
    entry.meta = meta
  }
}

const memCache = new LRUCache(MEM_CACHE_MAX_SIZE, MEM_CACHE_MAX_ENTRIES)

// 辅助函数：精密匹配特定路径
function shouldCache(requestUrl) {
  const { pathname } = new URL(requestUrl)
  return dynamicResourcePattern.test(pathname) || fontResourcePattern.test(pathname) || voiceResourcePattern.test(pathname)
}

// 辅助函数：从 URL 中提取版本控制参数值（v/ver/version）
function extractVersion(requestUrl) {
  const { searchParams } = new URL(requestUrl)
  return searchParams.get('v') || searchParams.get('ver') || searchParams.get('version') || null
}

// 辅助函数：获取资源缓存路径（基于 host + pathname，忽略查询参数）
function getCachePaths(requestUrl) {
  const urlObj = new URL(requestUrl)
  const filePath = path.join(CACHE_DIR, urlObj.host, urlObj.pathname)
  return {
    filePath,
    metaPath: `${filePath}.meta.json`
  }
}

// 辅助函数：根据后缀获取 MIME 类型
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return MIME_MAP[ext] || DEFAULT_MIME
}

// 辅助函数：构造带缓存头的 Response（使用保存的原始响应头）
function createCachedResponse(buffer, savedHeaders) {
  return new Response(buffer, {
    headers: savedHeaders || { 'Content-Type': DEFAULT_MIME, 'Access-Control-Allow-Origin': '*' }
  })
}

// 辅助函数：将 Headers 对象转换为普通对象
function headersToObject(headers) {
  const obj = {}
  if (headers && typeof headers.forEach === 'function') {
    headers.forEach((value, key) => {
      obj[key] = value
    })
  }
  return obj
}

// 辅助函数：安全读取文件，返回 null 表示文件不存在
async function safeReadFile(filePath, encoding) {
  try {
    return await fsp.readFile(filePath, encoding)
  } catch {
    return null
  }
}

// 辅助函数：并行读取磁盘缓存（文件体 + meta），返回 { buffer, meta } 或 null
async function readDiskCache(filePath, metaPath) {
  const [buffer, metaRaw] = await Promise.all([
    safeReadFile(filePath),
    safeReadFile(metaPath, 'utf8')
  ])
  if (!buffer || !metaRaw) return null
  try {
    return { buffer, meta: JSON.parse(metaRaw) }
  } catch {
    return null
  }
}

// 辅助函数：发送协商缓存请求，验证远端资源是否变更
async function negotiateCache(url, meta, filePath, metaPath, now) {
  const validateHeaders = {}
  if (meta.etag) validateHeaders['If-None-Match'] = meta.etag
  if (meta.lastModified) validateHeaders['If-Modified-Since'] = meta.lastModified

  const checkResponse = await net.fetch(url, { method: 'GET', headers: validateHeaders })

  // 304 未变更：更新本地 meta 的时间戳，重新激活强缓存周期
  if (checkResponse.status === 304) {
    meta.updatedAt = now
    await fsp.writeFile(metaPath, JSON.stringify(meta), 'utf8')

    // 优先从内存缓存取 buffer，避免磁盘读取
    const cached = memCache.get(filePath)
    if (cached) {
      memCache.updateMeta(filePath, meta)
      return createCachedResponse(cached.buffer, meta.headers)
    }

    const buffer = await fsp.readFile(filePath)
    memCache.set(filePath, buffer, meta)
    return createCachedResponse(buffer, meta.headers)
  }

  // 200 有新资源：下载并覆盖本地缓存，直接使用内存中的 buffer
  if (checkResponse.status === 200) {
    const { buffer, meta: newMeta } = await saveCache(filePath, metaPath, checkResponse, now)
    memCache.set(filePath, buffer, newMeta)
    return createCachedResponse(buffer, newMeta.headers)
  }

  // 其他状态码：返回 null 表示协商未命中
  return null
}

// 辅助函数：保存缓存到磁盘，返回 { buffer, meta }
async function saveCache(filePath, metaPath, response, timestamp, version) {
  const responseClone = response.clone()
  const arrayBuffer = await responseClone.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const etag = response.headers.get('etag')
  const lastModified = response.headers.get('last-modified')

  // 保存前修正响应头：用文件后缀确定的 MIME 覆盖服务器返回的 Content-Type，并确保 CORS 头存在
  const responseHeaders = headersToObject(response.headers)
  responseHeaders['content-type'] = getContentType(filePath)
  responseHeaders['access-control-allow-origin'] = '*'

  await fsp.mkdir(path.dirname(filePath), { recursive: true })

  const meta = {
    etag: etag || undefined,
    lastModified: lastModified || undefined,
    version: version || undefined,
    headers: responseHeaders,
    updatedAt: timestamp
  }

  await Promise.all([fsp.writeFile(filePath, buffer), fsp.writeFile(metaPath, JSON.stringify(meta), 'utf8')])

  return { buffer, meta }
}

module.exports = function () {
  for (let i = 1; i <= 2; i++) {
    const ses = session.fromPartition(`persist:sgs${i}`)

    // atom 协议：加载本地资源文件
    ses.protocol.handle('atom', (request) => {
      const relativePath = request.url.replace('atom://', '')
      const safePath = path.normalize(path.join(resourceDir, relativePath))
      return net.fetch(pathToFileURL(safePath).toString())
    })

    // laya-cache 协议：处理缓存资源请求
    ses.protocol.handle(CACHE_PROTOCOL, async (request) => {
      // 从 laya-cache://host/path 还原为 https://host/path
      const originalUrl = request.url.replace(`${CACHE_PROTOCOL}://`, 'https://')

      const { filePath, metaPath } = getCachePaths(originalUrl)
      const now = Date.now()
      const version = extractVersion(originalUrl)
      const ext = path.extname(filePath).toLowerCase()

      // ── 分段耗时日志 ──
      const t0 = performance.now()
      let hitSource = 'none' // mem | disk | negotiate | network

      // 0. 优先查询内存缓存 —— 零磁盘 I/O，最快路径
      const memEntry = memCache.get(filePath)
      const tMemCheck = performance.now()
      if (memEntry) {
        const { buffer, meta } = memEntry
        if (version) {
          // 版本控制资源：版本一致直接返回
          if (meta.version === version) {
            hitSource = 'mem'
            const resp = createCachedResponse(buffer, meta.headers)
            const tEnd = performance.now()
            console.log(`[Cache] ${ext} MEM-HIT | ${(buffer.length / 1024).toFixed(0)}KB | ver=${version} | memCheck=${(tMemCheck - t0).toFixed(1)}ms | total=${(tEnd - t0).toFixed(1)}ms | ${originalUrl}`)
            return resp
          }
          // 版本不同：走协商缓存
          console.log(`[Cache] ${ext} MEM version mismatch: meta.version=${meta.version} req.version=${version}`)
        } else {
          // 无版本控制资源：TTL 内直接返回
          if (now - (meta.updatedAt || 0) < DISK_TTL) {
            hitSource = 'mem'
            const resp = createCachedResponse(buffer, meta.headers)
            const tEnd = performance.now()
            console.log(`[Cache] ${ext} MEM-HIT | ${(buffer.length / 1024).toFixed(0)}KB | noVer TTL ok | memCheck=${(tMemCheck - t0).toFixed(1)}ms | total=${(tEnd - t0).toFixed(1)}ms | ${originalUrl}`)
            return resp
          }
          // 超过 TTL：走协商缓存
          console.log(`[Cache] ${ext} MEM TTL expired, age=${((now - (meta.updatedAt || 0)) / 1000 / 3600).toFixed(1)}h`)
        }
      }

      // 1. 并行读取磁盘缓存（文件体 + meta 同时读取）
      const tDiskStart = performance.now()
      const diskCache = await readDiskCache(filePath, metaPath)
      const tDiskEnd = performance.now()
      if (diskCache) {
        try {
          const { buffer, meta } = diskCache

          if (version) {
            // 【版本控制资源】通过版本号判断缓存有效性
            if (meta.version === version) {
              // 版本一致：写入内存缓存并返回
              memCache.set(filePath, buffer, meta)
              hitSource = 'disk'
              const resp = createCachedResponse(buffer, meta.headers)
              const tEnd = performance.now()
              console.log(`[Cache] ${ext} DISK-HIT | ${(buffer.length / 1024).toFixed(0)}KB | ver=${version} | diskRead=${(tDiskEnd - tDiskStart).toFixed(1)}ms | total=${(tEnd - t0).toFixed(1)}ms | ${originalUrl}`)
              return resp
            }

            // 版本不同：走协商缓存验证，确认是否需要重新下载
            console.log(`[Cache] ${ext} DISK version mismatch: meta.version=${meta.version} req.version=${version}, negotiating...`)
            const tNegStart = performance.now()
            const result = await negotiateCache(originalUrl, meta, filePath, metaPath, now)
            const tNegEnd = performance.now()
            if (result) {
              // 协商成功后更新 meta 中的版本号
              meta.version = version
              await fsp.writeFile(metaPath, JSON.stringify(meta), 'utf8')
              memCache.updateMeta(filePath, meta)
              hitSource = 'negotiate'
              const tEnd = performance.now()
              console.log(`[Cache] ${ext} NEGOTIATE-HIT | ${(buffer.length / 1024).toFixed(0)}KB | diskRead=${(tDiskEnd - tDiskStart).toFixed(1)}ms | negotiate=${(tNegEnd - tNegStart).toFixed(1)}ms | total=${(tEnd - t0).toFixed(1)}ms | ${originalUrl}`)
              return result
            }
          } else {
            // 【无版本控制资源】7天内免协商，直接返回磁盘缓存
            if (now - (meta.updatedAt || 0) < DISK_TTL) {
              memCache.set(filePath, buffer, meta)
              hitSource = 'disk'
              const resp = createCachedResponse(buffer, meta.headers)
              const tEnd = performance.now()
              console.log(`[Cache] ${ext} DISK-HIT | ${(buffer.length / 1024).toFixed(0)}KB | noVer TTL ok | diskRead=${(tDiskEnd - tDiskStart).toFixed(1)}ms | total=${(tEnd - t0).toFixed(1)}ms | ${originalUrl}`)
              return resp
            }

            // 超过7天，走协商缓存验证
            console.log(`[Cache] ${ext} DISK TTL expired, negotiating...`)
            const tNegStart = performance.now()
            const result = await negotiateCache(originalUrl, meta, filePath, metaPath, now)
            const tNegEnd = performance.now()
            if (result) {
              const tEnd = performance.now()
              console.log(`[Cache] ${ext} NEGOTIATE-HIT | diskRead=${(tDiskEnd - tDiskStart).toFixed(1)}ms | negotiate=${(tNegEnd - tNegStart).toFixed(1)}ms | total=${(tEnd - t0).toFixed(1)}ms | ${originalUrl}`)
              return result
            }
          }
        } catch (error) {
          console.error(`Cache logic error for ${originalUrl}:`, error)
        }
      } else {
        console.log(`[Cache] ${ext} NO disk cache | diskRead=${(tDiskEnd - tDiskStart).toFixed(1)}ms | ${originalUrl}`)
      }

      // 2. 初次加载：本地无缓存，请求并执行持久化存储
      try {
        console.log(`[Cache] ${ext} NETWORK fetch start | ${originalUrl}`)
        const tFetchStart = performance.now()
        const response = await net.fetch(originalUrl)
        const tFetchEnd = performance.now()
        if (response.ok) {
          const tSaveStart = performance.now()
          const { buffer, meta } = await saveCache(filePath, metaPath, response, now, version)
          const tSaveEnd = performance.now()
          memCache.set(filePath, buffer, meta)
          hitSource = 'network'
          const resp = createCachedResponse(buffer, meta.headers)
          const tEnd = performance.now()
          console.log(`[Cache] ${ext} NETWORK | ${(buffer.length / 1024).toFixed(0)}KB | fetch=${(tFetchEnd - tFetchStart).toFixed(1)}ms | save=${(tSaveEnd - tSaveStart).toFixed(1)}ms | total=${(tEnd - t0).toFixed(1)}ms | ${originalUrl}`)
          return resp
        }
        console.log(`[Cache] ${ext} NETWORK non-ok status=${response.status} | fetch=${(tFetchEnd - tFetchStart).toFixed(1)}ms | ${originalUrl}`)
        return response
      } catch (error) {
        // 断网/服务器崩溃降级方案：若本地有老资源，强制读取返回，保证游戏可用
        const fallback = await readDiskCache(filePath, metaPath)
        if (fallback) {
          const tEnd = performance.now()
          console.log(`[Cache] ${ext} FALLBACK | ${(fallback.buffer.length / 1024).toFixed(0)}KB | total=${(tEnd - t0).toFixed(1)}ms | ${originalUrl}`)
          return createCachedResponse(fallback.buffer, fallback.meta.headers)
        }
        // 本地无缓存且网络不可用，返回 502 错误响应
        console.log(`[Cache] ${ext} ERROR 502 | ${originalUrl}`, error.message)
        return new Response('Service Unavailable', { status: 502 })
      }
    })

    // webRequest 拦截：统一处理所有需要干预的请求
    ses.webRequest.onBeforeRequest(combinedFilter, (details, callback) => {
      const { url } = details

      // 1. after.js 重定向到 atom 协议
      if (hasAfterJs && url.includes('web.sanguosha.com/220/h5_2/libs/after.js')) {
        return callback({ redirectURL: 'atom://after.js' })
      }

      // 2. 屏蔽 aliyun SDK
      if (url.includes('sdk.rum.aliyuncs.com/v2/browser-sdk.js')) {
        return callback({ cancel: true })
      }

      // 3. 需要缓存的资源 → 重定向到 laya-cache:// 协议
      if (shouldCache(url)) {
        const cacheUrl = url.replace(/^https?:\/\//, `${CACHE_PROTOCOL}://`)
        return callback({ redirectURL: cacheUrl })
      }

      // 4. 匹配到 filter 但不需要特殊处理的 → 放行
      callback({ cancel: false })
    })
  }
}
