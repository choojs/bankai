'use strict'
const xtend = require('xtend')
const tinyLr = require('tiny-lr')

module.exports = (opts) => {
  const close = () => {
    if (!isClosed) {
      if (isReady) {
        server.close()
      }

      isClosed = true
    }
  }

  opts = xtend(opts)
  if (typeof opts.port !== 'number') {
    opts.port = 35729
  }

  const server = tinyLr()
  let isClosed = false
  let isReady = false

  server.listen(opts.port, opts.host || undefined, () => {
    isReady = true
    if (isClosed) {
      server.close()
    } else {
      console.log({message: 'LiveReload running on ' + opts.host + ':' + opts.port})
    }
  })

  const serverImpl = server.server
  serverImpl.removeAllListeners('error')
  serverImpl.on('error', (err) => {
    console.log(`create-tiny-lr: An error happened in the server`)
    if (err.code === 'EADDRINUSE') {
      process.stderr.write('ERROR: livereload not started, port ' + opts.port + ' is in use\n')
    } else {
      process.stderr.write((err.stack ? err.stack : err) + '\n')
    }
    close()
  })

  return {
    close: close,
    reload: (path) => {
      server.changed({
        body: {
          files: path != null ? [path] : '*'
        }
      })
    }
  }
}
