const http = require('http')
const path = require('path')
const browserify = require('browserify')
const getServerPort = require('get-server-port')
const opn = require('opn')
const resolve = require('resolve')
const serverRouter = require('server-router')
const stringToStream = require('string-to-stream')
const xtend = require('xtend')

const defaults = {
  port: 1337,
  browse: false,
  optimize: false,
  entry: '.',
  html: {},
  css: {},
  js: {}
}

const cwd = process.cwd()

// resolve a path according to require.resolve algorithm
// string -> string
function resolveEntryFile (relativePath) {
  const first = relativePath.charAt(0)
  const entry = ['.', '/'].includes(first) ? relativePath : './' + relativePath
  return resolve.sync(entry, {basedir: cwd})
}

// Start a development server
function start (options, cb) {
  const bankai = require('../')({
    optimize: options.optimize
  })

  const settings = xtend({}, defaults, options)
  const callback = cb || function () {}

  const entryFile = resolveEntryFile(settings.entry)
  const relativeEntry = path.relative(cwd, entryFile)
  const router = serverRouter('/404')

  router.on('/404', (req, res) => {
    res.statusCode = 404
    return stringToStream('Not found')
  })

  if (settings.html) {
    const html = bankai.html(settings.html)
    router.on('/:path', html)
    router.on('/', html)
  }

  if (settings.css) {
    const css = bankai.css(settings.css)
    router.on(settings.html.css || '/bundle.css', css)
  }

  const js = bankai.js(browserify, entryFile, settings.js)
  router.on(settings.html.entry || '/bundle.js', js)

  const server = http.createServer((req, res) => {
    router(req, res).pipe(res)
  })

  server.listen(settings.port, () => {
    const port = getServerPort(server)

    const address = ['http://localhost', port].join(':')
    console.log('Started bankai for', relativeEntry, 'on', address)

    if (settings.browse) {
      const app = typeof settings.open === 'string' ? settings.open : null

      const appName = typeof settings.open === 'string'
        ? settings.open
        : 'system browser'
      console.log('Opening', address, 'with', appName)

      opn(address, {app: app})
        .catch(error => {
          console.error(error)
        })
    }

    callback()
  })
}

module.exports = start
