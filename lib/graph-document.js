var mapLimit = require('async-collection/map-limit')
var explain = require('explain-error')
var concat = require('concat-stream')
var pump = require('pump')
var path = require('path')

var critical = require('inline-critical-css')
var documentify = require('documentify')
var hyperstream = require('hyperstream')

var serverRender = require('./server-render')
var utils = require('./utils')
var ttyError = require('./tty-error')

var WRITE_CONCURRENCY = 3

module.exports = node

function node (state, createEdge) {
  var entry = utils.basefile(state.metadata.entry)
  var self = this

  serverRender(entry, function (err, render) {
    if (err) {
      err = ttyError('documents', entry, err)
      return self.emit('error', 'documents', entry, err)
    }
    var fonts = extractFonts(state.assets)
    var list = render.list

    mapLimit(list, WRITE_CONCURRENCY, iterator, function (err) {
      if (err) return self.emit(err)
      createEdge('list', Buffer.from(list.join(',')))
    })

    function iterator (route, done) {
      var res = render(route) // TODO: allow passing in state as second arg

      var description = '' // TODO: extract from manifest
      var language = res.language
      var title = res.title
      var body = res.body

      var html = head(body, language)
      var d = documentify(entry, html)
      d.transform(polyfillTransform)
      d.transform(scriptTransform, { hash: state.scripts.bundle.hash })
      d.transform(styleTransform, { hash: state.style.bundle.hash })
      d.transform(preloadTransform)
      d.transform(loadFontsTransform, { fonts: fonts })
      d.transform(manifestTransform)
      d.transform(viewportTransform)
      d.transform(descriptionTransform, { description: description })
      d.transform(themeColorTransform, { color: String(state.manifest.color.buffer) })
      d.transform(titleTransform, { title: title })
      // TODO: twitter
      // TODO: facebook
      // TODO: apple touch icons
      // TODO: favicons

      if (state.style.bundle.buffer.length) {
        d.transform(criticalTransform, { css: state.style.bundle.buffer })
      }

      if (state.metadata.reload) {
        d.transform(reloadTransform, { bundle: state.reload.bundle.buffer })
      }

      var source = d.bundle()

      pump(source, concat({ encoding: 'buffer' }, sink), function (err) {
        if (err) return done(explain(err, 'Error in documentify while operating on ' + route))
        done()
      })

      function sink (buf) {
        var name = route
        if (name === '/') name = 'index'
        name = name + '.html'
        createEdge(name, buf)
      }
    }
  })
}

function head (body, lang) {
  var dir = 'ltr'
  return `<!DOCTYPE html><html lang="${lang}" dir="${dir}"><head></head>${body}</html>`
}

function polyfillTransform () {
  var link = 'https://cdn.polyfill.io/v2/polyfill.min.js'
  var header = `<script src="${link}" defer></script>`
  return addToHead(header)
}

// Make sure that rel=preload works in Safari. This should be part of
// polyfill.io, but isn't yet for whatever reason. Uses both
// loadCss and cssRelPreload from
// https://github.com/filamentgroup/loadCSS/releases.
function preloadTransform () {
  var content = ';(function(a){"use strict";var b=function(b,c,d){function e(a){return h.body?a():void setTimeout(function(){e(a)})}function f(){i.addEventListener&&i.removeEventListener("load",f),i.media=d||"all"}var g,h=a.document,i=h.createElement("link");if(c)g=c;else{var j=(h.body||h.getElementsByTagName("head")[0]).childNodes;g=j[j.length-1]}var k=h.styleSheets;i.rel="stylesheet",i.href=b,i.media="only x",e(function(){g.parentNode.insertBefore(i,c?g:g.nextSibling)});var l=function(a){for(var b=i.href,c=k.length;c--;)if(k[c].href===b)return a();setTimeout(function(){l(a)})};return i.addEventListener&&i.addEventListener("load",f),i.onloadcssdefined=l,l(f),i};"undefined"!=typeof exports?exports.loadCSS=b:a.loadCSS=b})("undefined"!=typeof global?global:this);'
  content += ';(function(a){if(a.loadCSS){var b=loadCSS.relpreload={};if(b.support=function(){try{return a.document.createElement("link").relList.supports("preload")}catch(b){return!1}},b.poly=function(){for(var b=a.document.getElementsByTagName("link"),c=0;c<b.length;c++){var d=b[c];"preload"===d.rel&&"style"===d.getAttribute("as")&&(a.loadCSS(d.href,d,d.getAttribute("media")),d.rel=null)}},!b.support()){b.poly();var c=a.setInterval(b.poly,300);a.addEventListener&&a.addEventListener("load",function(){b.poly(),a.clearInterval(c)}),a.attachEvent&&a.attachEvent("onload",function(){a.clearInterval(c)})}}})(this);'
  var header = `<script>${content}</script>`
  return addToHead(header)
}

function scriptTransform (opts) {
  var hash = opts.hash
  var link = `/${hash}/bundle.js`
  var header = `<script src="${link}" defer></script>`
  return addToHead(header)
}

// TODO: make sure this works on browsers that don't support it.
function styleTransform (opts) {
  var hash = opts.hash
  var link = `/${hash}/bundle.css`
  var header = `<link rel="preload" as="style" href="${link}" onload="this.rel='stylesheet'">`
  return addToHead(header)
}

function loadFontsTransform (opts) {
  var header = opts.fonts.reduce(function (header, font) {
    if (!path.isAbsolute(font)) font = '/' + font
    return header + `<link rel="preload" as="font" crossorigin href="${font}">`
  }, '')
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

function themeColorTransform (opts) {
  var header = `
    <meta name="theme-color" content=${opts.color}>
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

function reloadTransform (opts) {
  var header = `
    <script>${opts.bundle}</script>
  `.replace(/\n +/g, '')
  return addToHead(header)
}

function addToHead (str) {
  return hyperstream({
    head: {
      _appendHtml: str
    }
  })
}

// Specific to the document node's layout
function extractFonts (state) {
  var list = String(state.list.buffer).split(',')

  var res = list.filter(function (font) {
    var extname = path.extname(font)

    return extname === '.woff' ||
      extname === '.woff2' ||
      extname === '.eot' ||
      extname === '.ttf'
  })

  return res
}
