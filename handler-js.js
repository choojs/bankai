'use strict'

const assert = require('assert')
const bl = require('bl')
const cssExtract = require('css-extract')
const Emitter = require('events')
const errorify = require('errorify')
const sheetify = require('sheetify/transform')
const stream = require('readable-stream')
const watchify = require('watchify')
const xtend = require('xtend')

module.exports = js

// create js stream
// obj -> (fn, str, obj?) -> (req, res) -> rstream
function js (state) {
  return function initJs (browserify, src, opts) {
    opts = opts || {}

    // signal to CSS that browserify is registered
    const baseBrowserifyOpts = {
      id: 'bankai-app',
      basedir: process.cwd(),
      cache: {},
      packageCache: {},
      entries: [src],
      fullPaths: true
    }
    const browserifyOpts = xtend(baseBrowserifyOpts, opts)
    var b = browserify(browserifyOpts)

    b.require(src, {
      expose: browserifyOpts.id
    })

    // enable css if registered
    if (state.cssOpts) {
      if (!state.cssBuf || !state.optimize) {
        state.cssBuf = bl()
        state.cssReady = false
      }

      state.cssStream.pipe(state.cssBuf)
      b.transform(sheetify, state.cssOpts)
      b.plugin(cssExtract, { out: () => state.cssStream })
    }

    if (!state.optimize) {
      b.plugin(errorify)
      b = watchify(b)
    }

    const handler = wreq(state, b, () => {})

    // (obj, obj) -> rstream
    return function jsHandler (req, res) {
      const ts = new stream.PassThrough()
      if (b.close && !b.closing) {
        b.closing = true
        if (req) req.connection.server.on('close', () => b.close())
      }
      handler(req, res, (err, js) => {
        if (err) return ts.emit('error', err)
        state.cssBuf.end()
        if (res) res.setHeader('Content-Type', 'application/javascript')
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
  state.cssStream.on('finish', onCssStreamFinish)

  return handler

  // run the bundler and cache output
  function update () {
    var p = pending = new Emitter()
    state.cssReady = false
    state.cssStream.unpipe(state.cssBuf)
    state.cssBuf = bl()
    state.cssStream.pipe(state.cssBuf)

    const r = bundler.bundle()
    if (!started) {
      started = true
      r.once('end', startFn)
    }

    r.pipe(bl((err, _buffer) => {
      if (p !== pending) return
      buffer = _buffer
      pending.emit('ready', prevError = err, pending = false)
    }))
  }

  function onCssStreamFinish () {
    state.cssStream = new stream.PassThrough()
    state.cssStream.on('finish', onCssStreamFinish)
    state.cssStream.pipe(state.cssBuf)
  }

  // call the handler function
  function handler (req, res, next) {
    if (pending) {
      pending.once('ready', err => {
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
