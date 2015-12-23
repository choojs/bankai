const watchifyRequest = require('watchify-request')
const lrScript = require('inject-lr-script-stream')
const htmlIndex = require('simple-html-index')
const stream = require('readable-stream')
const watchify = require('watchify')
const assert = require('assert')
const xtend = require('xtend')
const bl = require('bl')

// create html stream
// obj? -> (req, res) -> rstream
exports.html = function html (opts) {
  opts = opts || {}
  const defaultOpts = { entry: '/bundle.js', css: '/bundle.css' }
  const htmlOpts = xtend(defaultOpts, opts)
  const htmlBuf = htmlIndex(htmlOpts)
    .pipe(lrScript())
    .pipe(bl())

  return function (req, res) {
    res.setHeader('Content-Type', 'text/html')
    return htmlBuf.duplicate()
  }
}

// create css stream
// (fn, str, obj?) -> (req, res) -> rstream
exports.css = function css (sheetify, src, opts) {
  assert.equal(typeof sheetify, 'function', 'sheetify should be a fn')
  assert.equal(typeof src, 'string', 'src should be a location')

  opts = opts || {}
  const defaultOpts = { basedir: __dirname }
  opts = xtend(defaultOpts, opts)

  return function (req, res) {
    res.setHeader('Content-Type', 'text/css')
    return sheetify(src, opts)
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

  if (process.env.NODE_ENV === 'development') b = watchify(b)
  const handler = watchifyRequest(b)

  return function (req, res) {
    const ts = new stream.PassThrough()
    handler(req, res, function (err, js) {
      if (err) return ts.emit('error', err)
      res.setHeader('Content-Type', 'application/javascript')
      ts.end(js)
    })
    return ts
  }
}
