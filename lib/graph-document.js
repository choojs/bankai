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
    var res = renderBody(route, app)

    var description = '' // TODO: extract from manifest
    var language = res.language
    var title = res.title
    var body = res.body

    var html = head(body, language)
    var d = documentify(entry, html)
    d.transform(scriptTransform, { hash: state.script.bundle.hash })
    d.transform(styleTransform, { hash: state.style.bundle.hash })
    // TODO: preload fonts
    d.transform(manifestTransform)
    d.transform(viewportTransform)
    d.transform(descriptionTransform, { description: description })
    // TODO: theme color
    d.transform(titleTransform, { title: title })
    // TODO: twitter
    // TODO: facebook
    // TODO: apple touch icons
    // TODO: favicons
    d.transform(criticalTransform, { css: state.style.bundle.buffer })
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

function load (name) {
  decache(name)
  return require(name)
}

function renderBody (route, app) {
  var body, title, language

  // Choo.
  if (app && app.router && app.router.router && app.router.router._trie) {
    body = app.toString(route)
    title = app.state.title
    language = app.state.language
  }

  return {
    body: body || '<body></body>',
    title: title || '',
    language: language || 'en-US'
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

function head (body, lang) {
  var dir = 'ltr'
  return `<!DOCTYPE html><html lang="${lang}" dir="${dir}"><head></head>${body}</html>`
}

function scriptTransform (opts) {
  var hash = opts.hash
  var link = `/scripts/${hash}/bundle.js`
  var header = `<script src="${link}" defer></script>`
  return addToHead(header)
}

function styleTransform (opts) {
  var hash = opts.hash
  var link = `/styles/${hash}/bundle.css`
  var header = `<link rel="stylesheet" href="${link}" media="none" onload="if(media!=='all')media='all'">`
  return addToHead(header)
}

function manifestTransform () {
  var header = `
    <link rel="manifest" href="/manifest.json">
  `.replace(/\n +/g, '')
  return addToHead(header)
}

function viewportTransform () {
  var header = `
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  `.replace(/\n +/g, '')
  return addToHead(header)
}

function descriptionTransform (opts) {
  var header = `
    <meta name="description" content=${opts.description}>
  `.replace(/\n +/g, '')
  return addToHead(header)
}

function titleTransform (opts) {
  var header = `
    <title>${opts.title}</title>
  `.replace(/\n +/g, '')
  return addToHead(header)
}

function criticalTransform (opts) {
  return critical(String(opts.css))
}

function addToHead (str) {
  return hyperstream({
    head: {
      _appendHtml: str
    }
  })
}
