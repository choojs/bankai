const stream = require('readable-stream')
const errorify = require('errorify')
const watchify = require('watchify')
const Emitter = require('events')
const assert = require('assert')
const xtend = require('xtend')
const path = require('path')
const bl = require('bl')

module.exports = js

// create js stream
// obj -> (fn, str, obj?) -> (req, res) -> rstream
function js (state) {
  return function (browserify, src, opts) {
    opts = opts || {}

    assert.equal(typeof opts, 'object', 'opts should be an object')
    assert.equal(typeof browserify, 'function', 'browserify should be a fn')
    assert.equal(typeof src, 'string', 'src should be a location')

    // signal to CSS that browserify is registered
    state.jsRegistered = true

    const baseBrowserifyOpts = {
      cache: {},
      packageCache: {},
      entries: [ require.resolve(src) ],
      fullPaths: true
    }
    var b = browserify(xtend(baseBrowserifyOpts, opts))

    // enable css if registered
    if (state.cssOpts) {
      if (!state.cssBuf || process.env.NODE_ENV === 'development') {
        state.cssBuf = bl()
        state.cssReady = false
      }
      const styleOpts = xtend(state.cssOpts, {
        out: state.cssBuf,
        basedir: path.dirname(module.parent)
      })
      b.transform('sheetify/transform', styleOpts)
    }

    if (process.env.NODE_ENV === 'development') {
      b.plugin(errorify)
      b = watchify(b)
    }

    const handler = wreq(state, b, function () {
      state.cssBuf.end()
    })

    return function (req, res) {
      const ts = new stream.PassThrough()
      handler(req, res, function (err, js) {
        if (err) return ts.emit('error', err)
        state.cssBuf.end()
        res.setHeader('Content-Type', 'application/javascript')
        ts.end(js)
      })
      return ts
    }
  }
}

// handle watchify updates
// (obj, obj, fn) -> null
function wreq (state, bundler, startFn) {
  var prevError = null
  var pending = null
  var buffer = null

  var started = false

  update()
  bundler.on('update', update)

  return handler

  // run the bundler and cache output
  function update () {
    var p = pending = new Emitter()

    const r = bundler.bundle()
    if (!started) {
      started = true
      r.once('end', startFn)
    }

    r.once('end', function () {
      state.cssReady = true
      state.emit('css:ready')
    })

    r.pipe(bl(function (err, _buffer) {
      if (p !== pending) return
      buffer = _buffer
      pending.emit('ready', prevError = err, pending = false)
    }))
  }

  // call the handler function
  function handler (req, res, next) {
    if (pending) {
      pending.once('ready', function (err) {
        if (err) return next(err)
        handler(req, res, next)
      })
    } else if (prevError) {
      next(prevError)
    } else {
      next(null, buffer)
    }
  }
}
