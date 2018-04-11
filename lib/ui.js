var ansi = require('ansi-escape-sequences')
var pretty = require('prettier-bytes')
var gzipSize = require('gzip-size')
var keypress = require('keypress')
var differ = require('ansi-diff')
var strip = require('strip-ansi')
var nanoraf = require('nanoraf')
var fatalError = require('./fatal-error')

var StartDelimiter = '|'
var EndDelimiter = '|'
var Filled = '█'
var Empty = '░'
var NewlineMatcher = /\n/g

var files = [
  'assets',
  'documents',
  'scripts',
  'styles',
  'manifest',
  'service-worker'
]

module.exports = createUi

function createUi (compiler, state) {
  var diff = differ()
  alternateBuffer()

  Object.assign(state, {
    count: compiler.metadata.count,
    files: {},
    size: 0
  })

  var render = nanoraf(onrender, raf)

  files.forEach(function (filename) {
    state.files[filename] = {
      name: filename,
      progress: 0,
      timestamp: '        ',
      size: 0,
      status: 'pending',
      done: false
    }
  })

  compiler.on('error', function (topic, sub, err) {
    if (err.pretty) state.error = err.pretty
    else state.error = `${topic}:${sub} ${err.message}\n${err.stack}`
    render()
  })

  compiler.on('ssr', render)

  compiler.on('progress', function (nodeName, progress) {
    state.error = null
    state.files[nodeName].progress = progress
    render()
  })

  compiler.on('change', function (nodeName, edgeName, nodeState) {
    var node = nodeState[nodeName][edgeName]
    var data = {
      name: nodeName,
      progress: 100,
      timestamp: time(),
      size: 0,
      status: 'done',
      done: true
    }
    state.files[nodeName] = data

    // Only calculate the gzip size if there's a buffer. Apparently zipping
    // an empty file means it'll pop out with a 20B base size.
    if (node.buffer.length) {
      gzipSize(node.buffer)
        .then(function (size) { data.size = size })
        .catch(function (size) { data.size = node.buffer.length })
        .then(render)
    }
    render()
  })

  compiler.on('sse-connect', render)
  compiler.on('sse-disconnect', render)

  process.stdout.on('resize', onresize)

  if (process.stdin.isTTY) {
    keypress(process.stdin)
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.on('keypress', onkeypress)
  }

  return render

  function onrender () {
    process.stdout.write(diff.update(view(state)))
  }

  function onresize () {
    diff.resize({width: process.stdout.columns, height: process.stdout.rows})
    diff.update('')
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
    ssrState = state.ssr.success
      ? 'Success'
      : `Skipped - ${state.ssr.error.message} ${state.ssr.error.stack.split('\n')[1].trim()}`
  }
  str += 'Server Side Rendering: ' + ssrState + '\n'

  str += footer(state)

  // pad string with newlines to ensure old rendered lines are cleared
  var padLines = Math.max(process.stdout.rows - str.match(NewlineMatcher).length - 1, 0)
  str += '\n'.repeat(padLines)

  return str
}

// header
function header (state) {
  var sseStatus = state.sse > 0
    ? clr('connected', 'green')
    : state.port
      ? 'ready'
      : clr('starting', 'yellow')

  var httpStatus = state.port
    ? clr(clr('https://localhost:' + state.port, 'underline'), 'blue')
    : clr('starting', 'yellow')

  var left = `HTTP: ${httpStatus}`
  var right = `Live Reload: ${sseStatus}`
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

function time () {
  var date = new Date()
  var hours = numPad(date.getHours())
  var minutes = numPad(date.getMinutes())
  var seconds = numPad(date.getSeconds())
  return `${hours}:${minutes}:${seconds}`
}

function numPad (num) {
  if (num < 10) num = '0' + num
  return num
}

function alternateBuffer () {
  var q = Buffer.from('q')
  var esc = Buffer.from([0x1B])

  process.stdout.write('\x1b[?1049h') // Enter alternate buffer.
  process.stdout.write('\x1b[H') // Reset screen to top.
  process.stdout.write('\x1b[?25l') // Hide cursor

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
    process.stdout.write('\x1b[?1049l') // Enter to main buffer.
    process.stdout.write('\x1b[?25h') // Restore cursor

    if (statusCode instanceof Error) {
      console.error(fatalError(statusCode))
      statusCode = 1
    }

    process.exit(statusCode)
  }
}
