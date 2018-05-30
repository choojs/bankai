var EventEmitter = require('events').EventEmitter
var gzipMaybe = require('http-gzip-maybe')
var assert = require('assert')
var path = require('path')
var pump = require('pump')
var send = require('send')

var Router = require('./lib/regex-router')
var bankai = require('./')

module.exports = start

function start (entry, opts) {
  opts = opts || {}

  assert.equal(typeof entry, 'string', 'bankai/http: entry should be type string')
  assert.equal(typeof opts, 'object', 'bankai/http: opts should be type object')

  opts = Object.assign({ reload: true }, opts)
  var compiler = bankai(entry, opts)
  var router = new Router()
  var emitter = new EventEmitter()
  var id = 0
  var state = {
    sse: 0
  }

  compiler.on('ssr', function (result) {
    state.ssr = result
  })

  compiler.on('change', function (nodeName, edgeName, nodeState) {
    var node = nodeState[nodeName][edgeName]
    var name = nodeName + ':' + edgeName
    if (name === 'documents:index.html') emitter.emit('documents:index.html', node)
    if (name === 'styles:bundle') emitter.emit('styles:bundle', node)
  })

  router.route(/^\/manifest\.json$/, function (req, res, params) {
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

  router.route(/^\/(assets|content|public)\/([^?]*)(\?.*)?$/, function (req, res, params) {
    var prefix = params[1] // asset dir
    var name = prefix + '/' + params[2]
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
    compiler.emit('sse-connect')

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
        compiler.emit('sse-disconnect')
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
