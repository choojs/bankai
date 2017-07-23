#!/usr/bin/env node

var ansi = require('ansi-escape-sequences')
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
  $ ${clr('bankai', 'bold')} [options] <command>

  Commands:

    <default>                      run 'bankai start'
    start <filename>               start a bankai server
    build <filename> <directory>   compile and export files to a directory
    inspect <filename>             visualize the dependency tree

  Options:

    -a, --assets=<directory>  serve static assets [assets]
    -A, --address=<ip>        ip address to listen [localhost]
    -c, --css=<subargs>       pass subarguments to sheetify
    -d, --debug               include sourcemaps [false]
    -e, --electron            enable electron mode for the bundler [false]
    -h, --help                print usage
    -H, --html=<subargs>      pass subarguments to create-html
    -j, --js=<subargs>        pass subarguments to browserify
    -o, --open=<browser>      open html in a browser [system default]
    -p, --port=<n>            bind bankai to a port [8080]
    -V, --verbose             include debug messages [false]
    -w, --watch <bool>        toggle watch mode [true]

  Examples:

    Start bankai on port 8080
    ${clr('$ bankai index.js -p 8080', 'cyan')}
    Open html in the browser
    ${clr('$ bankai start index.js --open', 'cyan')}
    Use brfs as a browserify transform
    ${clr('$ bankai start -j [ -t brfs ] index.js', 'cyan')}
    Compile and export to dist/
    ${clr('$ bankai build index.js dist/', 'cyan')}
`.replace(/\n$/, '').replace(/^\n/, '')

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

  argv.html = argv.html || {}
  argv.css = argv.css || {}
  argv.js = argv.js || {}

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

function clr (text, color) {
  return process.stdout.isTTY ? ansi.format(text, color) : text
}
