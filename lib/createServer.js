'use strict'
const http = require('http')
const xtend = require('xtend')

const createTinylr = require('./createTinylr')
const createMiddleware = require('./createMiddleware')

let tinylr = null

module.exports = (bankai, entryFile, opts) => {
  const middleware = createMiddleware(bankai, entryFile, opts)
  const server = http.createServer(middleware)
  server.on('error', function (error) {
    console.error(`An implementation error occurred:`, error)
  })

  if (opts.live) {
    if (tinylr != null) {
      tinylr.close()
    }

    // the LiveReload <script> tag needs the actual host IP
    middleware.setLiveHost(opts.host)
    tinylr = createTinylr({host: opts.host,})
  }

  return server
}
