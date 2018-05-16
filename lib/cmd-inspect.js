var disc = require('disc')
var open = require('opn')
var path = require('path')
var pump = require('pump')
var os = require('os')
var fs = require('fs')

var bankai = require('../')

module.exports = inspect

function inspect (entry, argv) {
  var compiler = bankai(entry, {
    watch: false,
    fullPaths: true
  })

  compiler.on('error', function (topic, sub, err) {
    console.error('\n ' + topic + ':' + sub + '\n', err.stack, '\n')
  })

  compiler.scripts('bundle.js', function (err, node) {
    if (err) return exit(err)

    var filename = tmp() + '.html'
    var ws = fs.createWriteStream(filename)
    var d = disc()

    pump(d, ws, function (err) {
      if (err) return exit(err)
      console.log(filename)
      open(filename)
    })

    d.end(node.buffer)
  })
}

function tmp () {
  var file = String(Date.now())
  return path.join(os.tmpdir(), file)
}

function exit (err) {
  console.error(err.message)
  process.exit(1)
}
