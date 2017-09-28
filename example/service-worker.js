/* global self */

var VERSION = String(Date.now())
var FILES = process.env.FILE_LIST

// Respond with cached resources
self.addEventListener('fetch', function (e) {
  var request = self.caches.match(e.request)
    .then(function (req) {
      return req || self.fetch(e.request)
    })

  e.respondWith(request)
})

// Register worker
self.addEventListener('install', function (e) {
  var cacheFiles = self.caches.open(VERSION)
    .then(function (cache) {
      return cache.addAll(FILES)
    })

  e.waitUntil(cacheFiles)
})

// Remove outdated resources
self.addEventListener('activate', function (e) {
  var removeKeys = self.caches.keys()
    .then(function (keyList) {
      return Promise.all(keyList.map(function (key, i) {
        if (keyList[i] !== VERSION) return self.caches.delete(keyList[i])
      }))
    })

  e.waitUntil(removeKeys)
})
