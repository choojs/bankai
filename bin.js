#!/usr/bin/env node

var ansi = require('ansi-escape-sequences')
var minimist = require('minimist')
var path = require('path')

var build = require('./lib/build')
var inspect = require('./lib/inspect')
var start = require('./lib/start')

var USAGE = `
  $ ${clr('bankai', 'bold')} ${clr('<command> [entry]', 'green')} [options]

  Commands:

    build       compile all files to ${clr('dist/', 'green')}
    inspect     inspect the bundle dependencies
    start       start a development server

  Options:

    -d, --debug       output lots of logs
    -h, --help        print usage
    -q, --quiet       don't output any logs
    -v, --version     print version

  Examples:

    Start a development server
    ${clr('$ bankai start index.js', 'cyan')}

    Visualize all dependencies in your project
    ${clr('$ bankai inspect index.js', 'cyan')}

    Compile all files in the project to disk
    ${clr('$ bankai build index.js', 'cyan')}

  Running into trouble? Feel free to file an issue:
  ${clr('https://github.com/choojs/bankai/issues/new', 'cyan')}

  Do you enjoy using this software? Become a backer:
  ${clr('https://opencollective.com/choo', 'cyan')}
`.replace(/\n$/, '').replace(/^\n/, '')

var NOCOMMAND = `
  Please specify a bankai command:
    ${clr('$ bankai', 'cyan')} ${clr('<command>', 'green')}

  For example:
    ${clr('$ bankai start', 'cyan')} ${clr('index.js', 'green')}

  Run ${clr('bankai --help', 'cyan')} to see all options.
`.replace(/\n$/, '').replace(/^\n/, '')

var argv = minimist(process.argv.slice(2), {
  alias: {
    help: 'h',
    quiet: 'q',
    version: 'v'
  },
  boolean: [
    'help',
    'quiet',
    'version'
  ]
})

;(function main (argv) {
  var cmd = argv._[0]
  var entry = argv._[1]

  if (entry) {
    if (!/^\/*./.test(entry)) path.join(process.cwd(), entry)
  } else {
    entry = process.cwd()
  }

  if (argv.help) {
    console.log(USAGE)
  } else if (argv.version) {
    console.log(require('./package.json').version)
  } else if (cmd === 'build') {
    build(path.join(entry), argv)
  } else if (cmd === 'inspect') {
    inspect(path.join(entry), argv)
  } else if (cmd === 'start') {
    start(path.join(entry), argv)
  } else {
    console.log(NOCOMMAND)
    process.exit(1)
  }
})(argv)

function clr (text, color) {
  return process.stdout.isTTY ? ansi.format(text, color) : text
}
