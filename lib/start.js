var ansi = require('ansi-escape-sequences')
var pretty = require('prettier-bytes')
var neat = require('neat-log')

var files = [
  {
    name: 'index.html',
    progress: 100,
    hash: '93a8ac4',
    status: 'done',
    time: '16:57:38',
    warnings: [],
    errors: []
  },
  {
    name: 'bundle.js',
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
    status: 'waiting for JS',
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
    name: 'sw.js',
    progress: 100,
    hash: '93a8ac4',
    status: 'done',
    time: '16:57:38',
    warnings: [],
    errors: []
  },
  {
    name: 'assets/',
    progress: 60,
    hash: '93a8ac4',
    status: 'writing icon.png',
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
  var app = neat(view)
  app.use(function (state, emitter) {
    state.opts = opts
    setInterval(function () {
      emitter.emit('render')
    }, 250)
  })
  app.render()
}

function view (state) {
  var totalSize = clr(pretty(73000).replace(' ', ''), 'magenta')
  var str = `Listening on ${clr('https://localhost:8080', 'underline')}\n\n`
  str += files.reduce(function (str, file) {
    var len = 16 - file.name.length
    var status = file.status
    if (status === 'done') status = clr(status, 'green')
    str += '  '
    str += clr(file.name, 'green')
    str += whitespace(len)
    str += clr(file.hash, 'cyan')
    str += (' ' + progress(file.progress, 130))
    str += (' ' + status)
    return str + '\n'
  }, '') + '\n'
  str += `Total size: ${totalSize}               SSE:connected`
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
