var getRoutes = require('wayfarer/get-all-routes')
module.exports = detectRouter

function detectRouter (src) {
  if (src.name === 'Choo' || (src.router && src.router.router && src.router.router._trie)) {
    var routes = getRoutes(src.router.router)
    Object.keys(routes).forEach(function (route) {
      var handler = routes[route]
      routes[route] = handler()
    })
    return routes
  }
}
