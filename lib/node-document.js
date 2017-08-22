var getAllRoutes = require('wayfarer/get-all-routes')
var mapLimit = require('async-collection/map-limit')
var critical = require('inline-critical-css')
var documentify = require('documentify')
var explain = require('explain-error')
var concat = require('concat-stream')
var decache = require('decache')
var pump = require('pump')

var WRITE_CONCURRENCY = 3

module.exports = node

function node (state, createEdge) {
  var self = this
  var app

  try {
    app = load(state.arguments.entry)
  } catch (e) {
    app = null
  }

  var list = listRoutes(app)

  mapLimit(list, WRITE_CONCURRENCY, iterator, function (err) {
    if (err) return self.emit(err)
    createEdge('list', Buffer.from(list.join(',')))
  })

  function iterator (route, done) {
    var html = renderBody(route, app)

    var d = documentify(head(html))
    d.transform(criticalTransform, { css: state.style.bundle.buffer })
    var source = d.bundle()

    pump(source, concat(sink), function (err) {
      if (err) return done(explain(err, 'Error in documentify while operating on ' + route))
      done()
    })

    function sink (buf) {
      var name = route + '.html'
      list.push(name)
      createEdge(name, buf)
    }
  }
}

function criticalTransform (opts) {
  return critical(String(opts.css))
}

function load (name) {
  decache(name)
  return require(name)
}

function renderBody (route, app) {
  if (app && app.router && app.router.router && app.router.router._trie) {
    // Choo.
    return app.toString(route)
  } else {
    // Default.
    return '<body></body>'
  }
}

function listRoutes (app) {
  if (app && app.router && app.router.router && app.router.router._trie) {
    // Choo.
    return Object.keys(getAllRoutes(app.router.router))
  } else {
    // Default.
    return [ '/' ]
  }
}

function head (body) {
  return `<!DOCTYPE html><html><head></head>${body}</html>`
}
