var ansi = require('ansi-escape-sequences')
var differ = require('ansi-diff-stream')
var pretty = require('prettier-bytes')
var strip = require('strip-ansi')
var nanoraf = require('nanoraf')

var StartDelimiter = '|'
var EndDelimiter = '|'
var Filled = '█'
var Empty = '░'

var files = [
  'assets',
  'document',
  'script',
  'manifest',
  'style',
  'service-worker'
]

module.exports = render

function render (state) {
  var diff = differ()
  diff.pipe(process.stdout)

  var render = nanoraf(function () {
    diff.write(view(state))
  }, raf)

  process.stdout.on('resize', function () {
    render()
  })

  return render
}

function view (state) {
  var str = ''

  str += header(state)
  str += '\n\n'

  if (state.error) {
    str += (clr(state.error, 'red') + '\n\n')
  } else {
    str += files.reduce(function (str, filename) {
      var file = state.files[filename]
      if (!file) return ''
      var status = file.status
      if (status === 'done') status = clr(status, 'green')

      var size = pretty(file.size).replace(' ', '')
      str += '  '
      str += (clr(file.name, 'green') + whitespace(14 - file.name.length))
      str += whitespace(7 - size.length) + clr(size, 'magenta') + ' '
      str += clr(file.timestamp, 'cyan') + ' '
      str += progress(file.progress, 10) + ' '
      str += status

      return str + '\n'
    }, '') + '\n'
  }

  str += footer(state)

  return str
}

// header
function header (state) {
  var SSEStatus = state.port ? 'ready' : 'starting'
  SSEStatus = SSEStatus === 'connected'
    ? clr(SSEStatus, 'green')
    : SSEStatus === 'ready'
      ? clr(SSEStatus, 'green')
      : clr(SSEStatus, 'yellow')

  var httpStatus = state.port
    ? clr(clr('https://localhost:' + state.port, 'underline'), 'blue')
    : clr('starting', 'yellow')

  var left = `HTTP: ${httpStatus}`
  var right = `SSE: ${SSEStatus}`
  return spaceBetween(left, right)
}

// footer
function footer (state) {
  var size = Object.keys(state.files).reduce(function (num, filename) {
    var file = state.files[filename]
    return num + file.size
  }, 0)
  var bottomLeft = tabBar(3, 0)

  var totalSize = clr(pretty(size).replace(' ', ''), 'magenta')
  var bottomRight = `Total size: ${totalSize}`
  return spaceBetween(bottomLeft, bottomRight)
}

function tabBar (count, curr) {
  var str = ''
  var tmp
  for (var i = 0; i < count; i++) {
    tmp = String(i + 1)
    if (curr === i) {
      tmp = `[ ${tmp} ]`
    } else {
      tmp = clr(tmp, 'gray')
      if (i !== 0) tmp = ' ' + tmp
      if (i !== count) tmp = tmp + ' '
    }
    str += tmp
  }
  return str
}

function clr (text, color) {
  return process.stdout.isTTY ? ansi.format(text, color) : text
}

function whitespace (len) {
  var res = ''
  while (res.length < len) res += ' '
  return res
}

function progress (curr, max) {
  var filledLength = Math.floor((curr / 100) * max)
  var emptyLength = max - filledLength
  var i = 1 + filledLength
  var j = i + emptyLength

  var str = StartDelimiter
  while (str.length < i) str += Filled
  while (str.length < j) str += Empty
  str += EndDelimiter
  return str
}

function raf (cb) {
  setTimeout(cb, 250)
}

function spaceBetween (left, right) {
  var len = process.stdout.columns - strip(left).length - strip(right).length
  var space = ''
  for (var i = 0; i < len; i++) {
    space += ' '
  }
  return left + space + right
}
