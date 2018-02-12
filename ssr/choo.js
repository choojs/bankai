var getAllRoutes = require('wayfarer/get-all-routes')

module.exports.is = function (app) {
  return Boolean(app &&
    app.router &&
    app.router.router &&
    app.router.router._trie)
}

module.exports.listRoutes = function (app) {
  var keys = getAllRoutes(app.router.router)
  if (keys['/:']) delete keys['/:'] // Server rendering partials is tricky.
  return Object.keys(keys)
}

module.exports.render = function (app, route, state, cb) {
  cb(null, {
    body: app.toString(route, state),
    title: app.state.title,
    language: app.state.language
  })
}
