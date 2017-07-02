var tmp = require('temp-path')
var open = require('open')
var disc = require('disc')
var pump = require('pump')
var fs = require('fs')

var bankai = require('../')

module.exports = inspect

function inspect (entry, argv, done) {
  var log = argv.log

  argv.watch = false
  argv.js = argv.js || {}
  argv.js.fullPaths = true

  var assets = bankai(entry, argv)
  var js = assets.js()
  var filename = tmp() + '.html'

  var ws = fs.createWriteStream(filename)
  var d = disc()
  pump(js, d, function (err) {
    if (err) return done(err)
  })

  pump(d, ws, function (err) {
    if (err) return done(err)
    log.info('Opening ' + filename)
    open(filename)
  })
}
