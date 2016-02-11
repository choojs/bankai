const lrScript = require('inject-lr-script-stream')
const htmlIndex = require('simple-html-index')
const stream = require('readable-stream')
const errorify = require('errorify')
const watchify = require('watchify')
const Emitter = require('events')
const assert = require('assert')
const xtend = require('xtend')
const path = require('path')
const bl = require('bl')

const env = process.env.NODE_ENV

var jsRegistered = false
var cssReady = false
const bus = new Emitter()

var cssOpts = null
var cssBuf = null

// create html stream
// obj? -> (req, res) -> rstream
exports.html = function html (opts) {
  opts = opts || {}
  const defaultOpts = { entry: '/bundle.js', css: '/bundle.css' }
  const htmlOpts = xtend(defaultOpts, opts)
  const html = htmlIndex(htmlOpts)
  const htmlBuf = (env === 'development')
    ? html.pipe(lrScript()).pipe(bl())
    : html.pipe(bl())

  return function (req, res) {
    res.setHeader('Content-Type', 'text/html')
    return htmlBuf.duplicate()
  }
}

// create css stream
// obj? -> (req, res) -> rstream
exports.css = function css (opts) {
  opts = opts || {}
  assert.equal(typeof opts, 'object', 'opts must be an object')
  cssOpts = opts

  if (jsRegistered) throw new Error('css must be registered before js to work')

  return function (req, res) {
    res.setHeader('Content-Type', 'text/css')
    if (!cssBuf) throw new Error('no css found, did you register bankai.js?')
    if (!cssReady) {
      const ts = new stream.PassThrough()
      bus.once('css:ready', function () {
        cssBuf.duplicate().pipe(ts)
      })
      return ts
    } else {
      return cssBuf.duplicate()
    }
  }
}

// create js stream
// (fn, str, obj?) -> (req, res) -> rstream
exports.js = function js (browserify, src, opts) {
  assert.equal(typeof browserify, 'function', 'browserify should be a fn')
  assert.equal(typeof src, 'string', 'src should be a location')

  opts = opts || {}
  jsRegistered = true
  const defaultOpts = {
    cache: {},
    packageCache: {},
    entries: [ require.resolve(src) ],
    fullPaths: true
  }
  var b = browserify(xtend(defaultOpts, opts))

  // enable css if registered
  if (cssOpts) {
    if (!cssBuf || process.env.NODE_ENV === 'development') {
      cssBuf = bl()
    }
    const styleOpts = xtend(cssOpts, {
      out: cssBuf,
      basedir: path.dirname(module.parent)
    })
    b.transform('sheetify/transform', styleOpts)
  }

  if (process.env.NODE_ENV === 'development') {
    b.plugin(errorify)
    b = watchify(b)
  }

  const handler = wreq(b, function () {
    cssBuf.end()
  })

  return function (req, res) {
    const ts = new stream.PassThrough()
    handler(req, res, function (err, js) {
      if (err) return ts.emit('error', err)
      cssBuf.end()
      res.setHeader('Content-Type', 'application/javascript')
      ts.end(js)
    })
    return ts
  }
}

// handle watchify updates
// (obj, fn) -> null
function wreq (bundler, startFn) {
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
      r.once('end', function () {
        cssReady = true
        bus.emit('css:ready')
      })
    }

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
