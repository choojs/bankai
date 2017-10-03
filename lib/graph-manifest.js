var debug = require('debug')('bankai.node-manifest')
var parseJson = require('fast-json-parse')
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
  var basedir = utils.dirname(state.metadata.entry)
  var self = this

  if (state.metadata.watch && !state.metadata.watchers.manifest) {
    state.metadata.watchers.manifest = true
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
        if (err) return self.emit('error', 'manifest', 'fs.readfile', err)

        var res = parseJson(file)
        if (res.err) return self.emit('error', 'manifest', 'JSON.parse', res.err)

        debug('creating edges')
        createEdge('color', Buffer.from(res.value.theme_color || '#fff'))
        createEdge('bundle', Buffer.from(JSON.stringify(res.value)))
      })
    })
  }
}
