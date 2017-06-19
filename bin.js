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
var uglify = require('uglify-es')
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
var detectRouter = require('./lib/detect-router')
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

// Optimize the build output and write it to disk
// 1. We stream out the individual files out to buffers
// 2. We optimize each individual buffer using knowledge of the other buffers
// 3. We stream each buffer to disk
function build (entry, outputDir, argv, done) {
  log.debug('running command: build')

  // cast argv.watch to a boolean
  argv.watch = argv.watch === undefined ? false : argv.watch
  argv.assert = false

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
    log.debug('casting to buffer ' + file)

    var sink = concat(function (buf) {
      buffers[file] = buf
    })
    pump(source, sink, done)
  }

  // Render HTML to disk
  // 1. Figure out if we know the router used, and get a kv object with routes
  // 2. Mount the resulting HTML on the body tag
  // 3. Pipe through html optimizer and to disk
  function buildHtml (done) {
    log.debug('building html')
    var file = 'index.html'
    var buf = buffers[file]

    var routes = detectRouter(require(entry))
    routes = routes || { '/': buf.toString() }
    var keys = Object.keys(routes)
    mapLimit(keys, Infinity, iterator, done)

    function iterator (route, done) {
      var html = routes[route]
      route = route === '/' ? 'index.html' : route + '.html'
      log.debug('building html: ' + route)

      var outfile = path.join(outputDir, route)
      var sink = fs.createWriteStream(outfile)

      var source = hyperstream({ body: { _html: html } })
      source.end(buf)

      pump(source, htmlMinifyStream(), sink, done)
      printSize(buf, outfile, function (err) {
        if (err) return done(err)
      })
    }
  }

  function buildCss (done) {
    log.debug('building css')
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
    log.debug('building js')
    var file = 'bundle.js'
    var buf = buffers[file]
    var js = buf.toString()
    var uglifyOpts = {
      mangle: {
        properties: true
      },
      compress: {
        unsafe: true,
        properties: true,
        dead_code: true,
        comparisons: true,
        evaluate: true,
        hoist_funs: true,
        if_returns: true,
        join_vars: true,
        pure_getters: true,
        reduce_vars: true,
        collapse_vars: true
      },
      toplevel: true
    }

    log.debug('uglify starting')
    if (argv.debug) uglifyOpts.sourceMap.filename = file
    js = uglify.minify(js, uglifyOpts)
    log.debug('uglify finished')
    buf = Buffer.from(js.code || '')

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
