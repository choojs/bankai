var async = require('async-collection')
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
      var stepName = nodeName + ':' + edgeName
      console.log(nodeName + ':' + edgeName + ' changed')
      if (stepName === 'assets:list') writeMultiple('assets')
      if (stepName === 'documents:list') writeMultiple('documents')
    })

    compiler.manifest(writeSimple('manifest.json'))
    compiler.serviceWorker(writeSingle('service-worker.js'))
    compiler.style(writeSingle('bundle.css'))
    compiler.scripts('bundle.js', writeSingle('bundle.js'))

    function writeMultiple (step) {
      var node = compiler.graph.data[step].list
      var list = String(node.buffer).split(',')
      async.mapLimit(list, 3, iterator, function (err) {
        if (err) return console.error(err)
        console.log('done writing', step)
      })

      // TODO: It'd be sick if we could optimize our paths to assets,
      // add etags to our tags and put them in the right dir.
      function iterator (filename, done) {
        if (filename === '/') filename = 'index.html'
        console.log(filename)
        compiler[step](filename, function (err, node) {
          if (err) return done(err)
          filename = path.join(outdir, filename)
          var dirname = utils.dirname(filename)
          if (dirname === filename) {
            console.log('writing ' + filename)
            fs.writeFile(filename, node.buffer, done)
          } else {
            mkdirp(dirname, function (err) {
              if (err) return done(err)
              console.log('writing ' + filename)
              fs.writeFile(filename, node.buffer, done)
            })
          }
        })
      }
    }

    // // TODO: iterate over all documents
    // compiler.document(url, function (err, node) {
    //   if (err) return console.error(err)
    // })

    function writeSimple (filename) {
      return function (err, node) {
        if (err) return console.error(err)
        filename = path.join(outdir, filename)
        fs.writeFile(filename, node.buffer, function (err) {
          if (err) return console.error(err)
          console.log(filename + ' done')
        })
      }
    }

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
