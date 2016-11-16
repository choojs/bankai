#!/usr/bin/env node

const explain = require('explain-error')
const mapLimit = require('map-limit')
const resolve = require('resolve')
const garnish = require('garnish')
const mkdirp = require('mkdirp')
const subarg = require('subarg')
const bole = require('bole')
const http = require('http')
const path = require('path')
const pump = require('pump')
const opn = require('opn')
const fs = require('fs')

const bankai = require('./')

const argv = subarg(process.argv.slice(2), {
  string: [ 'open', 'port' ],
  boolean: [ 'optimize', 'verbose', 'help', 'version', 'debug' ],
  default: {
    optimize: false,
    open: false,
    port: 8080,
    debug: false
  },
  alias: {
    css: 'c',
    js: 'j',
    help: 'h',
    open: 'o',
    optimize: 'O',
    port: 'p',
    verbose: 'V',
    version: 'v',
    debug: 'd'
  }
})

const usage = `
  Usage:
    $ bankai <command> [options]

  Commands:
    <default>                      Run 'bankai start'
    start <filename>               Start a bankai server
    build <filename> <directory>   Compile and export files to a directory

    Options:
      -c, --css=<subargs>     Pass subarguments to sheetify
      -h, --help              Print usage
      -j, --js=<subargs>      Pass subarguments to browserify
      --html=<subargs>        Pass subarguments to create-html
      -o, --open=<browser>    Open html in a browser [default: system default]
      -O, --optimize          Optimize assets served by bankai [default: false]
      -p, --port=<n>          Bind bankai to <n> [default: 8080]
      -V, --verbose           Include debug messages
      -d, --debug             Include sourcemaps [default: false]

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
  const cmd = argv._[0]
  const _entry = argv._[1] || 'index.js'
  const localEntry = './' + _entry.replace(/^.\//, '')
  const entry = resolve.sync(localEntry, { basedir: process.cwd() })
  const outputDir = argv._[2] || 'dist'
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
  const assets = bankai(entry, argv)
  const port = argv.port

  http.createServer((req, res) => {
    switch (req.url) {
      case '/': return assets.html(req, res).pipe(res)
      case '/bundle.js': return assets.js(req, res).pipe(res)
      case '/bundle.css': return assets.css(req, res).pipe(res)
      default: return (res.statusCode = 404 && res.end('404 not found'))
    }
  }).listen(port, function () {
    const relative = path.relative(process.cwd(), entry)
    const addr = 'http://localhost:' + port
    console.info('Started bankai for', relative, 'on', addr)
    if (argv.open !== false) {
      const app = (argv.open.length) ? argv.open : 'system browser'
      opn(addr, { app: argv.open || null })
        .catch((err) => done(explain(err, `err running ${app}`)))
        .then(done)
    }
  })
}

function build (entry, outputDir, argv, done) {
  mkdirp.sync(outputDir)
  const assets = bankai(entry, argv)
  const files = [ 'index.html', 'bundle.js', 'bundle.css' ]
  mapLimit(files, Infinity, iterator, done)
  function iterator (file, done) {
    const file$ = fs.createWriteStream(path.join(outputDir, file))
    const source$ = assets[file.replace(/^.*\./, '')]()
    pump(source$, file$, done)
  }
}

function startLogging (verbose) {
  const level = (verbose) ? 'debug' : 'info'
  const pretty = garnish({ level: level, name: 'bankai' })
  pretty.pipe(process.stdout)
  bole.output({ stream: pretty, level: level })
}
