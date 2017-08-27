var debug = require('debug')('bankai.node-script')
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
  assert.equal(typeof state.arguments.entry, 'string', 'state.arguments.entries should be type string')

  var self = this
  var entry = state.arguments.entry
  var b = browserify(browserifyOpts([entry]))

  if (state.arguments.watch) {
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
