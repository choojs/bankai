var mapLimit = require('async-collection/map-limit')
var debug = require('debug')('bankai.node-assets')
var readdir = require('recursive-readdir')
var async = require('async-collection')
var explain = require('explain-error')
var assert = require('assert')
var path = require('path')
var fs = require('fs')

var utils = require('./utils')

var READ_CONCURRENCY = 3

var dirs = [
  'assets',
  'content',
  'public'
]

module.exports = node

function node (state, createEdge) {
  assert.equal(typeof state.metadata.entry, 'string', 'bankai/node-assets: state.metadata.entries should be type string')

  var self = this
  var entry = state.metadata.entry
  var basedir = utils.dirname(entry)
  var fileList = []

  // Read out all files in all directories once.
  mapLimit(dirs, 1, initDirectory, function (err) {
    if (err) return self.emit('error', 'assets', 'init-dir', err)
    var csv = fileList.join(',')
    createEdge('list', Buffer.from(csv))
  })

  // Keep watching for changes in files.
  if (state.metadata.watch && !state.metadata.watchers.assets) {
    state.metadata.watchers.assets = true
    var unwatch = utils.watchDirs(basedir, dirs, function (filePath) {
      iterator(filePath, function (err) {
        if (err) return self.emit('error', 'assets', 'watch-file', err)
      })
    })
    this.on('close', function () {
      debug('closing file watcher')
      unwatch()
    })
  }

  function initDirectory (dirname, done) {
    dirname = path.join(basedir, dirname)
    fs.access(dirname, function (err) {
      if (err) return done()
      readdir(dirname, function (err, list) {
        if (err) return self.emit('error', 'assets', 'recursive-readdir', err)
        async.mapLimit(list, READ_CONCURRENCY, iterator, function (err) {
          if (err) return self.emit('error', 'assets', 'map-limit-read-file', err)
          var parsedList = list.map(function (location) {
            return path.relative(basedir, location)
          })
          fileList = fileList.concat(parsedList)
          done()
        })
      })
    })
  }

  function iterator (filePath, done) {
    fs.readFile(filePath, function (err, buf) {
      if (err) return done(explain(err, 'bankai.assets: an error occured while reading file ' + filePath))
      var edgeName = path.relative(basedir, filePath)
      createEdge(edgeName, buf)
      done()
    })
  }
}
