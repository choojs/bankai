var getRoutes = require('wayfarer/get-all-routes')
module.exports = detectRouter

function detectRouter (src) {
  if (src.name === 'Choo') {
    var routes = getRoutes(src.router.router)
    Object.keys(routes).forEach(function (route) {
      var handler = routes[route]
      routes[route] = handler()
    })
    return routes
  } else {
    return null
  }
}
