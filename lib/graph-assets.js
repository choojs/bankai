var trackDir = require('./track-dir')
var utils = require('./utils')
var path = require('path')

var dirs = [
  'assets',
  'content',
  'public'
]

// This module handles all static assets. It only ever links to files, and
// always reads them from disk. Else files might make Node run out of memory
// (e.g. video files). The following steps are taken
//
// 1. Read out all files in the directory lists.
// 2. Write all file names to a list, and emit `list`.
// 3. Estimate total size of all files combined, and emit `size`.
//
// TODO: optimize assets (on the fly); e.g. convert images to webp, etc.
// TODO: also emit `progress`.

module.exports = node

function node (state, createEdge) {
  var basedir = utils.dirname(state.metadata.entry)
  var self = this

  if (state.tracker) return
  var tracker = state.tracker = trackDir()

  tracker.start(basedir, dirs, { watch: state.metadata.watch })
  state.metadata.assets = tracker.files

  tracker.on('error', function (err) {
    self.emit('error', 'assets', 'tracker', err)
  })

  tracker.on('change', function () {
    var list = tracker.list().map(function (file) {
      return path.posix.format(path.parse(path.relative(basedir, file)))
    })
    createEdge('list', Buffer.from(list.join(',')))
  })

  tracker.on('progress', function (progress) {
    // self.emit('progress', 'assets', progress)
  })

  this.on('close', function () {
    tracker.unwatch()
  })
}
