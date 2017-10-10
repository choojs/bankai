var ansi = require('ansi-escape-sequences')
var pinoColada = require('pino-colada')
var async = require('async-collection')
var stdout = require('stdout-stream')
var pumpify = require('pumpify')
var iltorb = require('iltorb')
var mkdirp = require('mkdirp')
var path = require('path')
var zlib = require('zlib')
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
      assert: false,
      watch: false
    }
    var compiler = bankai(entry, bankaiOpts)
    var log = compiler.log

    log.info('Compiling & compressing files\n')
    created(basedir, outdir + '/')

    compiler.on('error', function (topic, sub, err) {
      if (err.pretty) log.error(err.pretty)
      else {
        log.error(`${topic}:${sub} ${err.message}\n${err.stack}`)
      }
    })

    compiler.on('ssr', function (result) {
      if (!result.success) log.warn('Server Side Rendering Skipped due to error: ' + result.error.message)
    })

    compiler.on('change', function (nodeName, edgeName, nodeState) {
      var stepName = nodeName + ':' + edgeName
      if (stepName === 'assets:list') writeAssets('assets')
      if (stepName === 'documents:list') writeDocuments('documents')
      if (stepName === 'service-worker:bundle') {
        var filename = compiler.graph.metadata.serviceWorker
        compiler.serviceWorker(writeSimple(filename, 'service-worker'))
      }
    })

    compiler.manifest(writeSimple('manifest.json', 'manifest'))
    compiler.style(writeSingle('bundle.css', 'style'))
    compiler.scripts('bundle.js', writeSingle('bundle.js', 'scripts'))

    function writeAssets (step) {
      var node = compiler.graph.data[step].list
      var list = String(node.buffer).split(',')
      async.mapLimit(list, 3, iterator, function (err) {
        if (err) return log.error(err)
        completed(step)
      })

      // TODO: It'd be sick if we could optimize our paths to assets,
      // add etags to our tags and put them in the right dir.
      function iterator (filename, done) {
        compiler[step](filename, function (err, node) {
          if (err) return done(err)
          filename = path.join(outdir, filename)
          var dirname = utils.dirname(filename)
          if (dirname === filename) {
            writePlain(filename, node.buffer, done)
          } else {
            mkdirp(dirname, function (err) {
              if (err) return done(err)
              writePlain(filename, node.buffer, done)
            })
          }
        })
      }
    }

    function writeDocuments (step) {
      var write = writeCompressed

      var node = compiler.graph.data[step].list
      var list = String(node.buffer).split(',')
      async.mapLimit(list, 3, iterator, function (err) {
        if (err) return log.error(err)
        completed(step)
      })

      // TODO: It'd be sick if we could optimize our paths to assets,
      // add etags to our tags and put them in the right dir.
      function iterator (filename, done) {
        // if (filename === '/') filename = 'index.html'

        // skip over all partial files
        if (/[:*]/.test(filename)) return done()
        compiler[step](filename, function (err, node) {
          if (err) return done(err)
          filename = path.join(outdir, filename, 'index.html')
          var dirname = utils.dirname(filename)
          if (dirname === filename) {
            write(filename, node.buffer, done)
          } else {
            mkdirp(dirname, function (err) {
              if (err) return done(err)
              write(filename, node.buffer, done)
            })
          }
        })
      }
    }

    function writeSimple (filename, type) {
      return function (err, node) {
        if (err) return log.error(err)
        filename = path.join(outdir, filename)
        writeCompressed(filename, node.buffer, function (err) {
          if (err) return log.error(err)
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
          writeCompressed(filename, node.buffer, function (err) {
            if (err) return log.error(err)
            completed(type)
          })
        })
      }
    }

    function created (basedir, filename) {
      var relative = path.relative(process.cwd(), filename)
      log.info(`${clr('created', 'magenta')}: ${relative}`)
    }

    function completed (step) {
      log.debug(`${clr('completed', 'green')}: ${step}`)
    }

    function writeCompressed (filename, buffer, done) {
      async.series([
        function raw (done) {
          fs.writeFile(filename, buffer, function (err) {
            if (err) return done(err)
            created(basedir, filename)
            done()
          })
        },
        function gzip (done) {
          zlib.gzip(buffer, function (err, compressed) {
            if (err) return done(err)
            var outfile = filename + '.gz'
            fs.writeFile(outfile, compressed, function (err) {
              if (err) return done(err)
              created(basedir, outfile)
              done()
            })
          })
        },
        function deflate (done) {
          zlib.deflate(buffer, function (err, compressed) {
            if (err) return done(err)
            var outfile = filename + '.deflate'
            fs.writeFile(outfile, compressed, function (err) {
              if (err) return done(err)
              created(basedir, outfile)
              done()
            })
          })
        },
        function brotli (done) {
          iltorb.compress(buffer, function (err, compressed) {
            if (err) return done(err)
            var outfile = filename + '.br'
            fs.writeFile(outfile, compressed, function (err) {
              if (err) return done(err)
              created(basedir, outfile)
              done()
            })
          })
        }
      ], done)
    }

    function writePlain (filename, buffer, done) {
      fs.writeFile(filename, buffer, function (err) {
        if (err) return done(err)
        created(basedir, filename)
        done()
      })
    }
  })
}

function clr (text, color) {
  return process.stdout.isTTY ? ansi.format(text, color) : text
}
