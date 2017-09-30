var ansi = require('ansi-escape-sequences')
var strip = require('strip-ansi')
var path = require('path')
var fs = require('fs')

var cwd = process.cwd()

module.exports = ttyError

function ttyError (src, sub, err) {
  if (!err.filename || !err.loc) return err

  var longFilename = err.filename
  var filename = path.relative(cwd, longFilename)
  var loc = err.loc
  var line = loc.line
  var col = loc.column + 1

  var lineNum = String(line) + ' '
  var padLen = lineNum.length
  var empty = padLeft('|', padLen + 1)
  var arrow = padLeft('--> ', padLen + 4 - 1)
  var syntaxError = padLeft('', col) + '^ Syntax Error'

  try {
    var file = fs.readFileSync(longFilename, 'utf8')
  } catch (e) {
    return err
  }

  var arr = file.split('\n')
  var code = arr[line - 1] || '<code>'

  var str = ''
  str += `${clr(`Failed while processing '${src}'.`, 'red')}\n\n`
  str += clr(arrow, 'blue') + clr(filename + `:${line}:${col}`, 'white') + '\n'
  str += clr(empty, 'blue') + '\n'
  str += clr(lineNum + '|', 'blue') + ` ${clr(code, 'white')}\n`
  str += clr(empty, 'blue') + clr(syntaxError, 'red') + '\n\n'
  str += clr(`Hmmm. We're having trouble parsing a file.`, 'white')

  err.pretty = str
  return err
}

function clr (text, color, style) {
  return process.stdout.isTTY ? ansi.format(text, color, style) : text
}

function padLeft (str, num, char) {
  str = String(str)
  var len = strip(str).length
  return pad(num - len, char) + str
}

// function padRight (str, num, char) {
//   str = String(str)
//   var len = strip(str).length
//   return str + pad(num - len, char)
// }

function pad (len, char) {
  char = String(char === undefined ? ' ' : char)
  var res = ''
  while (res.length < len) res += char
  return res
}
