var mapLimit = require('async-collection/map-limit')
var explain = require('explain-error')
var concat = require('concat-stream')
var decache = require('decache')
var pump = require('pump')

var getAllRoutes = require('wayfarer/get-all-routes')
var critical = require('inline-critical-css')
var documentify = require('documentify')
var hyperstream = require('hyperstream')

var WRITE_CONCURRENCY = 3

module.exports = node

function node (state, createEdge) {
  var entry = state.arguments.entry
  var self = this
  var app

  try {
    app = load(entry)
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

    html = head(html)
    var d = documentify(entry, html)
    d.transform(criticalTransform, { css: state.style.bundle.buffer })
    d.transform(styleHeaderTransform, { hash: state.style.bundle.hash })
    d.transform(scriptHeaderTransform, { hash: state.script.bundle.hash })
    var source = d.bundle()

    pump(source, concat({ encoding: 'buffer' }, sink), function (err) {
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

function styleHeaderTransform (opts) {
  var hash = opts.hash
  var link = `/styles/${hash}/bundle.css`
  var header = `<link rel="stylesheet" href="${link}" media="none" onload="if(media!=='all')media='all'">`
  return addToHead(header)
}

function scriptHeaderTransform (opts) {
  var hash = opts.hash
  var link = `/scripts/${hash}/bundle.js`
  var header = `<script src="${link}" defer></script>`
  return addToHead(header)
}

function addToHead (str) {
  return hyperstream({
    head: {
      _appendHtml: str
    }
  })
}
