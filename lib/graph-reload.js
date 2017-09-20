var path = require('path')

var browserify = require('browserify')
var uglify = require('uglifyify')

module.exports = node

function node (state, createEdge) {
  var filename = path.join(__dirname, 'reload-client')
  var self = this
  var b = browserify(filename)
  b.transform(uglify, uglifyOpts(filename))
  b.bundle(function (err, buffer) {
    if (err) return self.emit('error', 'reload', 'browserify.bundle', err)
    createEdge('bundle', buffer)
  })
}

function uglifyOpts (entry, otherOpts) {
  var opts = {
    global: true,
    compress: {
      properties: true,
      dead_code: true,
      comparisons: true,
      evaluate: true,
      hoist_funs: true,
      join_vars: true,
      pure_getters: true,
      reduce_vars: true,
      collapse_vars: true
    }
  }
  opts.sourceMap = { filename: entry }
  return opts
}
