var ansi = require('ansi-escape-sequences')
var differ = require('ansi-diff-stream')
var pretty = require('prettier-bytes')
var nanoraf = require('nanoraf')
var getPort = require('getport')
var http = require('http')

var Router = require('./regex-router')
var bankai = require('../')

var StartDelimiter = clr('|', 'gray')
var EndDelimiter = clr('|', 'gray')
var Filled = clr('█', 'gray')
var Empty = clr('░', 'gray')

var files = [
  'manifest',
  'assets',
  'serviceWorker',
  'script',
  'style',
  'document'
]

module.exports = start

function start (entry, opts) {
  var compiler = bankai(entry)
  var router = new Router()
  var state = {
    files: {},
    size: 0
  }

  files.forEach(function (filename) {
    state.files[filename] = {
      name: filename,
      progress: 0,
      hash: '      ',
      size: 0,
      status: 'pending',
      done: false
    }
  })

  var diff = differ()
  diff.pipe(process.stdout)
  var render = nanoraf(function () {
    diff.write(view(state))
  }, raf)

  compiler.on('error', function (error) {
    state.error = error.message + error.stack
    render()
  })

  compiler.on('change', function (nodeName, edgeName, nodeState) {
    var node = nodeState[nodeName][edgeName]
    state.files[nodeName] = {
      name: nodeName,
      progress: 100,
      hash: node.hash,
      size: node.buffer.length,
      status: 'done',
      done: true
    }
    render()
  })

  router.route(/(.*)\.js/, function (req, res, params) {
    var name = params[1]
    compiler.script(name, function (err, node) {
      if (err) {
        res.statusCode = 404
        return res.end(err.message)
      }
      res.end(node.buffer)
    })
  })

  router.route(/bundle.css/, function (req, res, params) {
    compiler.style(function (err, node) {
      if (err) {
        res.statusCode = 404
        return res.end(err.message)
      }
      res.end(node.buffer)
    })
  })

  router.route(/(.*)\.html/, function (req, res, params) {
    var name = params[1]
    compiler.script(name, function (err, node) {
      if (err) {
        res.statusCode = 404
        return res.end(err.message)
      }
      res.end(node.buffer)
    })
  })

  // Start listening on an unused port.
  var server = http.createServer(router.match)
  getPort(8080, 9000, function (err, port) {
    if (err) state.error = err
    server.listen(port, function () {
      state.url = 'http://localhost:' + port
    })
  })
}

function view (state) {
  var size = Object.keys(state.files).reduce(function (num, filename) {
    var file = state.files[filename]
    return num + file.size
  }, 0)
  var totalSize = clr(pretty(size).replace(' ', ''), 'magenta')

  var SSEStatus = 'waiting for connection'
  SSEStatus = SSEStatus === 'connected'
    ? clr(SSEStatus, 'green')
    : clr(SSEStatus, 'yellow')

  var files = [
    'manifest',
    'assets',
    'serviceWorker',
    'script',
    'style',
    'document'
  ]
  var str = ''

  if (!state.url) {
    str += 'Waiting for server to start\n\n'
  } else {
    str += `Listening on ${clr(state.url, 'underline')}\n\n`
  }

  if (state.error) {
    str += (clr(state.error, 'red') + '\n\n')
  } else {
    str += files.reduce(function (str, filename) {
      var file = state.files[filename]
      if (!file) return ''
      var status = file.status
      if (status === 'done') status = clr(status, 'green')

      str += '  '
      str += (clr(file.name, 'green') + whitespace(14 - file.name.length))
      str += whitespace(5 - String(file.size).length) + clr(pretty(file.size).replace(' ', ''), 'magenta') + ' '
      str += clr(file.hash.substr(0, 6), 'cyan') + ' '
      str += progress(file.progress, 100) + ' '
      str += status

      return str + '\n'
    }, '') + '\n'
  }

  str += `Server-sent events: ${SSEStatus}`
  str += '\n'
  str += `Total size: ${totalSize}`

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
