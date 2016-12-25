var watchifyRequest = require('watchify-request')
var sheetify = require('sheetify/transform')
var cssExtract = require('css-extract')
var createHtml = require('create-html')
var browserify = require('browserify')
var concat = require('concat-stream')
var watchify = require('watchify')
var assert = require('assert')
var stream = require('stream')
var xtend = require('xtend')
var from = require('from2')
var pump = require('pump')

module.exports = Bankai

// (str, obj) -> obj
function Bankai (entry, opts) {
  if (!(this instanceof Bankai)) return new Bankai(entry, opts)

  opts = opts || {}

  assert.equal(typeof entry, 'string', 'bankai: entry should be a string')
  assert.equal(typeof opts, 'object', 'bankai: opts should be an object')

  var self = this

  this.htmlDisabled = (opts.html === false)
  this.cssDisabled = (opts.css === false)
  this.optimize = opts.optimize
  this.cssQueue = []

  opts.html = opts.html || {}
  opts.css = opts.css || {}
  opts.js = opts.js || {}

  if (opts.debug) opts.js = xtend(opts.js, { debug: true })

  this._html = (function () {
    var base = {
      script: 'bundle.js',
      css: (self.cssDisabled) ? null : 'bundle.css',
      head: '<meta name="viewport" content="width=device-width, initial-scale=1">'
    }
    var html = createHtml(xtend(base, opts.html))
    return new Buffer(html)
  })()

  this._js = (function () {
    var base = {
      basedir: process.cwd(),
      entries: [ entry ],
      packageCache: {},
      fullPaths: true,
      cache: {}
    }
    var jsOpts = xtend(base, opts.js)

    var b = (self.optimize)
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
  var through$ = new stream.PassThrough()
  this._js(req, res, function (err, buffer) {
    if (err) return through$.emit('error', err)
    var source$ = from([buffer])
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
    var self = this
    var through = new stream.PassThrough()
    this.cssQueue.push(function () {
      var source = from([self._css])
      pump(source, through)
    })
    return through
  } else {
    return from([this._css])
  }
}
