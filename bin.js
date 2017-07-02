#!/usr/bin/env node

var hyperstream = require('hyperstream')
var fromString = require('from2-string')
var pinoColada = require('pino-colada')
var parallel = require('run-parallel')
var explain = require('explain-error')
var concat = require('concat-stream')
var mapLimit = require('map-limit')
var purify = require('purify-css')
var resolve = require('resolve')
var mkdirp = require('mkdirp')
var subarg = require('subarg')
var tmp = require('temp-path')
var from = require('from2')
var disc = require('disc')
var open = require('open')
var path = require('path')
var pino = require('pino')
var pump = require('pump')
var zlib = require('zlib')
var fs = require('fs')

var htmlMinifyStream = require('./lib/html-minify-stream')
var start = require('./bin/start')
var bankai = require('./')

var pretty = pinoColada()
pretty.pipe(process.stdout)

var argv = subarg(process.argv.slice(2), {
  string: [ 'open', 'port', 'assets' ],
  boolean: [ 'watch', 'verbose', 'help', 'version', 'debug', 'electron' ],
  default: {
    address: 'localhost',
    assets: 'assets',
    debug: false,
    open: false,
    port: 8080
  },
  alias: {
    address: 'A',
    assets: 'a',
    css: 'c',
    debug: 'd',
    electron: 'e',
    help: 'h',
    html: 'H',
    js: 'j',
    open: 'o',
    port: 'p',
    verbose: 'V',
    version: 'v',
    watch: 'w'
  }
})

var usage = `
  Usage:
    $ bankai <command> [options]

  Commands:
    <default>                      Run 'bankai start'
    start <filename>               Start a bankai server
    build <filename> <directory>   Compile and export files to a directory
    inspect <filename>             Visualize the dependency tree

    Options:
      -a, --assets=<directory>  Serve static assets [default: assets]
      -A, --address=<ip>      Ip address to listen [default: localhost]
      -c, --css=<subargs>     Pass subarguments to sheetify
      -d, --debug             Include sourcemaps [default: false]
      -e, --electron          Enable electron mode for the bundler
      -h, --help              Print usage
      -H, --html=<subargs>    Pass subarguments to create-html
      -j, --js=<subargs>      Pass subarguments to browserify
      -o, --open=<browser>    Open html in a browser [default: system default]
      -p, --port=<n>          Bind bankai to a port [default: 8080]
      -V, --verbose           Include debug messages
      -w, --watch <bool>      Toggle watch mode

  Examples:
    $ bankai index.js -p 8080            # start bankai on port 8080
    $ bankai index.js --open             # open html in the browser
    $ bankai -c [ -u sheetify-cssnext ]  # use cssnext in sheetify
    $ bankai -j [ -t brfs ]              # use brfs in browserify
    $ bankai build index.js dist/        # compile and export to dist/

  Examples:
    bankai example.js --open=firefox-aurora -p 3000
    bankai example.js --debug -w false
`

main(argv)

function main (argv) {
  if ((argv._[0] !== 'build') && (argv._[0] !== 'start') && argv._[0] !== 'inspect') {
    argv._.unshift('start')
  }

  if (argv.h) {
    console.log(usage)
    return process.exit()
  } else if (argv.v) {
    console.log(require('./package.json').version)
    return process.exit()
  }

  var cmd = argv._[0]
  var _entry = argv._[1] || 'index.js'
  var localEntry = './' + _entry.replace(/^.\//, '')
  var entry = resolve.sync(localEntry, { basedir: process.cwd() })
  var outputDir = argv._[2] || 'dist'

  var logLevel = argv.verbose ? 'debug' : 'info'
  argv.log = pino({ name: 'bankai', level: logLevel }, pretty)

  if (cmd === 'start') {
    start(entry, argv, handleError)
  } else if (cmd === 'build') {
    build(entry, outputDir, argv, handleError)
  } else if (cmd === 'inspect') {
    inspect(entry, argv, handleError)
  } else {
    argv.log.error(usage)
    return process.exit(1)
  }

  function handleError (err) {
    if (err) {
      if (argv.verbose) throw err
      else argv.log.error(err)
    }
  }
}

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

  mapLimit(files, Infinity, iterator, function (err) {
    if (err) return done(explain(err, 'error iterating over files'))
    parallel([ buildHtml, buildJs, buildCss ], done)
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
