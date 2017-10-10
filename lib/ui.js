var ansi = require('ansi-escape-sequences')
var differ = require('ansi-diff-stream')
var pretty = require('prettier-bytes')
var keypress = require('keypress')
var strip = require('strip-ansi')
var nanoraf = require('nanoraf')

var StartDelimiter = '|'
var EndDelimiter = '|'
var Filled = '█'
var Empty = '░'

var files = [
  'assets',
  'documents',
  'scripts',
  'style',
  'manifest',
  'service-worker'
]

module.exports = render

function render (state) {
  var diff = differ()
  diff.pipe(process.stdout)

  var render = nanoraf(onrender, raf)

  process.stdout.on('resize', onresize)

  if (process.stdin.isTTY) {
    keypress(process.stdin)
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.on('keypress', onkeypress)
  }

  return render

  function onrender () {
    diff.write(view(state))
  }

  function onresize () {
    render()
  }

  function onkeypress (ch, key) {
    if (key && key.ctrl && key.name === 'c') {
      process.exit()
    } else if (ch === '1') {
      // TODO: Switch to the main view.
      render()
    } else if (ch === '2') {
      // TODO: Switch to the log view.
      render()
    } else if (ch === '3') {
      // TODO: Switch to the stats view.
      render()
    }
  }
}

function view (state) {
  if (state.error) {
    return '\x1b[33c' + state.error
  }

  var str = '\x1b[33c'
  str += header(state)
  str += '\n\n'
  str += files.reduce(function (str, filename) {
    var file = state.files[filename]
    if (!file) return ''
    var status = file.status
    var count = status === 'done' ? String(state.count[filename]) : ''
    if (status === 'done') status = clr(status, 'green')

    // Make it so singular words aren't pluralized.
    var name = count === '1'
      ? file.name.replace(/s$/, '')
      : file.name

    str += clr(padLeft(count, 3), 'yellow') + ' '
    str += padRight(clr(name, 'green'), 14)
    var size = pretty(file.size).replace(' ', '')
    str += pad(7 - size.length) + clr(size, 'magenta') + ' '
    str += clr(file.timestamp, 'cyan') + ' '
    str += progress(file.progress, 10) + ' '
    str += status

    return str + '\n'
  }, '') + '\n'

  var ssrState = 'Pending'

  if (state.ssr) {
    if (state.ssr.success) ssrState = 'Success'
    else ssrState = 'Skipped - ' + state.ssr.error.message
  }
  str += 'Server Side Rendering: ' + ssrState + '\n'

  str += footer(state)

  return str
}

// header
function header (state) {
  var SSEStatus = state.sse > 0
    ? clr('connected', 'green')
    : state.port
      ? 'ready'
      : clr('starting', 'yellow')

  var httpStatus = state.port
    ? clr(clr('https://localhost:' + state.port, 'underline'), 'blue')
    : clr('starting', 'yellow')

  var left = `HTTP: ${httpStatus}`
  var right = `Live Reload: ${SSEStatus}`
  return spaceBetween(left, right)
}

// footer
function footer (state) {
  var size = Object.keys(state.files).reduce(function (num, filename) {
    var file = state.files[filename]
    return num + file.size
  }, 0)
  var bottomLeft = tabBar(1, 0)

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

function padLeft (str, num, char) {
  str = String(str)
  var len = strip(str).length
  return pad(num - len, char) + str
}

function padRight (str, num, char) {
  str = String(str)
  var len = strip(str).length
  return str + pad(num - len, char)
}

function pad (len, char) {
  char = String(char === undefined ? ' ' : char)
  var res = ''
  while (res.length < len) res += char
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
  setTimeout(cb, 50)
}

function spaceBetween (left, right) {
  var len = process.stdout.columns - strip(left).length - strip(right).length
  var space = ''
  for (var i = 0; i < len; i++) {
    space += ' '
  }
  return left + space + right
}
