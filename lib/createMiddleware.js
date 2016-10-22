'use strict'
const stacked = require('stacked')
const serveStatic = require('serve-static')
const injectLrScript = require('inject-lr-script')
const serverRouter = require('server-router')
const assert = require('assert')
const stringToStream = require('string-to-stream')
const browserify = require('browserify')

const createRouter = (bankai, entryFile, opts) => {
  const state = bankai._state
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
    const route = state.htmlOpts.css
    routes.push([route, css])
  }

  if (opts.js) {
    const js = bankai.js(browserify, entryFile, opts.js)
    const route = state.htmlOpts.entry
    routes.push([route, js])
  }

  return serverRouter('/404', routes)
}

module.exports = (bankai, entryFile, opts) => {
  opts = opts || {}

  let liveOpts = {}

  let staticPaths = [].concat(opts.dir).filter(Boolean)
  if (staticPaths.length === 0) {
    staticPaths = [process.cwd()]
  }

  const router = createRouter(bankai, entryFile, opts)
  const middleware = stacked()
    .use((req, res, next) => {
      if (opts.cors) {
        res.setHeader('Access-Control-Allow-Headers', 'Cache-Control, Pragma, Origin, ' +
          'Authorization, Content-Type, X-Requested-With')
        res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST')
        res.setHeader('Access-Control-Allow-Origin', '*')
      }
      next()
    })
    // Inject live reload snippet on response
    .use((req, res, next) => {
      if (!opts.live) {
        next()
      } else {
        const liveInjector = injectLrScript()
        if (liveOpts.host != null) {
          liveInjector.host = liveOpts.host
        }
        liveInjector(req, res, next)
      }
    })
    .use((req, res) => {
      const result = router(req, res)
      assert.ok(result != null && result.pipe != null,
        `A stream should be returned by the route handler`)
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
      staticHandler(req, res, next)
    })
  })

  middleware.setLiveOpts = function (opts) {
    liveOpts = opts
  }

  return middleware
}
