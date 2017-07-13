var explain = require('explain-error')
var series = require('run-series')
var logHttp = require('log-http')
var assert = require('assert')
var https = require('https')
var http = require('http')
var open = require('open')
var path = require('path')
var pump = require('pump')
var pem = require('pem')
var fs = require('fs')

var findManifest = require('../lib/find-manifest')
var zlibMaybe = require('../lib/gzip-maybe')
var Sse = require('../lib/sse')
var bankai = require('../')

module.exports = start

function start (entry, argv, done) {
  var log = argv.log

  log.debug('running command: start')
  argv.watch = true

  var staticAsset = new RegExp('/' + argv.assets)
  var address = argv.address
  var port = argv.port
  var createServer = http.createServer
  var assets, sse, sslOpts

  var actions = [
    getManifest,   // detect manifest.json files
    startBankai,   // kick off bankai
    maybeHTTPS,    // HTTPS or HTTP
    startServer    // Start server
  ]

  series(actions)

  function getManifest (next) {
    findManifest(entry, function (_, filename) {
      if (filename) argv.html.manifest = filename
      next()
    })
  }

  function startBankai (next) {
    assets = bankai(entry, argv)
    sse = Sse(assets)

    assets.on('js-bundle', function () {
      log.info('bundle:js')
    })

    assets.on('css-bundle', function () {
      log.info('bundle:css')
    })

    next()
  }

  function maybeHTTPS (next) {
    var app = argv.open.length ? argv.open : ''
    if (argv.ssl) {
      return pem.createCertificate({days: 30, selfSigned: true}, function (err, keys) {
        if (err) return done(explain(err, `err creating SSL cert for ${app}`))
        sslOpts = {
          key: keys.serviceKey,
          cert: keys.certificate
        }
        createServer = https.createServer.bind(null, sslOpts)
        next()
      })
    }
    next()
  }

  function startServer () {
    var server = createServer(handler)
    server.listen(port, address, onlisten)

    var stats = logHttp(server)
    stats.on('data', function (level, data) {
      log[level](data)
    })
  }

  function handler (req, res) {
    var url = req.url
    log.debug('received request on url: ' + url)
    if (url === '/') {
      if (fs.existsSync(path.join(process.cwd(), 'index.html'))) {
        fs.createReadStream(path.join(process.cwd(), 'index.html')).pipe(res)
      } else {
        pump(assets.html(req, res), res, function (err) {
          if (err) log.error(err)
        })
      }
    } else if (url === '/sse') {
      sse(req, res)
    } else if (url === '/bundle.js') {
      assets.js(req, res).pipe(zlibMaybe(req, res)).pipe(res)
    } else if (url === '/sw.js') {
      res.writeHead(200, { 'content-type': 'application/javascript' })
      fs.createReadStream(path.join(path.dirname(entry), 'sw.js')).pipe(res)
    } else if (url === '/bundle.css') {
      assets.css(req, res).pipe(zlibMaybe(req, res)).pipe(res)
    } else if (url === '/manifest.json') {
      assert.ok(argv.html.manifest, 'bankai.start: no manifest file found')
      fs.createReadStream(argv.html.manifest).pipe(zlibMaybe(req, res)).pipe(res)
    } else if (url === '/' || req.headers['accept'].indexOf('html') > 0) {
      if (fs.existsSync(path.join(process.cwd(), 'index.html'))) {
        fs.createReadStream(path.join(process.cwd(), 'index.html')).pipe(res)
      } else {
        assets.html(req, res).pipe(zlibMaybe(req, res)).pipe(res)
      }
    } else if (staticAsset.test(url)) {
      assets.static(req).pipe(res)
    } else {
      res.writeHead(404, 'Not Found')
      res.end()
    }
  }

  function onlisten () {
    var relative = path.relative(process.cwd(), entry)
    var protocol = argv.ssl ? 'https' : 'http'
    var addr = protocol + '://' + address + ':' + port
    log.info('Started for ' + relative + ' on ' + addr)
    if (argv.open !== false) {
      var app = argv.open.length ? argv.open : ''
      open(addr, app, function (err) {
        if (err) return done(explain(err, `err running ${app}`))
        done()
      })
    }
  }
}
