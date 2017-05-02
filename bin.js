#!/usr/bin/env node

var hyperstream = require('hyperstream')
var fromString = require('from2-string')
var pinoColada = require('pino-colada')
var parallel = require('run-parallel')
var explain = require('explain-error')
var concat = require('concat-stream')
var mapLimit = require('map-limit')
var purify = require('purify-css')
var logHttp = require('log-http')
var uglify = require('uglify-js')
var resolve = require('resolve')
var mkdirp = require('mkdirp')
var subarg = require('subarg')
var tmp = require('temp-path')
var from = require('from2')
var disc = require('disc')
var http = require('http')
var open = require('open')
var path = require('path')
var pino = require('pino')
var pump = require('pump')
var zlib = require('zlib')
var fs = require('fs')

var htmlMinifyStream = require('./lib/html-minify-stream')
var zlibMaybe = require('./lib/gzip-maybe')
var Sse = require('./lib/sse')
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
    port: 8080,
    uglify: true
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
    uglify: 'u',
    open: 'o',
    port: 'p',
    verbose: 'V',
    version: 'v',
    watch: 'w'
  }
})

var logLevel = argv.verbose ? 'debug' : 'info'
var log = pino({ name: 'bankai', level: logLevel }, pretty)

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
      -u, --uglify <bool>     Toggle uglifyify. [default: true]

  Examples:
    $ bankai index.js -p 8080            # start bankai on port 8080
    $ bankai index.js --open             # open html in the browser
    $ bankai -c [ -u sheetify-cssnext ]  # use cssnext in sheetify
    $ bankai -j [ -t brfs ]              # use brfs in browserify
    $ bankai build index.js dist/        # compile and export to dist/

  Notes:
    When specifying both --watch and --uglify using the long form, you must omit
    the = when specifying them to be turned off.

  Examples:
    bankai example.js --open=firefox-aurora -p 3000
    bankai example.js --uglify false -w false
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
    console.log(require('../package.json').version)
    return process.exit()
  }

  var cmd = argv._[0]
  var _entry = argv._[1] || 'index.js'
  var localEntry = './' + _entry.replace(/^.\//, '')
  var entry = resolve.sync(localEntry, { basedir: process.cwd() })
  var outputDir = argv._[2] || 'dist'

  if (cmd === 'start') {
    start(entry, argv, handleError)
  } else if (cmd === 'build') {
    build(entry, outputDir, argv, handleError)
  } else if (cmd === 'inspect') {
    inspect(entry, argv, handleError)
  } else {
    log.error(usage)
    return process.exit(1)
  }

  function handleError (err) {
    if (err) log.error(err)
  }
}

function start (entry, argv, done) {
  // always enable watch for start
  log.debug('running command: start')
  argv.watch = true

  var assets = bankai(entry, argv)
  var staticAsset = new RegExp('/' + argv.assets)
  var address = argv.address
  var port = argv.port
  var sse = Sse(assets)

  assets.on('js-bundle', function () {
    log.info('bundle:js')
  })

  assets.on('css-bundle', function () {
    log.info('bundle:css')
  })

  var server = http.createServer(handler)
  server.listen(port, address, onlisten)

  var stats = logHttp(server)
  stats.on('data', function (level, data) {
    log[level](data)
  })

  function handler (req, res) {
    var url = req.url
    log.debug('received request on url: ' + url)
    if (url === '/') {
      assets.html(req, res).pipe(zlibMaybe(req, res)).pipe(res)
    } else if (url === '/sse') {
      sse(req, res)
    } else if (url === '/bundle.js') {
      assets.js(req, res).pipe(zlibMaybe(req, res)).pipe(res)
    } else if (url === '/bundle.css') {
      assets.css(req, res).pipe(zlibMaybe(req, res)).pipe(res)
    } else if (req.headers['accept'].indexOf('html') > 0) {
      assets.html(req, res).pipe(zlibMaybe(req, res)).pipe(res)
    } else if (staticAsset.test(url)) {
      assets.static(req).pipe(res)
    } else {
      res.writeHead(404, 'Not Found')
      res.end()
    }
  }

  function onlisten () {
    var relative = path.relative(process.cwd(), entry)
    var addr = 'http://' + address + ':' + port
    log.info('Started for ' + relative + ' on ' + addr)
    if (argv.open !== false) {
      var app = argv.open.length ? argv.open : ''
      open(addr, app, function (err) {
        if (err) return done(explain(err, `err running ${app}`))
        done()
      })
    }
  }
}

function build (entry, outputDir, argv, done) {
  log.debug('running command: build')

  // cast argv.watch to a boolean
  argv.watch = argv.watch === undefined ? false : argv.watch

  mkdirp.sync(outputDir)
  buildStaticAssets(entry, outputDir, argv, done)

  var buffers = {}
  var assets = bankai(entry, argv)
  var files = ['index.html', 'bundle.js', 'bundle.css']

  mapLimit(files, Infinity, iterator, function (err) {
    if (err) return done(err)
    parallel([ buildHtml, buildJs, buildCss ], done)
  })

  function iterator (file, done) {
    var source = assets[file.replace(/^.*\./, '')]()
    log.debug(file + ' started')

    var sink = concat(function (buf) {
      buffers[file] = buf
    })
    pump(source, sink, done)
  }

  function buildHtml (done) {
    var file = 'index.html'
    var buf = buffers[file]
    var outfile = path.join(outputDir, file)

    var sink = fs.createWriteStream(outfile)
    var source = hyperstream()
    source.end(buf)

    pump(source, htmlMinifyStream(), sink, done)
    printSize(buf, outfile, function (err) {
      if (err) return done(err)
    })
  }

  function buildCss (done) {
    var css = buffers['bundle.css'].toString()
    var js = buffers['bundle.js'].toString()
    css = purify(js, css, { minify: true })

    var outfile = path.join(outputDir, 'bundle.css')
    var sink = fs.createWriteStream(outfile)
    var source = fromString(css)

    pump(source, sink, done)
    printSize(Buffer.from(css), outfile, function (err) {
      if (err) return done(err)
    })
  }

  function buildJs (done) {
    var file = 'bundle.js'
    var buf = buffers[file]
    var js = buf.toString()

    // FIXME argv.uglify should always be a bool
    if (argv.uglify !== false && argv.uglify !== 'false') {
      log.debug('uglify starting')
      js = uglify.minify(js, {
        fromString: true,
        compress: true,
        mangle: true,
        filename: file,
        sourceMaps: false
      })
      log.debug('uglify finished')
      buf = Buffer.from(js.code)
    }

    var outfile = path.join(outputDir, 'bundle.js')
    log.debug('writing to file ' + outfile)
    var sink = fs.createWriteStream(outfile)
    var source = from([buf])

    pump(source, sink, done)
    printSize(buf, outfile, function (err) {
      if (err) return done(err)
    })
  }
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
      log.debug(relativeName + ' started')
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

function inspect (entry, argv, done) {
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
