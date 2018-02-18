var EventEmitter = require('events').EventEmitter
var gzipMaybe = require('http-gzip-maybe')
var gzipSize = require('gzip-size')
var assert = require('assert')
var path = require('path')
var pump = require('pump')
var send = require('send')

var Router = require('./lib/regex-router')
var ui = require('./lib/ui')
var bankai = require('./')

var files = [
  'assets',
  'documents',
  'scripts',
  'manifest',
  'styles',
  'service-worker'
]

module.exports = start

function start (entry, opts) {
  opts = opts || {}

  assert.equal(typeof entry, 'string', 'bankai/http: entry should be type string')
  assert.equal(typeof opts, 'object', 'bankai/http: opts should be type object')

  var quiet = !!opts.quiet
  opts = Object.assign({ reload: true }, opts)
  var compiler = bankai(entry, opts)
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

  if (!quiet) var render = ui(state)
  compiler.on('error', function (topic, sub, err) {
    if (err.pretty) state.error = err.pretty
    else state.error = `${topic}:${sub} ${err.message}\n${err.stack}`
    if (!quiet) render()
  })

  compiler.on('progress', function () {
    state.error = null
    if (!quiet) render()
  })

  compiler.on('ssr', function (result) {
    state.ssr = result
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

    if (name === 'documents:index.html') emitter.emit('documents:index.html', node)
    if (name === 'styles:bundle') emitter.emit('styles:bundle', node)

    // Only calculate the gzip size if there's a buffer. Apparently zipping
    // an empty file means it'll pop out with a 20B base size.
    if (node.buffer.length) {
      gzipSize(node.buffer)
        .then(function (size) { data.size = size })
        .catch(function () { data.size = node.buffer.length })
        .then(function () {
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

  router.route(/^\/assets\/([^?]*)(\?.*)?$/, function (req, res, params) {
    var prefix = 'assets' // TODO: also accept 'content'
    var name = prefix + '/' + params[1]
    compiler.assets(name, function (err, filename) {
      if (err) {
        res.statusCode = 404
        return res.end(err.message)
      }
      pump(send(req, filename), res)
    })
  })

  router.route(/\/([a-zA-Z0-9-_.]+)\.js(\?.*)?$/, function (req, res, params) {
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

  router.route(/\/([a-zA-Z0-9-_.]+)\.css(\?.*)?$/, function (req, res, params) {
    var name = params[1]
    compiler.styles(name, function (err, node) {
      if (err) {
        res.statusCode = 404
        return res.end(err.message)
      }
      res.setHeader('content-type', 'text/css')
      gzip(node.buffer, req, res)
    })
  })

  // Source maps. Each source map is stored as 'foo.js.map' within their
  // respective node. So in order to figure out the right source map we must
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

  router.route(/\/reload/, function sse (req, res) {
    var connected = true
    emitter.on('documents:index.html', reloadScript)
    emitter.on('styles:bundle', reloadStyle)
    state.sse += 1
    if (!quiet) render()

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'X-Accel-Buffering': 'no',
      'Cache-Control': 'no-cache'
    })
    res.write('retry: 10000\n')

    var interval = setInterval(function () {
      if (res.finished) return // prevent writes after stream has closed
      res.write(`id:${id++}\ndata:{ "type:": "heartbeat" }\n\n`)
    }, 4000)

    req.on('error', disconnect)
    res.on('error', disconnect)
    res.on('close', disconnect)
    res.on('finish', disconnect)

    function disconnect () {
      clearInterval(interval)
      if (connected) {
        emitter.removeListener('documents:index.html', reloadScript)
        emitter.removeListener('styles:bundle', reloadStyle)
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
        type: 'styles',
        bundle: node.buffer.toString()
      })
      res.write(`id:${id++}\ndata:${msg}\n\n`)
    }
  })

  router.default(function (req, res, next) {
    var url = req.url

    if (state.ssr && state.ssr.renderRoute) {
      state.ssr.renderRoute(url, function (err, buffer) {
        if (err) {
          state.ssr.success = false
          state.ssr.error = err
          return sendDocument(url, req, res, next)
        }

        res.setHeader('content-type', 'text/html')
        gzip(buffer, req, res)
      })
    } else {
      return sendDocument(url, req, res, next)
    }
  })

  function sendDocument (url, req, res, next) {
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
  }

  // TODO: move all UI code out of this file
  handler.state = state
  // Expose compiler so we can use it in `bankai start`
  handler.compiler = compiler
  return handler

  // Return a handler to listen.
  function handler (req, res, next) {
    router.match(req, res, next)
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
