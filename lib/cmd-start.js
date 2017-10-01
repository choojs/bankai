var pinoColada = require('pino-colada')
var stdout = require('stdout-stream')
var getPort = require('getport')
var pumpify = require('pumpify')
var pino = require('pino')

var http = require('./http-server')
var bankai = require('../http')
var Tui = require('./ui')

module.exports = start

function start (entry, opts) {
  var log = pino()
  var compiler = bankai(entry, Object.assign({
    logStream: pumpify(pinoColada(), stdout),
    log: log
  }, opts))
  var tui = Tui(compiler.state)

  compiler.on('change', function (state) {
    tui.render()
  })

  var server = http.createServer(function (req, res) {
    if (req.type === 'OPTIONS') return cors(req, res)
    compiler(req, res, function () {
      res.statusCode = 404
      return res.end(`No route found for ${req.url}`)
    })
  })

  getPort(8080, 9000, function (err, port) {
    if (err) return log.error(err)
    server.listen(port, function () {
      compiler.state.port = port
      tui.render()
    })
  })
}

function cors (req, res) {
  res.setHeader('access-control-allow-origin', '*')
  res.setHeader('access-control-allow-methods', '*')
  res.setHeader('access-control-allow-headers', '*')
  res.setHeader('access-control-allow-credentials', 'true')
  res.end(200)
}
