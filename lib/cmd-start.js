var gzipMaybe = require('http-gzip-maybe')
var gzipSize = require('gzip-size')
var getPort = require('getport')
var pump = require('pump')

var Router = require('./regex-router')
var remoteFs = require('./remote-fs')
var http = require('./http-server')
var bankai = require('../')
var ui = require('./ui')

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
  var quiet = !!opts.quiet
  var compiler = bankai(entry)
  var router = new Router()
  var state = {
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
  compiler.on('error', function (error) {
    state.error = error.message + error.stack
    if (!quiet) render()
  })

  compiler.on('change', function (nodeName, edgeName, nodeState) {
    var node = nodeState[nodeName][edgeName]
    var data = {
      name: nodeName,
      progress: 100,
      timestamp: time(),
      size: 0,
      status: 'done',
      done: true
    }
    state.files[nodeName] = data

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

  router.route(/^\/readdir$/, remoteFs.readdir)
  router.route(/^\/readfile$/, remoteFs.readFile)
  router.route(/^\/writefile$/, remoteFs.writeFile)

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

  router.route(/^\/assets\/(.*)$/, function (req, res, params) {
    var prefix = 'assets' // TODO: also accept 'content'
    var name = prefix + '/' + params[1]
    compiler.assets(name, function (err, node) {
      if (err) {
        res.statusCode = 404
        return res.end(err.message)
      }
      gzip(node.buffer, req, res)
    })
  })

  router.route(/\/sse/, function sse (req, res) {
    state.sse += 1
    if (!quiet) render()

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache'
    })
    res.write('retry: 10000\n')

    var interval = setInterval(function () {
      res.write('heartbeat: ' + (new Date()) + '\n\n')
    }, 2000)

    // Attach an error handler, but no need to actually handle the error.
    // This is a bug in Node core according to mcollina which will be fixed
    // in a future Node release. Let's keep this in place as long as v8.x.x of
    // Node isn't in LTS yet.
    res.on('error', disconnect)
    req.on('error', disconnect)

    req.connection.addListener('close', disconnect, false)

    function disconnect () {
      clearInterval(interval)
      state.sse -= 1
      if (!quiet) render()
    }
  })

  router.default(function (req, res) {
    var url = req.url
    compiler.documents(url, function (err, node) {
      if (err) {
        return compiler.documents('/404', function (err, node) {
          res.statusCode = 404
          if (err) {
            return res.end(err.message)
          }
          res.setHeader('content-type', 'text/html')
          gzip(node.buffer, req, res)
        })
      }
      res.setHeader('content-type', 'text/html')
      gzip(node.buffer, req, res)
    })
  })

  // Start listening on an unused port.
  var server = http.createServer(function (req, res) {
    if (req.type === 'OPTIONS') return cors(req, res)
    router.match(req, res)
  })
  getPort(8080, 9000, function (err, port) {
    if (err) state.error = err
    server.listen(port, function () {
      state.port = port
    })
  })
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

function cors (req, res) {
  res.setHeader('access-control-allow-origin', '*')
  res.setHeader('access-control-allow-methods', '*')
  res.setHeader('access-control-allow-headers', '*')
  res.setHeader('access-control-allow-credentials', 'true')
  res.end(200)
}
