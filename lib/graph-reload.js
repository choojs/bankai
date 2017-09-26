var path = require('path')

var browserify = require('browserify')
var uglify = require('uglifyify')

var exorcise = require('./exorcise')

module.exports = node

function node (state, createEdge) {
  var filename = path.join(__dirname, 'reload-client')
  var self = this
  var b = browserify(filename, { debug: true })
  b.transform(uglify, uglifyOpts(filename))

  b.bundle(function (err, bundle) {
    if (err) return self.emit('error', 'reload', 'browserify.bundle', err)
    var mapName = 'bankai-reload.js.map'
    exorcise(bundle, mapName, function (err, bundle, map) {
      if (err) return self.emit('error', 'reload', 'exorcise', err)
      createEdge(mapName, map)
      createEdge('bundle', bundle)
    })
  })
}

function uglifyOpts (entry, otherOpts) {
  var opts = {
    global: true,
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
    }
  }
  opts.sourceMap = { filename: entry }
  return opts
}
