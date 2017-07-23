var hyperstream = require('hyperstream')
var fromString = require('from2-string')
var parallel = require('run-parallel')
var explain = require('explain-error')
var concat = require('concat-stream')
var mapLimit = require('map-limit')
var purify = require('purify-css')
var mkdirp = require('mkdirp')
var from = require('from2')
var path = require('path')
var pump = require('pump')
var zlib = require('zlib')
var fs = require('fs')

var htmlMinifyStream = require('../lib/html-minify-stream')
var bankai = require('../')

module.exports = build

function build (entry, outputDir, argv, done) {
  var log = argv.log
  log.debug('running command: build')

  // cast argv.watch to a boolean
  argv.watch = argv.watch === undefined ? false : argv.watch
  argv.assert = false

  mkdirp.sync(outputDir)
  buildStaticAssets(entry, outputDir, argv, done)

  var buffers = {}
  var assets = bankai(entry, argv)
  var files = fs.existsSync(path.join(process.cwd(), 'index.html'))
    ? ['bundle.js', 'bundle.css']
    : ['index.html', 'bundle.js', 'bundle.css']

  // Write to disk during watch mode
  if (argv.watch) {
    assets.on('js-bundle', function () {
      log.info('bundle:js')
      iterator('bundle.js', function (err) {
        if (err) return log.error(explain(err), 'error bundling JS')
        buildJs(function (err) {
          if (err) log.error(explain(err), 'error building JS')
        })
      })
    })

    assets.on('css-bundle', function () {
      log.info('bundle:css')
      iterator('bundle.css', function (err) {
        if (err) return log.error(explain(err), 'error bundling CSS')
        buildCss(function (err) {
          if (err) log.error(explain(err), 'error writing CSS')
        })
      })
    })
  }

  mkdirp(outputDir, function (err) {
    if (err) return done(explain(err, 'error creating directory'))
    mapLimit(files, Infinity, iterator, function (err) {
      if (err) return done(explain(err, 'error iterating over files'))
      parallel([ buildHtml, buildJs, buildCss ], done)
    })
  })

  function iterator (filename, done) {
    log.debug('processing file: ' + filename)
    var source = assets[filename.replace(/^.*\./, '')]()

    var sink = concat(function (buf) {
      buffers[filename] = buf
    })
    pump(source, sink, done)
  }

  function buildHtml (done) {
    var file = 'index.html'
    var outfile = path.join(outputDir, file)
    var source
    var buf

    var sink = fs.createWriteStream(outfile)
    if (fs.existsSync(path.join(process.cwd(), 'index.html'))) {
      source = fs.createReadStream(path.join(process.cwd(), 'index.html'))
      var sizeStream = concat(function (buf) {
        printSize(buf, outfile, function (err) {
          if (err) return done(err)
        })
      })
      source.pipe(sizeStream)
      pump(source, htmlMinifyStream(), sink, done)
    } else {
      buf = buffers[file]
      source = hyperstream()
      source.end(buf)
      pump(source, htmlMinifyStream(), sink, done)
      printSize(buf, outfile, function (err) {
        if (err) return done(err)
      })
    }
  }

  function buildCss (done) {
    var css = String(buffers['bundle.css'])
    var js = String(buffers['bundle.js'])
    css = purify(js, css, { minify: true })

    var outfile = path.join(outputDir, 'bundle.css')
    var sink = fs.createWriteStream(outfile)
    var source = fromString(css)

    log.debug('writing to file ' + outfile)
    pump(source, sink, done)
    printSize(Buffer.from(css), outfile, function (err) {
      if (err) return done(err)
    })
  }

  function buildJs (done) {
    var file = 'bundle.js'
    var buf = buffers[file]
    var outfile = path.join(outputDir, 'bundle.js')
    log.debug('writing to file ' + outfile)
    var sink = fs.createWriteStream(outfile)
    var source = from([buf])

    pump(source, sink, done)
    printSize(buf, outfile, function (err) {
      if (err) return done(err)
    })
  }

  function printSize (buf, outfile, done) {
    zlib.deflate(buf, function (err, buf) {
      if (err) return done(err)
      var length = buf.length
      var location = path.relative(process.cwd(), outfile)
      // Warn if serving up more than 60kb in {html,css,js}
      var level = buf.length < 60000 ? 'info' : 'warn'
      var msg = level === 'warn' ? location + ' (large)' : location
      log[level]({
        message: msg,
        contentLength: length
      })
    })
  }

  function buildStaticAssets (entry, outputDir, argv, done) {
    var src = path.join(path.dirname(entry), argv.assets)
    var dest = path.join(path.dirname(entry), outputDir, argv.assets)
    if (fs.existsSync(src)) copy(src, dest)

    function copy (src, dest) {
      if (!fs.statSync(src).isDirectory()) {
        var relativeName = path.relative(path.join(argv.assets, '../'), src)
        log.debug('writing to file ' + dest)
        return pump(fs.createReadStream(src), fs.createWriteStream(dest), function (err) {
          if (err) {
            log.error(relativeName + ' error')
            return done(err)
          }
          log.info(relativeName + ' done')
          done()
        })
      }
      if (!fs.existsSync(dest)) fs.mkdirSync(dest)
      var files = fs.readdirSync(src)
      for (var i = 0; i < files.length; i++) {
        copy(path.join(src, files[i]), path.join(dest, files[i]))
      }
    }
  }
}
