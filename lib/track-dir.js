var EventEmitter = require('events').EventEmitter
var watchDirs = require('./utils').watchDirs
var readdir = require('recursive-readdir')
var async = require('async-collection')
var assert = require('assert')
var path = require('path')
var fs = require('fs')

var READ_CONCURRENCY = 3

// This is a data structure to keep track of a single directory, and expose
// all file names + sizes inside an object. It emits two events:
//
//   .on('error')    - Emitted when an error occurs.
//   .on('change')   - Emitted when files have changed, including init.
//   .on('progress') - Emitted when progress has been made reading.

module.exports = Tracker

function Tracker () {
  if (!(this instanceof Tracker)) return new Tracker()
  this._unwatch = null
  this.watching = false
  this.count = 0
  this.files = {}
  EventEmitter.call(this)
}
Tracker.prototype = Object.create(EventEmitter.prototype)

Tracker.prototype.start = function (basedir, dirnames, opts) {
  var list = [] // Initial list all files between all directories.
  var count = 0 // Amount of items done so far.
  opts = opts || {}
  var watch = opts.watch === undefined ? false : opts.watch

  assert.strictEqual(typeof basedir, 'string', 'lib/track-dir: basedir should be type string')
  assert.ok(Array.isArray(dirnames), 'lib/track-dir: basedir should be an Array')
  assert.strictEqual(this.watching, false, 'lib/track-dir: already watching a set of directories')

  // Read out all files in all directories once.
  async.mapLimit(dirnames, 1, init, function (err) {
    if (err) return self.emit('error', err)

    async.mapLimit(list, READ_CONCURRENCY, wrap, function (err) {
      if (err) return self.emit('error', err)
      self.emit('progress', 100)
      self.emit('change')
    })

    function wrap (filename, done) {
      readFile(filename, function (err) {
        if (err) return done(err)
        self.emit('progress', Math.trunc((count / list.length) * 100))
        done()
      })
    }
  })

  var self = this

  if (watch) {
    var unwatch = watchDirs(basedir, dirnames, function (filePath) {
      readFile(filePath, function (err) {
        if (err) return self.emit('error', err)
        self.emit('change')
      })
    })

    this.watching = true
    this._unwatch = unwatch.bind(unwatch)
  }

  // Run only once at the start of the pass.
  function init (dirname, done) {
    dirname = path.join(basedir, dirname)
    fs.access(dirname, function (err) {
      if (err) return done()
      readdir(dirname, function (err, _list) {
        if (err) return done(err)
        list = list.concat(_list)
        done()
      })
    })
  }

  // Read a file, and add it to this.files {}
  function readFile (filePath, done) {
    fs.stat(filePath, function (err, stat) {
      if (err) {
        delete self.files[filePath]
        done()
      } else {
        self.files[filePath] = stat
        done()
      }
    })
  }
}

Tracker.prototype.unwatch = function () {
  if (!this.watching) return
  this._unwatch()
}

Tracker.prototype.size = function () {
  var self = this
  return Object.keys(this.files).reduce(function (size, filename) {
    var file = self.files[filename]
    return size + file.size
  }, 0)
}

Tracker.prototype.list = function () {
  return Object.keys(this.files)
}
