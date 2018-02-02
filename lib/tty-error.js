var ansi = require('ansi-escape-sequences')
var strip = require('strip-ansi')
var path = require('path')
var fs = require('fs')

var cwd = process.cwd()
var typescriptRx = /\.tsx?$/

module.exports = ttyError

function ttyError (src, sub, err) {
  var longFilename = err.filename || err.fileName
  if (!longFilename || !getErrorLocation(err)) return err

  var filename = path.relative(cwd, longFilename)
  var loc = getErrorLocation(err)
  var line = loc.line
  var col = loc.column + 1
  var hasTypeScript = err.hasTypeScript

  var lineNum = String(line) + ' '
  var padLen = lineNum.length
  var empty = padLeft('|', padLen + 1)
  var arrow = padLeft('--> ', padLen + 4 - 1)
  var syntaxError = padLeft('', col) + '^ ' + getErrorMessage(err)

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
  if (typescriptRx.test(longFilename) && !hasTypeScript) {
    str += '\n\n'
    str += clr(`To enable TypeScript in your project, install the TypeScript compiler: `, 'white') + '\n'
    str += '  ' + clr('npm install --save-dev typescript', 'grey')
  }

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

function getErrorLocation (err) {
  if (err.loc) return err.loc
  if (typeof err.line === 'number' && typeof err.column === 'number') {
    return {
      line: err.line,
      column: err.column
    }
  }
  return null
}

function getErrorMessage (err) {
  var loc = getErrorLocation(err)
  var message = err.message
    // strip file names
    .replace(/^.*?:|while parsing file:.*?$/g, '')
    // strip position in file
    .replace('(' + loc.line + ':' + loc.column + ')', '')
    // same, but for typescript
    .replace('(' + loc.line + ',' + loc.column + ')', '')

  return message || 'Syntax Error'
}
