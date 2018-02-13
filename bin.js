#! /usr/bin/env node

process.title = 'bankai'

require('v8-compile-cache')

var ansi = require('ansi-escape-sequences')
var minimist = require('minimist')
var dedent = require('dedent')
var path = require('path')

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
    if (!path.isAbsolute(entry)) entry = path.join(process.cwd(), entry)
  } else {
    entry = process.cwd()
  }

  if (argv.help) {
    console.log(USAGE)
  } else if (argv.version) {
    console.log(require('./package.json').version)
  } else if (cmd === 'build') {
    var outdir = argv._[2]
    require('./lib/cmd-build')(path.join(entry), outdir, argv)
  } else if (cmd === 'inspect') {
    require('./lib/cmd-inspect')(path.join(entry), argv)
  } else if (cmd === 'start') {
    if (!argv.q) alternateBuffer()
    require('./lib/cmd-start')(path.join(entry), argv)
  } else {
    console.log(NOCOMMAND)
    process.exit(1)
  }
})(argv)

function clr (text, color) {
  return process.stdout.isTTY ? ansi.format(text, color) : text
}

// Switch to an alternate terminal buffer,
// switch back to the main terminal buffer on exit.
function alternateBuffer () {
  var q = Buffer.from('q')
  var esc = Buffer.from([0x1B])

  process.stdout.write('\x1b[?1049h') // Enter alternate buffer.
  process.stdout.write('\x1b[H')      // Reset screen to top.
  process.stdout.write('\x1b[?25l')   // Hide cursor

  process.on('unhandledRejection', onexit)
  process.on('uncaughtException', onexit)
  process.on('SIGTERM', onexit)
  process.on('SIGINT', onexit)
  process.on('exit', onexit)
  process.stdin.on('data', handleKey)

  function handleKey (buf) {
    if (buf.compare(q) === 0 || buf.compare(esc) === 0) {
      onexit()
    }
  }

  function onexit (statusCode) {
    process.stdout.write('\x1b[?1049l')  // Enter to main buffer.
    process.stdout.write('\x1b[?25h')    // Restore cursor

    if (statusCode instanceof Error) {
      console.error('A critical error occured, forcing Bankai to abort:\n')
      console.error(clr(statusCode.stack, 'red') + '\n')
      console.error(dedent`
        If you think this might be a bug in Bankai, please consider helping
        improve Bankai's stability by submitting an error to:

        ${'  ' + clr('https://github.com/choojs/bankai/issues/new', 'underline')}

        Please include the steps to reproduce this error, the stack trace
        printed above, your version of Node, and your version of npm. Thanks!
        ${clr('— Team Choo', 'italic')}
      ` + '\n')
      statusCode = 1
    }

    process.exit(statusCode)
  }
}
