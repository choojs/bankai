var ansi = require('ansi-escape-sequences')
var pinoColada = require('pino-colada')
var async = require('async-collection')
var stdout = require('stdout-stream')
var pumpify = require('pumpify')
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

    var bankaiOpts = {
      logStream: pumpify(pinoColada(), stdout),
      watch: false
    }
    var compiler = bankai(entry, bankaiOpts)
    var log = compiler.log

    created(basedir, outdir + '/')

    compiler.on('error', function (topic, sub, err) {
      log.error(`${topic}:${sub}`, err)
    })

    compiler.on('change', function (nodeName, edgeName, nodeState) {
      var stepName = nodeName + ':' + edgeName
      if (stepName === 'assets:list') writeMultiple('assets')
      if (stepName === 'documents:list') writeMultiple('documents')
    })

    compiler.manifest(writeSimple('manifest.json', 'manifest'))
    compiler.serviceWorker(writeSingle('service-worker.js', 'service-worker'))
    compiler.style(writeSingle('bundle.css', 'style'))
    compiler.scripts('bundle.js', writeSingle('bundle.js', 'scripts'))

    function writeMultiple (step) {
      var node = compiler.graph.data[step].list
      var list = String(node.buffer).split(',')
      async.mapLimit(list, 3, iterator, function (err) {
        if (err) return log.error(err)
        completed(step)
      })

      // TODO: It'd be sick if we could optimize our paths to assets,
      // add etags to our tags and put them in the right dir.
      function iterator (filename, done) {
        if (filename === '/') filename = 'index.html'
        compiler[step](filename, function (err, node) {
          if (err) return done(err)
          filename = path.join(outdir, filename)
          var dirname = utils.dirname(filename)
          if (dirname === filename) {
            fs.writeFile(filename, node.buffer, function (err) {
              if (err) return done(err)
              created(basedir, filename)
              done()
            })
          } else {
            mkdirp(dirname, function (err) {
              if (err) return done(err)
              fs.writeFile(filename, node.buffer, function (err) {
                if (err) return done(err)
                created(basedir, filename)
                done()
              })
            })
          }
        })
      }
    }

    function writeSimple (filename, type) {
      return function (err, node) {
        if (err) return log.error(err)
        filename = path.join(outdir, filename)
        fs.writeFile(filename, node.buffer, function (err) {
          if (err) return log.error(err)
          created(basedir, filename)
          completed(type)
        })
      }
    }

    function writeSingle (filename, type) {
      return function (err, node) {
        if (err) return log.error(err)
        var dirname = path.join(outdir, node.hash)
        mkdirp(dirname, function (err) {
          if (err) return log.error(err)
          filename = path.join(dirname, filename)
          fs.writeFile(filename, node.buffer, function (err) {
            if (err) return log.error(err)
            created(basedir, filename)
            completed(type)
          })
        })
      }
    }

    function created (basedir, filename) {
      var relative = path.relative(process.cwd(), filename)
      relative = /\.{1,2}\//.test(relative) ? relative : './' + relative
      log.info(`${clr('created', 'magenta')}: ${relative}`)
    }

    function completed (step) {
      log.debug(`${clr('completed', 'green')}: ${step}`)
    }
  })
}

function clr (text, color) {
  return process.stdout.isTTY ? ansi.format(text, color) : text
}
