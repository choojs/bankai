var browserify = require('browserify')
var path = require('path')

var exorcise = require('./exorcise')

module.exports = node

function node (state, createEdge) {
  var filename = path.join(__dirname, 'reload-client')
  var self = this
  var b = browserify(filename, { debug: true })

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
