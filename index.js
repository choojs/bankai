const createHtml = require('create-html')
const browserify = require('browserify')
const assert = require('assert')
const xtend = require('xtend')
const from = require('from2')

module.exports = Bankai

function Bankai (entry, opts) {
  if (!(this instanceof Bankai)) return new Bankai(entry, opts)

  opts = opts || {}

  assert.equal(typeof entry, 'string', 'bankai: entry should be a string')
  assert.equal(typeof opts, 'object', 'bankai: opts should be an object')

  this.optimize = opts.optimize
  this.htmlDisabled = opts.html
  this.cssDisabled = opts.css

  // this._js = createBrowserify(opts)
  this._html = _html(opts)
}

Bankai.prototype.js = function (entry, opts) {
}

Bankai.prototype.html = function (req, res) {
  assert.ok(!this.htmlDisabled, 'bankai: html is disabled')
  if (res) res.setHeader('Content-Type', 'text/html')
  return from([this._html])
}

Bankai.prototype.css = function (req, res) {
  assert.ok(!this.cssDisabled, 'bankai: css is disabled')
}

function _html (opts) {
  const base = {
    script: 'bundle.js',
    css: 'bundle.css',
    head: '<meta name="viewport" content="width=device-width, initial-scale=1">'
  }
  const html = createHtml(xtend(base, opts || {}))
  return new Buffer(html)
}

function createBrowserify (entry, opts) {
  const baseOpts = {
    basedir: process.cwd(),
    entries: [ entry ],
    packageCache: {},
    fullPaths: true,
    cache: {}
  }
  var b = browserify(xtend(baseOpts, opts))
  return b.bundle()
}
