const watchifyRequest = require('watchify-request')
const sheetify = require('sheetify/transform')
const cssExtract = require('css-extract')
const createHtml = require('create-html')
const browserify = require('browserify')
const concat = require('concat-stream')
const watchify = require('watchify')
const assert = require('assert')
const stream = require('stream')
const xtend = require('xtend')
const from = require('from2')
const pump = require('pump')

module.exports = Bankai

// (str, obj) -> obj
function Bankai (entry, opts) {
  if (!(this instanceof Bankai)) return new Bankai(entry, opts)

  opts = opts || {}

  opts.html = opts.html || {}
  opts.css = opts.css || {}
  opts.js = opts.js || {}

  assert.equal(typeof entry, 'string', 'bankai: entry should be a string')
  assert.equal(typeof opts, 'object', 'bankai: opts should be an object')

  const self = this

  this.htmlDisabled = (opts.html === false)
  this.cssDisabled = (opts.css === false)
  this.optimize = opts.optimize
  this.cssQueue = []

  if (opts.debug) opts.js = xtend(opts.js, { debug: true })

  this._html = (function () {
    const base = {
      script: 'bundle.js',
      css: (self.cssDisabled) ? null : 'bundle.css',
      head: '<meta name="viewport" content="width=device-width, initial-scale=1">'
    }
    const html = createHtml(xtend(base, opts.html))
    return new Buffer(html)
  })()

  this._js = (function () {
    const base = {
      basedir: process.cwd(),
      entries: [ entry ],
      packageCache: {},
      fullPaths: true,
      cache: {}
    }
    const jsOpts = xtend(base, opts.js)

    const b = (self.optimize)
      ? browserify(jsOpts)
      : watchify(browserify(jsOpts))

    if (!self.cssDisabled) {
      b.plugin(cssExtract, { out: createCssStream })
      b.ignore('sheetify/insert')
      b.transform(sheetify, opts.css)
    }

    return watchifyRequest(b)

    function createCssStream () {
      return concat({ encoding: 'buffer' }, function (css) {
        self._css = css
        while (self.cssQueue.length) self.cssQueue.shift()()
      })
    }
  })()
}

// (obj, obj) -> readStream
Bankai.prototype.js = function (req, res) {
  const through$ = new stream.PassThrough()
  this._js(req, res, function (err, buffer) {
    if (err) return through$.emit('error', err)
    const source$ = from([buffer])
    pump(source$, through$)
  })
  return through$
}

// (obj, obj) -> readStream
Bankai.prototype.html = function (req, res) {
  assert.notEqual(this.htmlDisabled, true, 'bankai: html is disabled')
  if (res) res.setHeader('Content-Type', 'text/html')
  return from([this._html])
}

// (obj, obj) -> readStream
Bankai.prototype.css = function (req, res) {
  assert.notEqual(this.cssDisabled, true, 'bankai: css is disabled')
  if (res) res.setHeader('Content-Type', 'text/css')
  if (!this._css) {
    const self = this
    const through = new stream.PassThrough()
    this.cssQueue.push(function () {
      const source = from([self._css])
      pump(source, through)
    })
    return through
  } else {
    return from([this._css])
  }
}
