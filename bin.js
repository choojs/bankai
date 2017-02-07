#!/usr/bin/env node

var explain = require('explain-error')
var pinoColada = require('pino-colada')
var mapLimit = require('map-limit')
var serverSink = require('server-sink')
var resolve = require('resolve')
var mkdirp = require('mkdirp')
var subarg = require('subarg')
var xtend = require('xtend')
var http = require('http')
var path = require('path')
var pino = require('pino')
var pump = require('pump')
var opn = require('opn')
var fs = require('fs')

var bankai = require('./')
var pretty = pinoColada()
var log = pino({ name: 'bankai', level: 'debug' }, pretty)
pretty.pipe(process.stdout)

var argv = subarg(process.argv.slice(2), {
  string: [ 'open', 'port', 'assets' ],
  boolean: [ 'optimize', 'verbose', 'help', 'version', 'debug', 'electron' ],
  default: {
    assets: 'assets',
    optimize: false,
    open: false,
    port: 8080,
    debug: false
  },
  alias: {
    assets: 'a',
    css: 'c',
    debug: 'd',
    electron: 'e',
    help: 'h',
    html: 'H',
    js: 'j',
    open: 'o',
    optimize: 'O',
    port: 'p',
    verbose: 'V',
    version: 'v'
  }
})

var usage = `
  Usage:
    $ bankai <command> [options]

  Commands:
    <default>                      Run 'bankai start'
    start <filename>               Start a bankai server
    build <filename> <directory>   Compile and export files to a directory

    Options:
      -a, --assets=<directory>  Serve static assets [default: assets]
      -c, --css=<subargs>     Pass subarguments to sheetify
      -d, --debug             Include sourcemaps [default: false]
      -e, --electron          Enable electron mode for the bundler
      -h, --help              Print usage
      -H, --html=<subargs>    Pass subarguments to create-html
      -j, --js=<subargs>      Pass subarguments to browserify
      -o, --open=<browser>    Open html in a browser [default: system default]
      -O, --optimize          Optimize assets served by bankai [default: false]
      -p, --port=<n>          Bind bankai to a port [default: 8080]
      -V, --verbose           Include debug messages

  Examples:
    $ bankai index.js -p 8080            # start bankai on port 8080
    $ bankai index.js --open             # open html in the browser
    $ bankai -c [ -u sheetify-cssnext ]  # use cssnext in sheetify
    $ bankai -j [ -t brfs ]              # use brfs in browserify
    $ bankai build index.js dist/        # compile and export to dist/
    $ bankai build -O index.js dist/     # optimize compiled files
`

main(argv)

function main (argv) {
  if ((argv._[0] !== 'build') && (argv._[0] !== 'start')) {
    argv._.unshift('start')
  }
  var cmd = argv._[0]
  var _entry = argv._[1] || 'index.js'
  var localEntry = './' + _entry.replace(/^.\//, '')
  var entry = resolve.sync(localEntry, { basedir: process.cwd() })
  var outputDir = argv._[2] || 'dist'

  if (argv.h) {
    log.info(usage)
    return process.exit()
  }

  if (argv.v) {
    log.info(require('../package.json').version)
    return process.exit()
  }

  if (cmd === 'start') {
    start(entry, argv, handleError)
  } else if (cmd === 'build') {
    build(entry, outputDir, argv, handleError)
  } else {
    log.error(usage)
    return process.exit(1)
  }

  function handleError (err) {
    if (err) log.error(err)
  }
}

function start (entry, argv, done) {
  var assets = bankai(entry, argv)
  var staticAsset = new RegExp('/' + argv.assets)
  var port = argv.port

  var server = http.createServer(handler)
  server.listen(port, onlisten)

  function handler (req, res) {
    var sink = serverSink(req, res, function (msg) {
      log.info(msg)
    })

    if (req.url === '/') {
      assets.html(req, res).pipe(sink)
    } else if (req.url === '/bundle.js') {
      assets.js(req, res).pipe(sink)
    } else if (req.url === '/bundle.css') {
      assets.css(req, res).pipe(sink)
    } else if (req.headers['accept'].indexOf('html') > 0) {
      assets.html(req, res).pipe(sink)
    } else if (staticAsset.test(req.url)) {
      assets.static(req, res).pipe(sink)
    } else {
      res.writeHead(404, 'Not Found')
      sink.end()
    }
  }

  function onlisten () {
    var relative = path.relative(process.cwd(), entry)
    var addr = 'http://localhost:' + port
    log.info('Started for ' + relative + ' on ' + addr)
    if (argv.open !== false) {
      var app = (argv.open.length) ? argv.open : 'system browser'
      opn(addr, { app: argv.open || null })
        .catch(function (err) {
          done(explain(err, `err running ${app}`))
        })
        .then(done)
    }
  }
}

function build (entry, outputDir, argv, done) {
  log.info('bundling assets')

  argv = xtend({ watch: false }, argv)

  mkdirp.sync(outputDir)
  buildStaticAssets(entry, outputDir, argv, done)

  var assets = bankai(entry, argv)
  var files = [ 'index.html', 'bundle.js', 'bundle.css' ]

  mapLimit(files, Infinity, iterator, done)
  function iterator (file, done) {
    var fileStream = fs.createWriteStream(path.join(outputDir, file))
    var sourceStream = assets[file.replace(/^.*\./, '')]()
    log.debug(file + ' started')
    pump(sourceStream, fileStream, function (err) {
      log.info(file + ' done')
      done(err)
    })
  }
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
