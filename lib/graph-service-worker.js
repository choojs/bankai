var explain = require('explain-error')
var assert = require('assert')
var findup = require('findup')
var path = require('path')

var collapser = require('bundle-collapser/plugin')
var unassertify = require('unassertify')
var browserify = require('browserify')
var uglifyify = require('uglifyify')
var watchify = require('watchify')
var envify = require('envify')
var brfs = require('brfs')

var filenames = [
  'service-worker.js',
  'sw.js'
]

module.exports = node

function node (state, createEdge) {
  var entry = state.arguments.entry
  var self = this

  assert.equal(typeof entry, 'string', 'bankai.service-worker: state.arguments.entries should be type string')

  var location = path.dirname(entry)

  find(location, filenames, function (err, filename) {
    if (err) return createEdge('bundle', Buffer.from(''))

    var bundler = browserify(browserifyOpts([ filename ]))
    var b = state.arguments.watch ? watchify(bundler) : bundler

    if (self.assert) b.transform(unassertify, { global: true })
    b.transform(brfs)
    b.transform(envify, { global: true })
    b.transform(uglifyify, uglifyOpts(entry))
    b.plugin(collapser)

    bundleScripts()
    b.on('update', bundleScripts)

    function bundleScripts () {
      b.bundle(function (err, bundle) {
        if (err) return self.emit('error', explain(err, 'bankai.script: an error occured in browserify during the .bundle() step'))
        createEdge('bundle', bundle)
      })
    }
  })
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
