var convert = require('convert-source-map')
var uglify = require('uglify-es')
var assert = require('assert')
var path = require('path')

// NOTE: This whole file is insanity. Uglify requires all sorts of mapping to
// preserve source maps. Because of `common-shakeify` in our graph-scripts can
// only operate on unminified code, we had to dismantle uglifyify and run it
// after browserify is done. Almost every piece of config in this file seems
// arbitrary & is prone to workarounds; only touch it if you're sure uglify
// is causing trouble.

module.exports = minify

function minify (entry, buffer, cb) {
  assert.equal(typeof entry, 'string')
  assert.ok(Buffer.isBuffer(buffer))
  assert.equal(typeof cb, 'function')

  buffer = String(buffer)
  var opts = uglifyOpts(entry)
  var matched = buffer.match(
    // match an inlined sourceMap with or without a charset definition
    /\/\/[#@] ?sourceMappingURL=data:application\/json(?:;charset=utf-8)?;base64,([a-zA-Z0-9+/]+)={0,2}\n?$/
  )

  // Check if incoming source code already has source map comment.
  // If so, send it in to ujs.minify as the inSourceMap parameter
  if (matched) {
    opts.sourceMap.content = convert
      .fromJSON(Buffer.from(matched[1], 'base64').toString())
      .sourcemap
  }

  var min = uglify.minify(buffer, opts)
  var str = ''

  if (min.error) return cb(min.error)
  min.code = min.code.replace(/\/\/[#@] ?sourceMappingURL=out.js.map$/, '')
  str += min.code

  if (min.map && min.map !== 'null') {
    var map = convert.fromJSON(min.map)
    map.setProperty('sources', [path.basename(entry)])
    map.setProperty('sourcesContent', matched
      ? opts.sourceMap.sourcesContent
      : [buffer]
    )
    str += '\n'
    str += map.toComment()
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
    sourceMap: {
      filename: entry,
      url: 'out.js.map'
    }
  }
}
