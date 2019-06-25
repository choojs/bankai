module.exports = Router

function Router () {
  this.routes = []
  this._default = noop
  this.match = this.match.bind(this)
}

Router.prototype.route = function (regex, handler) {
  if (regex === '*') {
    this._default = handler
  } else {
    this.routes.push({
      regex: regex,
      handler: handler
    })
  }
}

Router.prototype.default = function (handler) {
  this._default = handler
}

Router.prototype.match = function (req, res, next) {
  var url = req.url
  var len = this.routes.length
  var i = 0
  var output, route
  for (; i < len; i++) {
    route = this.routes[i]
    output = route.regex.exec(url)

    if (output) {
      route.handler(req, res, output, next)
      return
    }
  }

  this._default(req, res, next)
}

function noop (req, res) {
  res.statusCode = 404
  res.end()
}
