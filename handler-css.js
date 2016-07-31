const assert = require('assert')
const sse = require('sse-stream')
const stream = require('readable-stream')

module.exports = css

// create css stream
// obj? -> (req, res) -> rstream
function css (state) {
  return function (opts) {
    opts = opts || {}
    assert.equal(typeof opts, 'object', 'opts must be an object')
    state.cssOpts = opts

    // check if browserify is registered
    if (state.jsRegistered) {
      throw new Error('css must be registered before js to work')
    }

    return function (req, res) {
      res.setHeader('Content-Type', 'text/css')

      if (!state.cssBuf) {
        throw new Error('no css found, did you register bankai.js?')
      }

      if (!state.cssSse) {
        state.cssSse = sse('/' + state.htmlOpts.css)
        state.cssSse.install(req.connection.server)
        const eventStream = new stream.PassThrough()
        state.on('css:ready', function () {
          eventStream.push(JSON.stringify({update: ['css']}))
        })
        state.cssSse.on('connection', function (client) {
          eventStream.pipe(client)
        })
      }

      // either css hasn't been updated, and is ready to serve
      // or attach a listener to when css will be updated
      // and send when ready
      if (!state.cssReady) {
        const ts = new stream.PassThrough()
        state.once('css:ready', function () {
          state.cssBuf.duplicate().pipe(ts)
        })
        return ts
      } else {
        return state.cssBuf.duplicate()
      }
    }
  }
}
