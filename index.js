var collapser = require('bundle-collapser/plugin')
var EventEmitter = require('events').EventEmitter
var watchifyRequest = require('watchify-request')
var sheetify = require('sheetify/transform')
var unassertify = require('unassertify')
var cssExtract = require('css-extract')
var createHtml = require('create-html')
var browserify = require('browserify')
var concat = require('concat-stream')
var uglifyify = require('uglifyify')
var watchify = require('watchify')
var yoyoify = require('yo-yoify')
var envify = require('envify')
var assert = require('assert')
var stream = require('stream')
var xtend = require('xtend')
var from = require('from2')
var pump = require('pump')
var send = require('send')

var createElectronOpts = require('./lib/electron')

module.exports = Bankai

// (str, obj) -> obj
function Bankai (entry, opts) {
  if (!(this instanceof Bankai)) return new Bankai(entry, opts)
  EventEmitter.call(this)

  opts = opts || {}

  assert.equal(typeof entry, 'string', 'bankai: entry should be a string')
  assert.equal(typeof opts, 'object', 'bankai: opts should be an object')

  var self = this

  this.watch = opts.watch === undefined ? true : opts.watch
  this.htmlDisabled = (opts.html === false)
  this.cssDisabled = (opts.css === false)
  this.cssQueue = []

  opts.html = opts.html || {}
  opts.css = opts.css || {}
  opts.js = opts.js || {}

  if (opts.debug) opts.js = xtend(opts.js, { debug: true })

  this._html = html()
  this._js = js()

  function html () {
    var base = {
      script: '/bundle.js',
      css: self.cssDisabled ? null : '/bundle.css',
      head: '<meta name="viewport" content="width=device-width, initial-scale=1">'
    }
    var html = createHtml(xtend(base, opts.html))
    return Buffer.from(html)
  }

  function js () {
    var base = {
      entries: [ entry ],
      packageCache: {},
      cache: {}
    }

    base = (opts.electron)
      ? xtend(base, createElectronOpts())
      : xtend(base)

    var jsOpts = xtend(base, opts.js)

    var b = self.watch
      ? watchify(browserify(jsOpts))
      : browserify(jsOpts)

    if (!self.cssDisabled) {
      b.plugin(cssExtract, { out: createCssStream })
      b.ignore('sheetify/insert')
      b.transform(sheetify, opts.css)
    }

    if (opts.assert === false || opts.assert === 'false') {
      b.transform(unassertify, { global: true })
    }

    b.transform(yoyoify, { global: true })
    b.transform(envify, { global: true })

    if (opts.uglify !== false && opts.uglify !== 'false') {
      b.transform(uglifyify, { global: true })
    }

    b.plugin(collapser)

    b.on('bundle', function (bundle) {
      self.emit('js-bundle', bundle)
    })

    return watchifyRequest(b)

    function createCssStream () {
      return concat({ encoding: 'buffer' }, function (css) {
        self._css = css
        self.emit('css-bundle', css)
        while (self.cssQueue.length) self.cssQueue.shift()()
      })
    }
  }
}
Bankai.prototype = Object.create(EventEmitter.prototype)

// (obj, obj) -> readStream
Bankai.prototype.js = function (req, res) {
  var throughStream = new stream.PassThrough()
  this._js(req, res, function (err, buffer) {
    if (err) return throughStream.emit('error', err)
    var sourceStream = from([buffer])
    pump(sourceStream, throughStream)
  })
  return throughStream
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

// (obj, obj) -> readStream
Bankai.prototype.static = function (req, res) {
  return send(req, req.url.substr(1))
}
