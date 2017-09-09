var mkdirp = require('mkdirp')
var path = require('path')
var fs = require('fs')

var bankai = require('../')
var utils = require('./utils')

module.exports = build

function build (entry, opts) {
  var basedir = utils.dirname(entry)
  var outdir = path.join(basedir, 'dist')

  mkdirp(outdir, function (err) {
    if (err) return console.error(err)
    console.log('Created ' + path.relative(process.cwd(), outdir) + '/')

    var compiler = bankai(entry, { watch: false })

    compiler.on('error', function (error) {
      console.error('error compiling', error)
    })

    compiler.on('change', function (nodeName, edgeName, nodeState) {
      console.log(nodeName + ':' + edgeName + ' changed')
    })

    compiler.manifest(writeSingle('manifest.json'))
    compiler.serviceWorker(writeSingle('service-worker.js'))
    compiler.style(writeSingle('bundle.css'))

    // // TODO: iterate over all scripts
    // compiler.script(name, function (err, node) {
    //   if (err) return console.error(err)
    // })

    // // TODO: iterate over all assets
    // compiler.asset(name, function (err, node) {
    //   if (err) return console.error(err)
    // })

    // // TODO: iterate over all documents
    // compiler.document(url, function (err, node) {
    //   if (err) return console.error(err)
    // })

    function writeSingle (filename) {
      return function (err, node) {
        if (err) return console.error(err)
        var dirname = path.join(outdir, node.hash)
        mkdirp(dirname, function (err) {
          if (err) return console.error(err)
          filename = path.join(dirname, filename)
          fs.writeFile(filename, node.buffer, function (err) {
            if (err) return console.error(err)
            console.log(filename + ' done')
          })
        })
      }
    }
  })
}
