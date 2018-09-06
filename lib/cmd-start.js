var getPort = require('get-port')

var isElectronProject = require('./is-electron-project')
var http = require('./http-server')
var bankai = require('../http')
var createTui = require('./ui')
var createLogUi = require('./ui-basic')

module.exports = start

function start (entry, opts) {
  var handler = bankai(entry, opts)
  var state = handler.state

  var createUi = opts.simple ? createLogUi : createTui
  var render = createUi(handler.compiler, state)

  isElectronProject(handler.compiler.dirname, function (err, bool) {
    if (err) throw err
    opts.electron = bool

    var server = http.createServer(function (req, res) {
      if (req.type === 'OPTIONS') return cors(req, res)
      handler(req, res, function () {
        res.statusCode = 404
        return res.end('No route found for ' + req.url)
      })
    })

    render()

    getPort({ port: 8080 })
      .then(function (port) {
        server.listen(port, function () {
          state.port = port
        })
      })
      .catch(function (err) {
        state.error = err
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
