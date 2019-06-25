var ansi = require('ansi-escape-sequences')
var dedent = require('dedent')

function clr (text, color) {
  return process.stdout.isTTY ? ansi.format(text, color) : text
}

module.exports = function fatalError (err) {
  return dedent`
    A critical error occured, forcing Bankai to abort:
    ${clr(err.stack, 'red')}

    If you think this might be a bug in Bankai, please consider helping
    improve Bankai's stability by submitting an error to:

      ${clr('https://github.com/choojs/bankai/issues/new', 'underline')}

    Please include the steps to reproduce this error, the stack trace
    printed above, your version of Node, and your version of npm. Thanks!
    ${clr('— Team Choo', 'italic')}

  `
}
