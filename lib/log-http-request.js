var EventEmitter = require('events').EventEmitter
var requestStats = require('request-stats')

module.exports = logHttpRequest

function logHttpRequest (server) {
  var emitter = new EventEmitter()
  var stats = requestStats(server)
  stats.on('complete', fmtStats)
  return emitter

  function fmtStats (stats) {
    var req = stats.req
    var res = stats.res

    var resLevel = res.status >= 400 ? 'warn' : 'info'

    emitter.emit('data', 'info', {
      url: req.path,
      method: req.method,
      message: 'request',
      contentLength: req.bytes
    })

    emitter.emit('data', resLevel, {
      url: req.path,
      method: req.method,
      statusCode: res.status,
      message: 'response',
      elapsed: stats.time,
      contentLength: res.bytes
    })
  }
}
