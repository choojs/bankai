var EventEmitter = require('events').EventEmitter
var gzipMaybe = require('http-gzip-maybe')
var gzipSize = require('gzip-size')
var assert = require('assert')
var path = require('path')
var pump = require('pump')

var Router = require('./lib/regex-router')
var ui = require('./lib/ui')
var bankai = require('./')

var files = [
  'assets',
  'documents',
  'scripts',
  'manifest',
  'style',
  'service-worker'
]

module.exports = start

function start (entry, opts) {
  opts = opts || {}

  assert.equal(typeof entry, 'string', 'bankai/http: entry should be type string')
  assert.equal(typeof opts, 'object', 'bankai/http: opts should be type object')

  var quiet = !!opts.quiet
  var compiler = bankai(entry, { reload: true })
  var router = new Router()
  var emitter = new EventEmitter()
  var id = 0
  var state = {
    count: compiler.metadata.count,
    files: {},
    sse: 0,
    size: 0
  }

  files.forEach(function (filename) {
    state.files[filename] = {
      name: filename,
      progress: 0,
      timestamp: '        ',
      size: 0,
      status: 'pending',
      done: false
    }
  })

  if (!quiet) var _render = ui(state)
  compiler.on('error', function (topic, sub, err) {
    if (err.pretty) state.error = err.pretty
    else state.error = `${topic}:${sub} ${err.message}\n${err.stack}`
    if (!quiet) _render()
  })

  compiler.on('progress', function () {
    if (!quiet) render()
  })

  compiler.on('change', function (nodeName, edgeName, nodeState) {
    var node = nodeState[nodeName][edgeName]
    var name = nodeName + ':' + edgeName
    var data = {
      name: nodeName,
      progress: 100,
      timestamp: time(),
      size: 0,
      status: 'done',
      done: true
    }
    state.files[nodeName] = data

    if (name === 'scripts:bundle') emitter.emit('scripts:bundle', node)
    if (name === 'style:bundle') emitter.emit('style:bundle', node)

    // Only calculate the gzip size if there's a buffer. Apparently zipping
    // an empty file means it'll pop out with a 20B base size.
    if (node.buffer.length) {
      gzipSize(node.buffer, function (err, size) {
        if (err) data.size = node.buffer.length
        else data.size = size
        if (!quiet) render()
      })
    }
    if (!quiet) render()
  })

  router.route(/^\/manifest.json$/, function (req, res, params) {
    compiler.manifest(function (err, node) {
      if (err) {
        res.statusCode = 404
        return res.end(err.message)
      }
      res.setHeader('content-type', 'application/json')
      gzip(node.buffer, req, res)
    })
  })

  router.route(/\/(service-worker\.js)|(\/sw\.js)$/, function (req, res, params) {
    compiler.serviceWorker(function (err, node) {
      if (err) {
        res.statusCode = 404
        return res.end(err.message)
      }
      res.setHeader('content-type', 'application/javascript')
      gzip(node.buffer, req, res)
    })
  })

  router.route(/\/([a-zA-Z0-9-_]+)\.js$/, function (req, res, params) {
    var name = params[1]
    compiler.scripts(name, function (err, node) {
      if (err) {
        res.statusCode = 404
        return res.end(err.message)
      }
      res.setHeader('content-type', 'application/javascript')
      gzip(node.buffer, req, res)
    })
  })

  router.route(/\/bundle.css$/, function (req, res, params) {
    compiler.style(function (err, node) {
      if (err) {
        res.statusCode = 404
        return res.end(err.message)
      }
      res.setHeader('content-type', 'text/css')
      gzip(node.buffer, req, res)
    })
  })

  // Source maps. Each source map is stored as 'foo.js.map' within their
  // respective node. So in order to figure out the right osurce map we must
  // derive figure out where the extension comes from.
  router.route(/\/([a-zA-Z0-9-_.]+)\.map$/, function (req, res, params) {
    var source = params[1]
    var ext = path.extname(source.replace(/\.map$/, ''))
    var type = source === 'bankai-reload.js'
      ? 'reload'
      : source === 'bankai-service-worker.js'
        ? 'service-worker'
        : ext === '.js'
          ? 'scripts'
          : 'unknown'
    compiler.sourceMaps(type, source, function (err, node) {
      if (err) {
        res.statusCode = 404
        return res.end(err.message)
      }
      res.setHeader('content-type', 'application/json')
      gzip(node.buffer, req, res)
    })
  })

  router.route(/^\/assets\/(.*)$/, function (req, res, params) {
    var prefix = 'assets' // TODO: also accept 'content'
    var name = prefix + '/' + params[1]
    compiler.assets(name, function (err, node) {
      if (err) {
        res.statusCode = 404
        return res.end(err.message)
      }
      res.end(node.buffer)
    })
  })

  router.route(/\/reload/, function sse (req, res) {
    var connected = true
    emitter.on('scripts:bundle', reloadScript)
    emitter.on('style:bundle', reloadStyle)
    state.sse += 1
    if (!quiet) render()

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache'
    })
    res.write('retry: 10000\n')

    var interval = setInterval(function () {
      res.write(`id:${id++}\ndata:{ "type:": "heartbeat" }\n\n`)
    }, 4000)

    // Attach an error handler, but no need to actually handle the error.
    // This is a bug in Node core according to mcollina which will be fixed
    // in a future Node release. Let's keep this in place as long as v8.x.x of
    // Node isn't in LTS yet.
    res.on('error', disconnect)
    req.on('error', disconnect)

    req.connection.addListener('close', disconnect, false)

    function disconnect () {
      clearInterval(interval)
      if (connected) {
        emitter.removeListener('scripts:bundle', reloadScript)
        emitter.removeListener('style:bundle', reloadStyle)
        connected = false
        state.sse -= 1
        if (!quiet) render()
      }
    }

    function reloadScript (node) {
      var msg = JSON.stringify({ type: 'scripts' })
      res.write(`id:${id++}\ndata:${msg}\n\n`)
    }

    function reloadStyle (node) {
      var msg = JSON.stringify({
        type: 'style',
        bundle: node.buffer.toString()
      })
      res.write(`id:${id++}\ndata:${msg}\n\n`)
    }
  })

  router.default(function (req, res, next) {
    var url = req.url
    compiler.documents(url, function (err, node) {
      if (err) {
        return compiler.documents('/404', function (err, node) {
          if (err) return next() // No matches found, call next
          res.statusCode = 404
          res.setHeader('content-type', 'text/html')
          gzip(node.buffer, req, res)
        })
      }
      res.setHeader('content-type', 'text/html')
      gzip(node.buffer, req, res)
    })
  })

  // TODO: move all UI code out of this file
  handler.state = state
  return handler

  // Return a handler to listen.
  function handler (req, res, next) {
    router.match(req, res, next)
  }

  function render () {
    state.error = null
    _render()
  }
}

function gzip (buffer, req, res) {
  var zipper = gzipMaybe(req, res)
  pump(zipper, res)
  zipper.end(buffer)
}

function time () {
  var date = new Date()
  var hours = numPad(date.getHours())
  var minutes = numPad(date.getMinutes())
  var seconds = numPad(date.getSeconds())
  return `${hours}:${minutes}:${seconds}`
}

function numPad (num) {
  if (num < 10) num = '0' + num
  return num
}
