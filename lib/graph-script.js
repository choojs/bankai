var debug = require('debug')('bankai.node-script')
var concat = require('concat-stream')
var to = require('flush-write-stream')
var assert = require('assert')

var splitRequire = require('split-require')
var cssExtract = require('css-extract')
var browserify = require('browserify')
var watchify = require('watchify')
var sheetify = require('sheetify')
var yoyoify = require('yo-yoify')
var tinyify = require('tinyify')
var glslify = require('glslify')
var brfs = require('brfs')

var ttyError = require('./tty-error')
var exorcise = require('./exorcise')

module.exports = node

function node (state, createEdge) {
  assert.equal(typeof state.metadata.entry, 'string', 'state.metadata.entries should be type string')

  this.emit('progress', 'scripts', 0)

  var self = this
  var entry = state.metadata.entry
  var fullPaths = Boolean(state.metadata.fullPaths)
  var b = browserify(browserifyOpts([entry], fullPaths))
  var shouldMinify = !state.metadata.watch && !fullPaths

  if (state.metadata.watch) {
    b = watchify(b)
    debug('watching ' + entry)
    this.on('close', function () {
      debug('closing file watcher')
      b.close()
    })
  }

  b.ignore('sheetify/insert')
  b.transform(sheetify)
  b.transform(brfs)
  b.transform(glslify)
  b.transform(yoyoify, { global: true })

  if (!fullPaths) b.plugin(cssExtract, { out: bundleStyles })

  // TODO maybe this should also be !fullPaths, i'm not sure
  // ideally discify would support multiple bundles ;)
  b.plugin(splitRequire, {
    filename: function (record) {
      return 'bundle-' + record.index + '.js'
    },
    output: bundleDynamicBundle
  })

  if (shouldMinify) {
    b.plugin(tinyify)
    b.on('split.pipeline', function (pipeline) {
      tinyify.applyToPipeline(pipeline, b._options)
    })
  }

  bundleScripts()
  b.on('update', bundleScripts)

  var dynamicBundles
  function bundleScripts () {
    self.emit('progress', 'scripts', 30)

    dynamicBundles = []
    b.bundle(function (err, bundle) {
      if (err) {
        delete err.stream
        err = ttyError('scripts', 'browserify.bundle', err)
        return self.emit('error', 'scripts', 'browserify.bundle', err)
      }
      var mapName = 'bundle.js.map'
      exorcise(bundle, mapName, function (err, bundle, map) {
        if (err) return self.emit('error', 'scripts', 'exorcise', err)
        createEdge(mapName, Buffer.from(map))
        createEdge('bundle', bundle)
        createEdge('list', Buffer.from(dynamicBundles.join(',')))
        self.emit('progress', 'scripts', 100)
      })
    })
  }

  function bundleDynamicBundle (bundleName) {
    var edgeName = bundleName.replace(/\.js$/, '')
    var buffers = []
    return to(onwrite, onend)
    function onwrite (chunk, enc, cb) {
      buffers.push(chunk)
      cb(null)
    }
    function onend (cb) {
      var self = this
      dynamicBundles.push(bundleName)

      var mapName = bundleName + '.map'
      var bundle = Buffer.concat(buffers)
      exorcise(bundle, mapName, function (err, bundle, map) {
        if (err) return self.emit('error', 'scripts', 'exorcise', err)
        createEdge(mapName, Buffer.from(map))
        createEdge(edgeName, bundle)

        // Inform the main bundle about this file's full name.
        self.emit('name', state.scripts[edgeName].hash.toString('hex').slice(0, 16) + '/' + bundleName)

        cb()
      })
    }
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
