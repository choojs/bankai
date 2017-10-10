var EventEmitter = require('events').EventEmitter
var proxyquire = require('proxyquire')
var assert = require('assert')

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
  var channel = new EventEmitter()
  channel.once('list', function (list) {
    render.list = list
  })

  try {
    app = proxyquire(entry, {})
  } catch (err) {
    var failedRequire = err.message === `Cannot find module '${entry}'`
    if (!failedRequire) render.ssrError = err
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
      keys = Object.keys(getAllRoutes(app.router.router))
      // Server rendering partials is tricky.
      if (keys['/:']) delete keys['/:']
      return keys
    } else {
      // Default.
      return [ '/' ]
    }
  }

  cb(null, render)

  function render (route, state) {
    var res
    channel.once('res', function (_res) {
      res = _res
    })
    channel.emit('req', route, state)
    return res
  }
}
