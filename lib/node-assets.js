var readdir = require('recursive-readdir')
var async = require('async-collection')
var explain = require('explain-error')
var assert = require('assert')
var path = require('path')
var fs = require('fs')

var READ_CONCURRENCY = 3

module.exports = node

function node (state, createEdge) {
  assert.equal(typeof state.arguments.entry, 'string', 'bankai/node-assets: state.arguments.entries should be type string')

  var self = this
  var entry = state.arguments.entry
  var basedir = path.dirname(entry)
  var assetsdir = path.join(basedir, 'assets')

  // The 'assets/' dir is not guaranteed to exist.
  fs.access(assetsdir, function (err) {
    if (err) return

    readdir(assetsdir, function (err, list) {
      if (err) return self.emit('error', explain(err, 'bankai.assets: an error occured in recursive-readdir while reading ' + assetsdir))

      async.mapLimit(list, READ_CONCURRENCY, iterator, function (err) {
        if (err) return self.emit('error', err)

        // 'buffer-graph' only accepts Buffers. Turn our array into a csv.
        var csv = list.join(',')
        createEdge('list', Buffer.from(csv))
      })

      function iterator (filePath, done) {
        fs.readFile(filePath, function (err, buf) {
          if (err) return done(explain(err, 'bankai.assets: an error occured while reading file ' + filePath))
          var edgeName = path.relative(basedir, filePath)
          createEdge(edgeName, buf)
          done()
        })
      }
    })
  })
}
