var browserify = require('browserify')
var assert = require('assert')

module.exports = Bankai

// - We queue all request callbacks until the initial "ready" event
// - We save all our buffers in an internal KV cache. Eject the prev value once
// the content no longer holds
// - Each entry in the cache contains both a buffer, and a hash of the content.
// - This can be used later to verify which content changed and needs to be
// re-sent / re-written
function Bankai (entry, opts) {
  if (!(this instanceof Bankai)) return new Bankai(entry, opts)
  assert.equal(typeof entry, 'string', 'bankai: entry should be type string')
  assert.equal(typeof opts, 'object', 'bankai: opts should be type object')
  this.entry = entry
  this.cache = {}
}

Bankai.prototype.script = function (filename, opts) {
}

Bankai.prototype.style = function (filename, opts) {
}

Bankai.prototype.html = function (filename, opts) {
}
