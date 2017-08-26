var explain = require('explain-error')
var concat = require('concat-stream')
var assert = require('assert')

var collapser = require('bundle-collapser/plugin')
var unassertify = require('unassertify')
var cssExtract = require('css-extract')
var browserify = require('browserify')
var uglifyify = require('uglifyify')
var watchify = require('watchify')
var sheetify = require('sheetify')
var yoyoify = require('yo-yoify')
var envify = require('envify')
var brfs = require('brfs')

module.exports = node

function node (state, createEdge) {
  var self = this

  assert.equal(typeof state.arguments.entry, 'string', 'state.arguments.entries should be type string')

  var entry = state.arguments.entry

  var bundler = browserify(browserifyOpts([entry]))
  var b = state.arguments.watch ? watchify(bundler) : bundler

  b.plugin(cssExtract, { out: bundleStyles })
  b.ignore('sheetify/insert')
  b.transform(sheetify)

  if (this.assert) b.transform(unassertify, { global: true })
  b.transform(brfs)
  b.transform(yoyoify, { global: true })
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

  function bundleStyles () {
    return concat({ encoding: 'buffer' }, function (buf) {
      createEdge('style', buf)
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
