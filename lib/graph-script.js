var debug = require('debug')('bankai.node-script')
var concat = require('concat-stream')
var assert = require('assert')

var collapser = require('bundle-collapser/plugin')
var commonShake = require('common-shakeify')
var unassertify = require('unassertify')
var cssExtract = require('css-extract')
var browserify = require('browserify')
var watchify = require('watchify')
var sheetify = require('sheetify')
var yoyoify = require('yo-yoify')
var glslify = require('glslify')
var envify = require('envify')
var brfs = require('brfs')

var ttyError = require('./tty-error')
var exorcise = require('./exorcise')
var minify = require('./minify')

module.exports = node

function node (state, createEdge) {
  assert.equal(typeof state.metadata.entry, 'string', 'state.metadata.entries should be type string')

  var self = this
  var entry = state.metadata.entry
  var fullPaths = Boolean(state.metadata.fullPaths)
  var b = browserify(browserifyOpts([entry], fullPaths))

  if (state.metadata.watch) {
    b = watchify(b)
    debug('watching ' + entry)
    this.on('close', function () {
      debug('closing file watcher')
      b.close()
    })
  }

  b.plugin(cssExtract, { out: bundleStyles })

  b.ignore('sheetify/insert')
  b.transform(sheetify)

  if (this.assert) b.transform(unassertify, { global: true })
  b.transform(brfs)
  b.transform(glslify)
  b.transform(yoyoify, { global: true })
  b.transform(envify, { global: true })
  b.plugin(commonShake)
  if (!fullPaths) b.plugin(collapser)

  bundleScripts()
  b.on('update', bundleScripts)

  function bundleScripts () {
    b.bundle(function (err, bundle) {
      if (err) {
        delete err.stream
        err = ttyError('scripts', 'browserify.bundle', err)
        return self.emit('error', 'scripts', 'browserify.bundle', err)
      }
      minify(entry, bundle, function (err, bundle) {
        if (err) return self.emit('error', 'scripts', 'minify', err)
        var mapName = 'bundle.js.map'
        exorcise(bundle, mapName, function (err, bundle, map) {
          if (err) return self.emit('error', 'scripts', 'exorcise', err)
          createEdge(mapName, Buffer.from(map))
          createEdge('bundle', bundle)
          self.emit('progress', 'scripts', 100)
        })
      })
    })
  }

  function bundleStyles () {
    return concat({ encoding: 'buffer' }, function (buf) {
      createEdge('style', buf)
    })
  }
}

function browserifyOpts (entries, fullPaths) {
  assert.ok(Array.isArray(entries), 'browserifyOpts: entries should be an array')
  return {
    debug: true,
    fullPaths: fullPaths,
    entries: entries,
    packageCache: {},
    cache: {}
  }
}
