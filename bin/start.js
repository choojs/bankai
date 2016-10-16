'use strict'

const resolveEntry = require('../lib/resolve-entry')
const getServerPort = require('get-server-port')
const xtend = require('xtend')
const http = require('http')
const path = require('path')
const opn = require('opn')

const createServer = require('../lib/createServer')

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

module.exports = start

// Start a development server
// (obj, fn) -> null
function start (options, cb) {
  const bankai = require('../')({
    optimize: options.optimize
  })

  const opts = xtend({}, defaults, options)
  const callback = cb || function () {}

  const entryFile = resolveEntry(opts.entry)
  const relativeEntry = path.relative(cwd, entryFile)

  const server = createServer(bankai, entryFile, opts)

  server.listen(opts.port, () => {
    const port = getServerPort(server)

    const address = ['http://localhost', port].join(':')
    console.log('Started bankai for', relativeEntry, 'on', address)

    if (opts.browse || typeof opts.open === 'string') {
      const app = typeof opts.open === 'string' ? opts.open : null

      const appName = (typeof opts.open === 'string' && opts.open !== '')
        ? opts.open
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
