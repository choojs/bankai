#!/usr/bin/env node
'use strict'

const bole = require('bole')
const logger = bole('bankai')
const garnish = require('garnish')
const stdout = require('stdout-stream')
const meow = require('meow')

const commands = {
  start: require('./start'),
  build: require('./build')
}

const commandNames = Object.keys(commands)
const commandList = commandNames.join(', ')
const unknowns = []
const alias = {
  entry: ['e'],
  optimize: ['o'],
  browse: ['b'],
  port: ['p'],
  dir: ['d'],
  stream: ['s'],
  verbose: ['v']
}

const cli = meow(`
  Usage:
    $ bankai <command> [options]

  Commands:
    <default>                      Run 'bankai start'
    start <filename>               Start a bankai server
    build <filename> <directory>   Compile and export files to a directory

    Options:
      -p, --port=<n>          Bind bankai to <n> [default: 8080]
      -o, --open=<browser>    Open html in a browser [default: system default]
      -O, --optimize          Optimize assets served by bankai [default: false]
      -s, --stream            Print messages to stdout
      -v, --verbose           Include debug messages
      -c, --css=<subargs>     Pass subarguments to sheetify
      -j, --js                Pass subarguments to browserify

  Examples:
    $ bankai start index.js -p 8080      # start bankai on port 8080
    $ bankai index.js --open             # open html in the browser
    $ bankai -c [ -u sheetify-cssnext ]  # use cssnext in sheetify
    $ bankai -j [ -t brfs ]              # use brfs in browserify
    $ bankai build index.js dist/        # compile and export to dist/
    $ bankai build -O index.js dist/     # optimize compiled files
  `,
  {
    alias: alias,
    string: [
      'entry',
      'dir',
      'open',
      'html.entry',
      'html.css',
      'html.title',
      'css.use',
      'js.noParse',
      'js.transform',
      'js.ignoreTransform',
      'js.plugin',
      'js.extensions',
      'js.basedir',
      'js.paths',
      'js.commondir',
      'js.builtins',
      'js.bundleExternal',
      'js.browserField',
      'js.insertGlobals',
      'js.standalone',
      'js.externalRequireName'
    ],
    boolean: [
      'optimize',
      'stream',
      'verbose',
      'js.fullPaths',
      'js.debug'
    ],
    default: {
      stream: true
    },
    unknown: function (flag) {
      if (flag in commands) {
        return
      }
      unknowns.push(flag)
    }
  })

const aliasNames = Object.keys(alias)
  .reduce(function (r, i) {
    return r.concat(alias[i])
  }, [])

const configureLogging = (options) => {
  if (options.stream) {
    const pretty = garnish({
      level: options.verbose ? 'debug' : 'info',
      name: 'bankai'
    })
    pretty.pipe(stdout)

    bole.output({
      stream: pretty,
      level: 'debug'
    })
  }
}

function main (commandName, options, cb) {
  configureLogging(options)

  let error

  if (typeof commandName !== 'string') {
    error = new Error(`Missing command parameter. Available commands: ${commandList}`)
    error.cli = true
    return cb(error)
  }

  if ((commandName in commands) === false) {
    error = new Error(`Unknown command ${commandName}. Available commands: ${commandList}`)
    error.cli = true
    return cb(error)
  }

  if (unknowns.length > 0) {
    error = new Error(`Unkown flags detected: ${unknowns.join(', ')}`)
    error.cli = true
    return cb(error)
  }

  // Remove short hand pointers
  aliasNames.forEach(function (aliasName) {
    delete options[aliasName]
  })

  logger.debug(`Invoking command '${commandName}'`)
  const command = commands[commandName]
  command(options, cb)
}

main(cli.input[0], cli.flags, error => {
  if (error) {
    if (error.cli) {
      logger.error(`${cli.help}\n${error.message}`)
      return process.exit(1)
    }
    throw error
  }
})
