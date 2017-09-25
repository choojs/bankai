var debug = require('debug')('bankai.graph-service-worker')
var assert = require('assert')
var findup = require('findup')
var path = require('path')

var collapser = require('bundle-collapser/plugin')
var unassertify = require('unassertify')
var browserify = require('browserify')
var envify = require('envify/custom')
var uglifyify = require('uglifyify')
var watchify = require('watchify')
var brfs = require('brfs')

var utils = require('./utils')

var filenames = [
  'service-worker.js',
  'sw.js'
]

module.exports = node

function node (state, createEdge) {
  var entry = state.arguments.entry
  var self = this
  var unwatch

  assert.equal(typeof entry, 'string', 'bankai.service-worker: state.arguments.entries should be type string')

  var basedir = utils.dirname(state.arguments.entry)

  if (state.arguments.watch && !state.arguments.watchers.serviceWorker) {
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
        state.arguments.serviceWorker = 'service-worker.js'
        return createEdge('bundle', Buffer.from(''))
      }

      // Expose what the original file name of the service worker was
      state.arguments.serviceWorker = path.basename(filename)

      var b = browserify(browserifyOpts([ filename ]))

      if (state.arguments.watch && !state.arguments.watchers.serviceWorker) {
        if (unwatch) unwatch() // File now exists, no need to have double watchers
        state.arguments.watchers.serviceWorker = true
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

      if (self.assert) b.transform(unassertify, { global: true })
      b.transform(brfs)
      b.transform(envify(env), { global: true })
      b.transform(uglifyify, uglifyOpts(entry))
      b.plugin(collapser)

      bundleScripts()

      function bundleScripts () {
        b.bundle(function (err, bundle) {
          if (err) return self.emit('error', 'service-worker', 'browserify.bundle', err)
          createEdge('bundle', bundle)
        })
      }
    })
  }
}

function browserifyOpts (entries) {
  assert.ok(Array.isArray(entries), 'browserifyOpts: entries should be an array')
  return {
    entries: entries,
    packageCache: {},
    cache: {}
  }
}

function uglifyOpts (entry) {
  var opts = {
    global: true,
    compress: {
      properties: true,
      dead_code: true,
      drop_debug: false,  // debugger statements should never be stripped
      comparisons: true,
      evaluate: true,
      hoist_funs: true,
      join_vars: true,
      pure_getters: true,
      reduce_vars: true,
      collapse_vars: true
    }
  }
  opts.sourceMap = { filename: entry }
  return opts
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
  var script = [`${state.scripts.bundle.hash}/bundle.js`]
  var style = [`${state.style.bundle.hash}/bundle.css`]
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
