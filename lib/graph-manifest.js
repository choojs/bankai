var debug = require('debug')('bankai.node-manifest')
var parseJson = require('fast-json-parse')
var fs = require('fs')

var utils = require('./utils')

var DEFAULT_COLOR = '#fff'
var DEFAULT_DESCRIPTION = ''
var DEFAULT_MANIFEST = Buffer.from(JSON.stringify({
  name: '',
  short_name: '',
  start_url: '/',
  display: 'minimal-ui',
  background_color: '#fff',
  theme_color: DEFAULT_COLOR
}))

var filenames = [
  'manifest.json'
]

module.exports = node

function node (state, createEdge, emit) {
  var basedir = state.metadata.dirname
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
        createEdge('bundle', DEFAULT_MANIFEST, {
          color: DEFAULT_COLOR,
          description: DEFAULT_DESCRIPTION,
          mime: 'application/json'
        })
        return
      }

      fs.readFile(filename, function (err, file) {
        if (err) return self.emit('error', 'manifest', 'fs.readfile', err)

        var res = parseJson(file)
        if (res.err) return self.emit('error', 'manifest', 'JSON.parse', res.err)

        debug('creating edges')
        createEdge('bundle', Buffer.from(JSON.stringify(res.value)), {
          color: res.value.theme_color || DEFAULT_COLOR,
          description: res.value.description || DEFAULT_DESCRIPTION,
          mime: 'application/json'
        })
      })
    })
  }
}
