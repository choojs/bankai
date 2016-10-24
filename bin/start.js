'use strict'

const logger = require('bole')('bankai.start')
const resolveEntry = require('../lib/resolve-entry')
const getServerPort = require('get-server-port')
const xtend = require('xtend')
const path = require('path')
const opn = require('opn')
const http = require('http')

const createTinylr = require('../lib/createTinylr')
const createMiddleware = require('../lib/createMiddleware')

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

// Start a development server
// (obj, fn) -> null
module.exports = (options, callback) => {
  const bankai = require('../')({
    optimize: options.optimize
  })
  const state = bankai._state

  const opts = xtend({}, defaults, options)

  const entryFile = resolveEntry(opts.entry)
  const relativeEntry = path.relative(cwd, entryFile)

  const middleware = createMiddleware(bankai, entryFile, opts)
  const server = http.createServer(middleware)
  server.on('error', (error) => {
    console.error(`An implementation error occurred:`, error)
  })

  server.listen(opts.port, () => {
    const address = 'localhost'
    const url = 'http://' + address + ':' + getServerPort(server)
    logger.info('Started bankai for', relativeEntry, 'on', url)

    if (opts.live) {
      if (state.tinyLr != null) {
        state.tinyLr.close()
      }

      // the LiveReload <script> tag needs the actual host IP
      middleware.setLiveOpts({host: address})
      state.tinyLr = createTinylr({host: address})
    }

    if (opts.browse || typeof opts.open === 'string') {
      const app = typeof opts.open === 'string' ? opts.open : null

      const appName = (typeof opts.open === 'string' && opts.open !== '')
        ? opts.open
        : 'system browser'
      logger.debug('Opening', url, 'with', appName)

      opn(url, {app: app})
        .catch(error => {
          logger.error(error)
        })
    }

    callback()
  })
}
