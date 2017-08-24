module.exports = Router

function Router () {
  this.routes = []
  this.default = noop
  this.match = this.match.bind(this)
}

Router.prototype.route = function (regex, handler) {
  if (regex === '*') {
    this.default = handler
  } else {
    this.routes.push({
      regex: regex,
      handler: handler
    })
  }
}

Router.prototype.match = function (req, res) {
  var url = req.url.replace(/^\//, '')
  var len = this.routes.length
  var i = 0
  var output, route
  for (; i < len; i++) {
    route = this.routes[i]
    output = route.regex.exec(url)

    if (output) {
      route.handler(req, res, output)
      break
    }
  }

  this.default(req, res, null)
}

function noop (req, res) {
  res.statusCode = 404
  res.end()
}
