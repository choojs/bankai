'use strict'
const stacked = require('stacked')
const serveStatic = require('serve-static')
const liveReload = require('inject-lr-script')
const serverRouter = require('server-router')
const assert = require('assert')
const stringToStream = require('string-to-stream')
const browserify = require('browserify')

function createSimpleHttpLogger(opts) {
  opts = opts || {}
  const ignores = [].concat(opts.ignore).filter(Boolean)

  function httpLogger (req, res, next) {
    if (ignores.indexOf(req.url) >= 0 || req.url == null) {
      next()
    } else {
      // const byteLength = 0
      // const now = Date.now()
      // const onFinished = () => {
        // const elapsed = Date.now() - now
        // log.info({
        //   elapsed: elapsed,
        //   contentLength: byteLength,
        //   method: (req.method || 'GET').toUpperCase(),
        //   url: req.url,
        //   statusCode: res.statusCode,
        //   type: httpLogger.type === 'static' ? undefined : httpLogger.type,
        //   colors: {
        //     elapsed: elapsed > 1000 ? 'yellow' : 'dim'
        //   }
        // })
      // }

      const isAlreadyLogging = !!res._isAlreadyLogging
      res._isAlreadyLogging = true

      if (!isAlreadyLogging) {
        const write = res.write
        // res.once('finish', onFinished)

        // catch content-length of payload
        res.write = (payload) => {
          // if (payload) {
          //   byteLength += payload.length
          // }
          res.write = write
          res.write.apply(res, arguments)
        }
      }

      next()
    }

    httpLogger.type = 'static'
    return httpLogger
  }
}

const createRouter = (bankai, entryFile, opts) => {
  const routes = []
  routes.push(['/404', (req, res) => {
    res.statusCode = 404
    return stringToStream('Not found')
  }])

  if (opts.html) {
    const html = bankai.html(opts.html)
    routes.push(['/', html])
    routes.push(['/:path', html])
  }

  if (opts.css) {
    const css = bankai.css(opts.css)
    const route = opts.html.css || '/bundle.css'
    routes.push([route, css])
  }

  if (opts.js) {
    const js = bankai.js(browserify, entryFile, opts.js)
    const route = opts.html.entry || '/bundle.js'
    routes.push([route, js])
  }

  return serverRouter('/404', routes)
}

module.exports = function createMiddleware(bankai, entryFile, opts) {
  opts = opts || {}

  let staticPaths = [].concat(opts.dir).filter(Boolean)
  if (staticPaths.length === 0) {
    staticPaths = [process.cwd()]
  }

  const logHandler = createSimpleHttpLogger({
    ignore: ['/favicon.ico']
  })

  const router = createRouter(bankai, entryFile, opts)
  const middleware = stacked()
    .use((req, res, next) => {
      if (opts.cors) {
        res.setHeader('Access-Control-Allow-Headers', 'Cache-Control, Pragma, Origin, ' +
          'Authorization, Content-Type, X-Requested-With')
        res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST')
        res.setHeader('Access-Control-Allow-Origin', '*')
      }
      logHandler(req, res, next)
    })
    // Inject liveReload snippet on response
    .use((req, res, next) => {
      if (opts.live == null || opts.live.plugin) {
        next()
      } else {
        const liveInjector = liveReload()
        if (opts.live.host != null) {
          liveInjector.host = opts.live.host
        }
        if (opts.live.port) {
          liveInjector.port = opts.live.port
        }
        liveInjector(req, res, next)
      }
    })
    .use((req, res) => {
      console.log(`Routing request`)
      const result = router(req, res)
      assert.ok(result != null && result.pipe != null,
        `A stream should be returned by the route handler`)
      console.log(`Piping stream from route handler to HTTP response`)
      result.pipe(res)
    })
    // Handle errors
    .use(function (req, res) {
      res.statusCode = 404
      res.end('404 not found: ' + req.url)
    })
    // Ignore favicon clutter
    .mount('/favicon.ico', function (req, res) {
      const maxAge = 345600 // 4 days
      res.setHeader('Cache-Control', 'public, max-age=' + Math.floor(maxAge / 1000))
      res.setHeader('Content-Type', 'image/x-icon')
      res.statusCode = 200
      res.end()
    })

  // Static assets (html/images/etc)
  staticPaths.forEach(function (rootFile) {
    const staticHandler = serveStatic(rootFile)
    middleware.use(function (req, res, next) {
      logHandler.type = 'static'
      staticHandler(req, res, next)
    })
  })

  middleware.setLiveHost = function (host) {
    opts.live.host = host
  }

  return middleware
}
