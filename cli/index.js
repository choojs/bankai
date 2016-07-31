#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const meow = require('meow')

const commands = {
  start: require('./start')
}

const commandNames = Object.keys(commands)
const commandList = commandNames.join(', ')
const help = fs.readFileSync(path.resolve(__dirname, 'help.md'), 'utf-8')
const unknowns = []
const alias = {
  entry: ['e'],
  open: ['o'],
  port: ['p']
}

const cli = meow(help, {
  alias: alias,
  string: [
    'entry',
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
    'js.fullPaths',
    'js.debug'
  ],
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

function main (commandName, options, cb) {
  if (typeof commandName !== 'string') {
    const error = new Error('Missing command parameter. Available commands: ' + commandList)
    error.cli = true
    return cb(error)
  }

  if ((commandName in commands) === false) {
    const error = new Error('Unknown command ' + commandName + '.', 'Available commands: ' + commandList)
    error.cli = true
    return cb(error)
  }

  if (unknowns.length > 0) {
    const error = new Error('Unkown flags detected: ' + unknowns.join(', '))
    error.cli = true
    return cb(error)
  }

  // Remove short hand pointers
  aliasNames.forEach(function (aliasName) {
    delete options[aliasName]
  })

  const command = commands[commandName]
  command(options, cb)
}

main(cli.input[0], cli.flags, function (error) {
  if (error) {
    if (error.cli) {
      console.error(cli.help)
      console.error('')
      console.error(error.message)
      return process.exit(1)
    }
    throw error
  }
})
