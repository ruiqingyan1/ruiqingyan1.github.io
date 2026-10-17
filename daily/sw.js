const CACHE_NAME = 'ruiqy-daily-shell-v10'
const CACHE_MANIFEST_URL = '/daily/cache-manifest.json'

const APP_SHELL = [
  '/daily/',
  '/daily/plan/',
  '/daily/focus/',
  '/daily/weekly/',
  '/daily/notes/',
  CACHE_MANIFEST_URL,
  '/daily/manifest.webmanifest',
  '/daily/icons/icon-192.png',
  '/daily/icons/icon-512.png',
  '/daily/icons/apple-touch-icon.png',
  '/img/avatar.jpg',
  '/img/bg1.jpg',
  '/css/doki-global-theme@1.0.0.css?v=1.3.5',
  '/js/doki-global-theme@1.0.0.js?v=1.1.0',
  '/daily/doki/emilia_light.png',
  '/daily/doki-icons/check.svg',
  '/daily/doki-icons/todo.svg',
  '/daily/doki-icons/history.svg',
  '/daily/doki-icons/file_heart.svg',
  '/daily/doki-icons/library.svg',
  '/daily/doki-icons/notifications.svg',
  '/daily/doki-icons/trash.svg',
  '/daily/doki-icons/folder.svg',
  '/daily/doki-icons/light_house.svg',
  '/daily/doki-icons/locked.svg',
  '/daily/doki-icons/unlocked.svg'
]

function fetchDailyAssetList() {
  return fetch(CACHE_MANIFEST_URL, { cache: 'no-cache' })
    .then(function (response) {
      if (!response.ok) throw new Error('cache manifest unavailable')
      return response.json()
    })
    .then(function (assets) {
      if (!Array.isArray(assets)) throw new Error('invalid cache manifest')
      return Array.from(new Set(APP_SHELL.concat(assets)))
    })
}

function refreshCachedAsset(cache, url) {
  return fetch(url, { cache: 'no-cache' }).then(function (response) {
    if (!response || (!response.ok && response.type !== 'opaque')) {
      throw new Error('failed to cache ' + url)
    }
    return cache.put(url, response.clone())
  })
}

function refreshDailyCache() {
  return Promise.all([caches.open(CACHE_NAME), fetchDailyAssetList()])
    .then(function (results) {
      var cache = results[0]
      var assets = results[1]
      var batches = []
      var refreshResults = []
      for (var index = 0; index < assets.length; index += 12) batches.push(assets.slice(index, index + 12))
      return batches.reduce(function (chain, batch) {
        return chain.then(function () {
          return Promise.all(batch.map(function (url) {
            return refreshCachedAsset(cache, url)
              .then(function () { return { ok: true, url: url } })
              .catch(function (error) {
                return { ok: false, url: url, message: error && error.message ? error.message : 'cache failed' }
              })
          })).then(function (batchResults) {
            refreshResults = refreshResults.concat(batchResults)
          })
        })
      }, Promise.resolve()).then(function () {
        var failedLocalAssets = refreshResults.filter(function (result) {
          return !result.ok && result.url.charAt(0) === '/'
        })
        if (failedLocalAssets.length) {
          throw new Error('failed to cache ' + failedLocalAssets[0].url)
        }
        return {
          assetCount: refreshResults.filter(function (result) { return result.ok }).length,
          skippedExternalCount: refreshResults.filter(function (result) { return !result.ok }).length
        }
      })
    })
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(APP_SHELL) })
      .then(function () { return self.skipWaiting() })
  )
})

self.addEventListener('message', function (event) {
  if (!event.data || event.data.type !== 'RUIQY_DAILY_SYNC') return
  var replyPort = event.ports && event.ports[0]
  event.waitUntil(
    refreshDailyCache()
      .then(function (result) {
        if (replyPort) replyPort.postMessage({
          ok: true,
          cacheName: CACHE_NAME,
          assetCount: result.assetCount,
          skippedExternalCount: result.skippedExternalCount
        })
      })
      .catch(function (error) {
        if (replyPort) replyPort.postMessage({ ok: false, message: error && error.message ? error.message : 'sync failed' })
      })
  )
})

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (key) {
          return key.indexOf('ruiqy-daily-shell-') === 0 && key !== CACHE_NAME
        }).map(function (key) { return caches.delete(key) }))
      })
      .then(function () { return self.clients.claim() })
  )
})

function cacheResponse(request, response) {
  if (!response || !response.ok) return response
  var clone = response.clone()
  caches.open(CACHE_NAME).then(function (cache) { cache.put(request, clone) })
  return response
}

self.addEventListener('fetch', function (event) {
  var request = event.request
  if (request.method !== 'GET') return

  var url = new URL(request.url)
  if (url.pathname.indexOf('/api/') === 0) return

  if (request.mode === 'navigate' && url.origin === self.location.origin && url.pathname.indexOf('/daily') === 0) {
    event.respondWith(
      caches.match(request).then(function (cached) {
        var network = fetch(request)
          .then(function (response) { return cacheResponse(request, response) })
          .catch(function () { return cached })
        if (cached) {
          event.waitUntil(network.then(function () {}))
          return cached
        }
        return network.then(function (response) {
          return response || caches.match('/daily/')
        })
      })
    )
    return
  }

  if (url.origin !== self.location.origin && url.hostname !== 'cdn.jsdelivr.net') return

  event.respondWith(
    caches.match(request).then(function (cached) {
      var network = fetch(request)
        .then(function (response) { return cacheResponse(request, response) })
        .catch(function () { return cached })
      return cached || network
    })
  )
})
