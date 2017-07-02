#!/usr/bin/env node

var pinoColada = require('pino-colada')
var resolve = require('resolve')
var subarg = require('subarg')
var pino = require('pino')

var inspect = require('./inspect')
var start = require('./start')
var build = require('./build')

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
