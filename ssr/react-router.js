var isReactElement = require('react-is').isElement
var React = require('react')
var ReactDOM = require('react-dom/server')

module.exports.is = function (app) {
  return Boolean(app &&
    isReactElement(app) &&
    app.type &&
    app.type.name === 'StaticRouter')
}

module.exports.listRoutes = function (app) {
  return [] // Can't do this with react-router@4
}

module.exports.render = function render (app, route, cb) {
  var context = {}
  var element = React.cloneElement(app, {
    context: context,
    location: route
  })
  var result
  try {
    result = ReactDOM.renderToString(element)
  } catch (err) {
    return cb(err)
  }

  // Handle redirects.
  if (context.url) {
    return render(app, context.url, cb)
  }

  cb(null, {
    state: {},
    title: '',
    language: '',
    selector: 'body',
    body: '<body>' + result + '</body>'
  })
}
