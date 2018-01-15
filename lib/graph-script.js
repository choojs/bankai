var debug = require('debug')('bankai.node-script')
var concat = require('concat-stream')
var to = require('flush-write-stream')
var tfilter = require('tfilter')
var assert = require('assert')

var babelPresetEnv = require('babel-preset-env')
var splitRequire = require('split-require')
var cssExtract = require('css-extract')
var browserify = require('browserify')
var babelify = require('babelify')
var watchify = require('watchify')
var sheetify = require('sheetify')
var yoyoify = require('yo-yoify')
var tinyify = require('tinyify')
var glslify = require('glslify')
var brfs = require('brfs')

var ttyError = require('./tty-error')
var exorcise = require('./exorcise')

// Browsers to support in Babel.
var browsers = [
  'last 2 Chrome versions',
  'last 2 Firefox versions',
  'last 2 Safari versions',
  'last 2 Edge versions',
  '> 1%' // Cover all other browsers that are widely used.
]

var babelPresets = [
  [babelPresetEnv, {
    targets: { browsers: browsers }
  }]
]

module.exports = node

function node (state, createEdge) {
  assert.equal(typeof state.metadata.entry, 'string', 'state.metadata.entries should be type string')

  this.emit('progress', 'scripts', 0)

  var self = this
  var entry = state.metadata.entry
  var fullPaths = Boolean(state.metadata.fullPaths)
  var b = browserify(browserifyOpts([entry], fullPaths))
  var shouldMinify = !state.metadata.watch

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
  b.transform(glslify)
  // Dependencies should be transformed, but their .babelrc should be ignored.
  b.transform(tfilter(babelify, { include: /node_modules/ }), {
    global: true,
    babelrc: false,
    presets: babelPresets
  })
  // In our own code, .babelrc files should be used.
  b.transform(tfilter(babelify, { exclude: /node_modules/ }), {
    global: true,
    babelrc: true,
    presets: babelPresets
  })
  b.transform(brfs, { global: true })
  b.transform(yoyoify, { global: true })

  if (!fullPaths) b.plugin(cssExtract, { out: bundleStyles })

  // split-require does not support `fullPaths: true` at the moment.
  // the next best thing is to bundle everything, because the byte counts
  // shown for individiual modules in discify will still be correct.
  if (!fullPaths) {
    b.plugin(splitRequire, {
      filename: function (record) {
        return 'bundle-' + record.index + '.js'
      },
      output: bundleDynamicBundle
    })
  }

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
