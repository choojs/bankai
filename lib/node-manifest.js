var parseJson = require('fast-json-parse')
var explain = require('explain-error')
var fs = require('fs')

var utils = require('./utils')

var DEFAULT_COLOR = Buffer.from('#fff')
var DEFAULT_MANIFEST = Buffer.from(JSON.stringify({
  theme_color: '#fff'
}))

var watching = false
var filenames = [
  'manifest.json'
]

module.exports = node

function node (state, createEdge, emit) {
  var basedir = utils.dirname(state.arguments.entry)
  var self = this

  if (state.watch && !watching) {
    watching = true
    utils.watch(basedir, filenames, parse)
  }

  parse()

  function parse () {
    utils.find(basedir, filenames, function (err, filename) {
      if (err) {
        createEdge('color', DEFAULT_COLOR)
        createEdge('bundle', DEFAULT_MANIFEST)
        return
      }

      fs.readFile(filename, function (err, file) {
        if (err) return self.emit('error', explain(err, 'bankai/node-manifest: could not read file ' + file))

        var res = parseJson(file)
        if (res.err) return self.emit('error', explain(res.err, 'bankai/node-manifest: could not parse JSON in ' + file))

        createEdge('color', Buffer.from(res.value.color || ''))
        createEdge('bundle', Buffer.from(JSON.stringify(res.value)))
      })
    })
  }
}
