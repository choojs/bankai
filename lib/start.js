var ansi = require('ansi-escape-sequences')
var differ = require('ansi-diff-stream')
var pretty = require('prettier-bytes')
var nanoraf = require('nanoraf')
var getPort = require('getport')

var files = [
  {
    name: 'assets/',
    progress: 60,
    hash: '93a8ac4',
    status: 'icon.png',
    time: '16:57:38',
    warnings: [],
    errors: []
  },
  {
    name: 'documents/',
    progress: 100,
    hash: '93a8ac4',
    status: 'done',
    time: '16:57:38',
    warnings: [],
    errors: []
  },
  {
    name: 'scripts/',
    progress: 80,
    hash: '93a8ac4',
    status: 'uglifyJS',
    time: '16:57:38',
    warnings: [],
    errors: []
  },
  {
    name: 'bundle.css',
    progress: 0,
    hash: '93a8ac4',
    status: 'waiting',
    time: '16:57:38',
    warnings: [],
    errors: []
  },
  {
    name: 'manifest.json',
    progress: 100,
    hash: '93a8ac4',
    status: 'done',
    time: '16:57:38',
    warnings: [],
    errors: []
  },
  {
    name: 'service-worker.js',
    progress: 100,
    hash: '93a8ac4',
    status: 'done',
    time: '16:57:38',
    warnings: [],
    errors: []
  }
]

var StartDelimiter = clr('|', 'gray')
var EndDelimiter = clr('|', 'gray')
var Filled = clr('█', 'gray')
var Empty = clr('░', 'gray')

module.exports = start

function start (entry, opts) {
  var state = {}
  var diff = differ()
  diff.pipe(process.stdout)
  var render = nanoraf(function () {
    diff.write(view(state))
  }, raf)

  ;(function ports () {
    getPort(8080, 9000, function (err, port) {
      if (err) state.error = err
      state.url = 'https://localhost:' + port
    })
  })()

  setInterval(function () {
    render()
  }, 1000)
}

function view (state) {
  var totalSize = clr(pretty(73000).replace(' ', ''), 'magenta')
  var str = ''

  if (state.error) {
    return str + clr(state.error, 'red')
  }

  if (!state.url) return 'Initializing'

  str += `Listening on ${clr(state.url, 'underline')}\n\n`
  str += files.reduce(function (str, file) {
    var status = file.status
    if (status === 'done') status = clr(status, 'green')

    str += '  '
    str += (clr(file.name, 'green') + whitespace(19 - file.name.length))
    str += clr(file.hash.substr(0, 6), 'cyan') + ' '
    str += progress(file.progress, 100) + ' '
    str += status

    return str + '\n'
  }, '') + '\n'
  str += `Total size: ${totalSize}         SSE:connected`
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
