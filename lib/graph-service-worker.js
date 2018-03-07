var debug = require('debug')('bankai.graph-service-worker')
var assert = require('assert')
var findup = require('findup')
var path = require('path')

var browserify = require('browserify')
var watchify = require('watchify')
var tinyify = require('tinyify')
var brfs = require('brfs')

var ttyError = require('./tty-error')
var exorcise = require('./exorcise')
var utils = require('./utils')

var filenames = [
  'service-worker.js',
  'sw.js'
]

module.exports = node

function node (state, createEdge) {
  var entry = state.metadata.entry
  var self = this
  var unwatch

  assert.equal(typeof entry, 'string', 'bankai.service-worker: state.metadata.entries should be type string')

  var basedir = utils.dirname(state.metadata.entry)

  if (state.metadata.watch && !state.metadata.watchers.serviceWorker) {
    state.metadata.watchers.serviceWorker = true
    debug('watching ' + basedir + ' for ' + filenames.join(', '))
    unwatch = utils.watch(basedir, filenames, parse)
    this.on('close', function () {
      debug('closing file watcher')
      if (unwatch) unwatch()
    })
  }

  parse()

  function parse () {
    find(basedir, filenames, function (err, filename) {
      if (err) {
        state.metadata.serviceWorker = 'service-worker.js'
        return createEdge('bundle', Buffer.from(''), {
          mime: 'application/javascript'
        })
      }

      // Expose what the original file name of the service worker was
      state.metadata.serviceWorker = path.basename(filename)

      var b = browserify(browserifyOpts([ filename ]))

      if (state.metadata.watch && !state.metadata.watchers.serviceWorker) {
        if (unwatch) unwatch() // File now exists, no need to have double watchers
        state.metadata.watchers.serviceWorker = true
        debug('watchify: watching ' + filename)
        b = watchify(b)
        b.on('update', function () {
          debug('watchify: update detected in ' + filename)
          bundleScripts()
        })
        self.on('close', function () {
          debug('closing file watcher')
          b.close()
        })
      }

      var env = Object.assign({}, process.env, fileEnv(state))
      b.transform(brfs)
      if (!state.metadata.watch) b.plugin(tinyify, { env: env })

      bundleScripts()

      function bundleScripts () {
        b.bundle(function (err, bundle) {
          if (err) {
            delete err.stream
            err = ttyError('service-worker', 'browserify.bundle', err)
            return self.emit('error', 'scripts', 'browserify.bundle', err)
          }
          var mapName = 'bankai-service-worker.js.map'
          exorcise(bundle, mapName, function (err, bundle, map) {
            if (err) return self.emit('error', 'service-worker', 'exorcise', err)
            createEdge(mapName, map, {
              mime: 'application/json'
            })
            createEdge('bundle', bundle, {
              mime: 'application/javascript'
            })
          })
        })
      }
    })
  }
}

function browserifyOpts (entries) {
  assert.ok(Array.isArray(entries), 'browserifyOpts: entries should be an array')
  return {
    debug: true,
    entries: entries,
    packageCache: {},
    cache: {}
  }
}

function find (rootname, arr, done) {
  if (!arr.length) return done(new Error('Could not find files'))
  var filename = arr[0]
  var newArr = arr.slice(1)
  findup(rootname, filename, function (err, dirname) {
    if (err) return find(rootname, newArr, done)
    done(null, path.join(dirname, filename))
  })
}

function fileEnv (state) {
  var script = [
    `${state.scripts.bundle.hash.toString('hex').slice(0, 16)}/bundle.js`
  ]
  var style = [`${state.styles.bundle.hash.toString('hex').slice(0, 16)}/bundle.css`]
  var assets = split(state.assets.list.buffer)
  var doc = split(state.documents.list.buffer)
  var manifest = ['/manifest.json']

  var files = [].concat(script, style, assets, doc, manifest)
  files = files.filter(function (file) {
    return file
  })

  return {
    STYLE_LIST: style,
    SCRIPT_LIST: script,
    ASSET_LIST: assets,
    DOCUMENT_LIST: doc,
    MANIFEST_LIST: manifest,
    FILE_LIST: files
  }

  function split (buf) {
    var str = String(buf)
    return str.split(',')
  }
}
