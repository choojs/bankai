var explain = require('explain-error')
var parse = require('fast-json-parse')
var findup = require('findup')
var path = require('path')
var fs = require('fs')

var DEFAULT_COLOR = Buffer.from('#fff')
var DEFAULT_MANIFEST = Buffer.from(JSON.stringify({
  name: 'app',
  short_name: 'app',
  theme_color: '#fff'
}))

module.exports = node

function node (state, createEdge, emit) {
  var self = this

  var location = path.dirname(state.arguments.entry)
  var filename = 'manifest.json'

  findup(location, filename, function (err, dir) {
    if (err) {
      createEdge('color', DEFAULT_COLOR)
      createEdge('bundle', DEFAULT_MANIFEST)
      return
    }

    var file = path.join(dir, filename)
    fs.readFile(file, function (err, file) {
      if (err) {
        return self.emit('error', explain(err, 'bankai/node-manifest: could not read file ' + file))
      }

      var res = parse(file)
      if (res.err) {
        return self.emit('error', explain(res.err, 'bankai/node-manifest: could not parse JSON in ' + file))
      }

      createEdge('color', Buffer.from(res.value.color || ''))
      createEdge('bundle', Buffer.from(JSON.stringify(res.value)))
    })
  })
}
