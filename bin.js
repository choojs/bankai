#!/usr/bin/env node

var explain = require('explain-error')
var mapLimit = require('map-limit')
var resolve = require('resolve')
var garnish = require('garnish')
var mkdirp = require('mkdirp')
var subarg = require('subarg')
var bole = require('bole')
var http = require('http')
var path = require('path')
var pump = require('pump')
var opn = require('opn')
var fs = require('fs')

var bankai = require('./')

var argv = subarg(process.argv.slice(2), {
  string: [ 'open', 'port', 'assets' ],
  boolean: [ 'optimize', 'verbose', 'help', 'version', 'debug' ],
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
      -c, --css=<subargs>       Pass subarguments to sheetify
      -d, --debug               Include sourcemaps [default: false]
      -h, --help                Print usage
      -H, --html=<subargs>      Pass subarguments to create-html
      -j, --js=<subargs>        Pass subarguments to browserify
      -o, --open=<browser>      Open html in a browser [default: system default]
      -O, --optimize            Optimize assets served by bankai [default: false]
      -p, --port=<n>            Bind bankai to a port [default: 8080]
      -V, --verbose             Include debug messages

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
  startLogging(argv.verbose)

  if (argv.h) {
    console.info(usage)
    return process.exit()
  }

  if (argv.v) {
    console.info(require('../package.json').version)
    return process.exit()
  }

  if (cmd === 'start') {
    start(entry, argv, handleError)
  } else if (cmd === 'build') {
    build(entry, outputDir, argv, function (err) {
      if (err) throw err
      process.exit()
    })
  } else {
    console.error(usage)
    return process.exit(1)
  }

  function handleError (err) {
    if (err) throw err
  }
}

function start (entry, argv, done) {
  var assets = bankai(entry, argv)
  var staticAsset = new RegExp('/' + argv.assets)
  var port = argv.port

  http.createServer((req, res) => {
    switch (req.url) {
      case '/': return assets.html(req, res).pipe(res)
      case '/bundle.js': return assets.js(req, res).pipe(res)
      case '/bundle.css': return assets.css(req, res).pipe(res)
      default:
        if (req.headers['accept'].indexOf('html') > 0) {
          return assets.html(req, res).pipe(res)
        }
        if (staticAsset.test(req.url)) {
          return assets.static(req, res).pipe(res)
        }
        res.writeHead(404, 'Not Found')
        return res.end()
    }
  }).listen(port, function () {
    var relative = path.relative(process.cwd(), entry)
    var addr = 'http://localhost:' + port
    console.info('Started bankai for', relative, 'on', addr)
    if (argv.open !== false) {
      var app = (argv.open.length) ? argv.open : 'system browser'
      opn(addr, { app: argv.open || null })
        .catch(function (err) {
          done(explain(err, `err running ${app}`))
        })
        .then(done)
    }
  })
}

function build (entry, outputDir, argv, done) {
  mkdirp.sync(outputDir)
  buildStaticAssets(entry, outputDir, argv, done)
  var assets = bankai(entry, argv)
  var files = [ 'index.html', 'bundle.js', 'bundle.css' ]
  mapLimit(files, Infinity, iterator, done)
  function iterator (file, done) {
    var file$ = fs.createWriteStream(path.join(outputDir, file))
    var source$ = assets[file.replace(/^.*\./, '')]()
    pump(source$, file$, done)
  }
}

function buildStaticAssets (entry, outputDir, argv, done) {
  var src = path.join(path.dirname(entry), argv.assets)
  var dest = path.join(path.dirname(entry), outputDir, argv.assets)
  if (fs.existsSync(src)) copy(src, dest)
  function copy (src, dest) {
    if (!fs.statSync(src).isDirectory()) {
      return pump(fs.createReadStream(src), fs.createWriteStream(dest), done)
    }
    if (!fs.existsSync(dest)) fs.mkdirSync(dest)
    var files = fs.readdirSync(src)
    for (var i = 0; i < files.length; i++) {
      copy(path.join(src, files[i]), path.join(dest, files[i]))
    }
  }
}

function startLogging (verbose) {
  var level = (verbose) ? 'debug' : 'info'
  var pretty = garnish({ level: level, name: 'bankai' })
  pretty.pipe(process.stdout)
  bole.output({ stream: pretty, level: level })
}
