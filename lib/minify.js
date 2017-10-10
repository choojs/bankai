var convert = require('convert-source-map')
var uglify = require('uglify-es')
var assert = require('assert')

// Because `common-shakeify` in our graph-scripts can only operate on
// unminified code, we have to manually run uglify after browserify is done.

module.exports = minify

function minify (entry, buffer, cb) {
  assert.equal(typeof entry, 'string')
  assert.ok(Buffer.isBuffer(buffer))
  assert.equal(typeof cb, 'function')

  buffer = String(buffer)
  var opts = uglifyOpts(entry)

  var min = uglify.minify(buffer, opts)

  if (min.error) return cb(min.error)
  var str = min.code

  if (min.map && min.map !== 'null') {
    str += '\n' + convert.fromJSON(min.map).toComment()
  }

  var bundle = Buffer.from(str)
  cb(null, bundle)
}

function uglifyOpts (entry, otherOpts) {
  return {
    compress: {
      properties: true,
      dead_code: true,
      drop_debugger: false,  // debugger statements should never be stripped
      comparisons: true,
      evaluate: true,
      hoist_funs: true,
      join_vars: true,
      pure_getters: true,
      reduce_vars: true,
      collapse_vars: true
    },
    sourceMap: { content: 'inline' }
  }
}
