var EventEmitter = require('events').EventEmitter
var assert = require('assert')
var debug = require('debug')('bankai.server-render')

var getAllRoutes = require('wayfarer/get-all-routes')

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

  var app
  var ssrError = null
  var channel = new EventEmitter()
  channel.once('list', function (list) {
    render.list = list
  })

  try {
    app = freshRequire(entry)
  } catch (err) {
    var failedRequire = err.message === `Cannot find module '${entry}'`
    if (!failedRequire) {
      ssrError = err
      ssrError.isSsr = true
    }
    app = null
  }

  var routes = listRoutes(app)
  channel.emit('list', routes)

  channel.on('req', function (route, state) {
    var body, title, language

    // Choo.
    if (app && app.router && app.router.router && app.router.router._trie) {
      body = app.toString(route, state)
      title = app.state.title
      language = app.state.language
    }

    channel.emit('res', {
      body: body || '<body></body>',
      title: title || '',
      language: language || 'en-US'
    })
  })

  function listRoutes (app) {
    var keys
    if (app && app.router && app.router.router && app.router.router._trie) {
      // Choo.
      keys = getAllRoutes(app.router.router)
      // Server rendering partials is tricky.
      if (keys['/:']) delete keys['/:']
      return Object.keys(keys)
    } else {
      // Default.
      return [ '/' ]
    }
  }

  cb(ssrError, render)

  function render (route, state) {
    var res
    channel.once('res', function (_res) {
      res = _res
    })
    channel.emit('req', route, state)
    return res
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
