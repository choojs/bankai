const browserify = require('browserify')
const assert = require('assert')
const xtend = require('xtend')

module.exports = Bankai

function Bankai (opts) {
  if (!(this instanceof Bankai)) return new Bankai(opts)

  opts = opts || {}

  this.optimize = opts.optimize
  this.htmlDisabled = opts.html
  this.cssDisabled = opts.css
}

Bankai.prototype.js = function (entry, opts) {
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

Bankai.prototype.html = function (opts) {
  assert.ok(!this.htmlDisabled, 'bankai: html is disabled')
}

Bankai.prototype.css = function (opts) {
  assert.ok(!this.cssDisabled, 'bankai: css is disabled')
}
