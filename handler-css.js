'use strict'

const assert = require('assert')
const stream = require('readable-stream')

module.exports = css

// create css stream
// obj? -> (req, res) -> rstream
function css (state) {
  return function initCss (opts) {
    opts = opts || {}
    assert.equal(typeof opts, 'object', 'opts must be an object')
    state.cssOpts = opts

    // check if browserify is registered
    if (state.jsRegistered) {
      throw new Error('css must be registered before js to work')
    }

    // (obj, obj) -> rstream
    return function cssHandler (req, res) {
      if (res != null) {
        res.setHeader('Content-Type', 'text/css')
      }

      if (state.cssBuf == null) {
        throw new Error('no css found, did you register bankai.js?')
      }

      // either css hasn't been updated, and is ready to serve
      // or attach a listener to when css will be updated
      // and send when ready
      if (!state.cssReady) {
        const ts = new stream.PassThrough()
        state.once('css:ready', () => {
          state.cssBuf.duplicate().pipe(ts)
        })
        return ts
      } else {
        return state.cssBuf.duplicate()
      }
    }
  }
}
