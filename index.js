const watchifyRequest = require('watchify-request')
const createHtml = require('create-html')
const browserify = require('browserify')
const watchify = require('watchify')
const assert = require('assert')
const stream = require('stream')
const xtend = require('xtend')
const from = require('from2')
const pump = require('pump')

module.exports = Bankai

function Bankai (entry, opts) {
  if (!(this instanceof Bankai)) return new Bankai(entry, opts)

  opts = opts || {}

  assert.equal(typeof entry, 'string', 'bankai: entry should be a string')
  assert.equal(typeof opts, 'object', 'bankai: opts should be an object')

  this.optimize = opts.optimize
  this.htmlDisabled = opts.html
  this.cssDisabled = opts.css

  this._js = _javascript(entry, opts)
  this._html = _html(opts)
}

Bankai.prototype.js = function (req, res) {
  const through$ = new stream.PassThrough()
  this._js(req, res, function (err, buffer) {
    if (err) return through$.emit('error', err)
    const source$ = from([buffer])
    pump(source$, through$)
  })
  return through$
}

Bankai.prototype.html = function (req, res) {
  assert.ok(!this.htmlDisabled, 'bankai: html is disabled')
  if (res) res.setHeader('Content-Type', 'text/html')
  return from([this._html])
}

Bankai.prototype.css = function (req, res) {
  assert.ok(!this.cssDisabled, 'bankai: css is disabled')
}

// create an html buffer
function _html (opts) {
  const base = {
    script: 'bundle.js',
    css: 'bundle.css',
    head: '<meta name="viewport" content="width=device-width, initial-scale=1">'
  }
  const html = createHtml(xtend(base, opts || {}))
  return new Buffer(html)
}

// create a js watcher
function _javascript (entry, opts) {
  const baseOpts = {
    basedir: process.cwd(),
    entries: [ entry ],
    packageCache: {},
    fullPaths: true,
    cache: {}
  }

  opts = xtend(baseOpts, opts)

  const b = (this.optimize)
    ? browserify(opts)
    : watchify(browserify(opts))

  return watchifyRequest(b)
}
