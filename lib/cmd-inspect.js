var disc = require('disc')
var open = require('open')
var path = require('path')
var pump = require('pump')
var os = require('os')
var fs = require('fs')

var bankai = require('../')

module.exports = inspect

function inspect (entry, argv, done) {
  var assets = bankai(entry, {
    watch: false,
    fullPaths: true
  })

  assets.scripts('bundle.js', function (err, node) {
    if (err) return done(err)

    var filename = tmp() + '.html'
    var ws = fs.createWriteStream(filename)
    var d = disc()

    pump(d, ws, function (err) {
      if (err) return done(err)
      open(filename)
    })

    d.end(node.buffer)
  })
}

function tmp () {
  var file = String(Date.now())
  return path.join(os.tmpdir(), file)
}
