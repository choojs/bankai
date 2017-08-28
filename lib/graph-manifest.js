var debug = require('debug')('bankai.node-manifest')
var parseJson = require('fast-json-parse')
var explain = require('explain-error')
var fs = require('fs')

var utils = require('./utils')

var DEFAULT_COLOR = Buffer.from('#fff')
var DEFAULT_MANIFEST = Buffer.from(JSON.stringify({
  name: '',
  short_name: '',
  start_url: '/',
  display: 'minimal-ui',
  background_color: '#fff',
  theme_color: '#fff'
}))

var filenames = [
  'manifest.json'
]

module.exports = node

function node (state, createEdge, emit) {
  var basedir = utils.dirname(state.arguments.entry)
  var self = this

  if (state.arguments.watch && !state.arguments.watchers.manifest) {
    state.arguments.watchers.manifest = true
    debug('watching ' + basedir + ' for ' + filenames.join(', '))
    var unwatch = utils.watch(basedir, filenames, parse)
    this.on('close', function () {
      debug('closing file watcher')
      unwatch()
    })
  }

  parse()

  function parse () {
    debug('parsing')
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

        debug('creating edges')
        createEdge('color', Buffer.from(res.value.color || '#fff'))
        createEdge('bundle', Buffer.from(JSON.stringify(res.value)))
      })
    })
  }
}
