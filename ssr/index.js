var debug = require('debug')('bankai.server-render')
var EventEmitter = require('events').EventEmitter
var assert = require('assert')

var choo = require('./choo')

var DEFAULT_RESPONSE = {
  body: '<body></body>',
  title: '',
  language: 'en-US'
}

// NOTE: Oh boy, I never hoped to be writing code like this - but here we are.
// In order to make sure server rendering works in combination with file
// watching, we need to be able to clear the `require()` cache. Plucking out
// the stuff you need from a global cache is tricky, so instead we just
// recreate the cache on each run. To make sure this only happens for the
// application code, we run all that stuff inside a VM. And then we cry. We cry
// a little. Because we're now deep in the woods of Node's internals, and,
// well, all we wanted to do was output some HTML strings. ;_;

module.exports = serverRender

function serverRender (entry, cb) {
  assert.equal(typeof entry, 'string')

  var channel = new EventEmitter()

  var app, ssrError
  app = getApp(entry)
  if (app.isSsr) {
    ssrError = app
    app = null
  }

  // Figure out what type of app we're looking at
  var appType = getAppType(app)

  // List all routes
  var routes = listRoutes(app)
  channel.emit('list', routes)
  render.list = routes

  // Listen for incoming requests, and render.
  channel.on('req', function (route, state) {
    if (appType === 'choo') route(route, state, done)
    else channel.emit('res', DEFAULT_RESPONSE)

    function done (err, res) {
      if (err) return channel.emit('err', err)
      channel.emit('res', Object.extend({}, DEFAULT_RESPONSE, res))
    }
  })

  cb(ssrError, render)

  // Get all lists from an app instance. Fall back to '/'.
  function listRoutes (app) {
    if (appType === 'choo') return choo.listRoutes(app)
    return ['/']
  }

  function getAppType (app) {
    return choo.is(app) || 'default'
  }

  function render (route, state) {
    var res
    channel.once('res', function (_res) {
      res = _res
    })
    channel.emit('req', route, state)
    return res
  }
}

function getApp (entry) {
  try {
    return freshRequire(entry)
  } catch (err) {
    var failedRequire = err.message === `Cannot find module '${entry}'`
    if (!failedRequire) {
      var ssrError = err
      ssrError.isSsr = true
      return ssrError
    }
  }
}

function freshRequire (file) {
  clearRequireAndChildren(file)

  var exports = require(file)

  return exports
}

function isNotNativeModulePath (file) {
  return /\.node$/.test(file.id) === false
}

function isNotInNodeModules (file) {
  return /node_modules/.test(file.id) === false
}

function clearRequireAndChildren (key) {
  if (!require.cache[key]) return

  require.cache[key].children
    .filter(isNotNativeModulePath)
    .filter(isNotInNodeModules)
    .forEach(function (child) {
      clearRequireAndChildren(child.id)
    })
  debug('clearing require cache for %s', key)
  delete require.cache[key]
}
