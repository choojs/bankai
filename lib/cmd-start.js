var getPort = require('getport')

var bankai = require('../http')
var http = require('./http-server')

module.exports = start

function start (entry, opts) {
  var handler = bankai(entry, opts)
  var state = handler.state // TODO: move all UI code into this file
  var server = http.createServer(function (req, res) {
    if (req.type === 'OPTIONS') return cors(req, res)
    handler(req, res, function () {
      res.statusCode = 404
      return res.end('No route found for ' + req.url)
    })
  })

  getPort(8080, 9000, function (err, port) {
    if (err) state.error = err
    server.listen(port, function () {
      state.port = port
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
