const watchifyRequest = require('watchify-request')
const lrScript = require('inject-lr-script-stream')
const htmlIndex = require('simple-html-index')
const stream = require('readable-stream')
const errorify = require('errorify')
const watchify = require('watchify')
const assert = require('assert')
const xtend = require('xtend')
const path = require('path')
const bl = require('bl')

const env = process.env.NODE_ENV

var jsStarted = false
var cssBuf = null
var cssOpts = null

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
  cssOpts = opts

  if (jsStarted) throw new Error('css must be registered before js to work')

  return function (req, res) {
    res.setHeader('Content-Type', 'text/css')
    return cssBuf.duplicate()
  }
}

// create js stream
// (fn, str, obj?) -> (req, res) -> rstream
exports.js = function js (browserify, src, opts) {
  assert.equal(typeof browserify, 'function', 'browserify should be a fn')
  assert.equal(typeof src, 'string', 'src should be a location')

  opts = opts || {}
  const defaultOpts = {
    cache: {},
    packageCache: {},
    entries: [ require.resolve(src) ],
    fullPaths: true
  }
  var b = browserify(xtend(defaultOpts, opts))

  // enable css if registered
  if (cssOpts) {
    cssBuf = bl()
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
  const handler = watchifyRequest(b)
  jsStarted = true

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
