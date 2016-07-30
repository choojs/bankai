const fs = require('fs')
const path = require('path')
const meow = require('meow')

const commands = {
  start: require('./start')
}

const commandNames = Object.keys(commands)
const commandList = commandNames.join(', ')
const help = fs.readFileSync(path.resolve(__dirname, 'help.md'), 'utf-8')

const cli = meow(help, {

})

function main (commandName, options, cb) {
  if (typeof commandName !== 'string') {
    console.error(`Missing command parameter. Available parameters: ${commandList}`)
    return cli.showHelp(1)
  }

  if ((commandName in commands) === false) {
    console.error(`Unknown command ${commandName}. Available parameters: ${commandList}`)
    return cli.showHelp(1)
  }

  const command = commands[commandName]
  command(options, cb)
}

main(cli.input[0], cli.flags)
