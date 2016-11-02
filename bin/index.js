#!/usr/bin/env node

const garnish = require('garnish')
const subarg = require('subarg')
const bole = require('bole')

const build = require('./build')
const start = require('./start')

const argv = subarg(process.argv.slice(2), {
  string: [ 'open', 'port' ],
  boolean: [ 'optimize', 'verbose' ],
  default: {
    optimize: false,
    port: 8080
  },
  alias: {
    css: 'c',
    js: 'j',
    open: 'o',
    optimize: 'O',
    port: 'p',
    verbose: 'V',
    version: 'v'
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
      -o, --open=<browser>    Open html in a browser [default: system default]
      -O, --optimize          Optimize assets served by bankai [default: false]
      -p, --port=<n>          Bind bankai to <n> [default: 8080]
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
  const cmd = argv._[0]
  const entryFile = argv._[1] || 'index.js'
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

  if (!cmd || cmd === 'start') start(entryFile, argv, handleError)
  if (cmd === 'build') build(entryFile, outputDir, argv, handleError)

  function handleError (err) {
    if (err) throw err
  }
}

function startLogging (verbose) {
  const level = (verbose) ? 'debug' : 'info'
  const pretty = garnish({ level: level, name: 'bankai' })
  pretty.pipe(process.stdout)
  bole.output({ stream: pretty, level: level })
}
