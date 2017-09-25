var debug = require('debug')('bankai.node-script')
var concat = require('concat-stream')
var through = require('through2')
var assert = require('assert')
var pump = require('pump')

var collapser = require('bundle-collapser/plugin')
var unassertify = require('unassertify')
var cssExtract = require('css-extract')
var browserify = require('browserify')
var uglifyify = require('uglifyify')
var exorcist = require('exorcist')
var watchify = require('watchify')
var sheetify = require('sheetify')
var yoyoify = require('yo-yoify')
var glslify = require('glslify')
var envify = require('envify')
var brfs = require('brfs')

module.exports = node

function node (state, createEdge) {
  assert.equal(typeof state.arguments.entry, 'string', 'state.arguments.entries should be type string')

  var self = this
  var entry = state.arguments.entry
  var fullPaths = Boolean(state.arguments.fullPaths)
  var b = browserify(browserifyOpts([entry], fullPaths))

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
  b.transform(glslify)
  b.transform(yoyoify, { global: true })
  b.transform(envify, { global: true })
  b.transform(uglifyify, uglifyOpts(entry))
  if (!fullPaths) b.plugin(collapser)

  bundleScripts()
  b.on('update', bundleScripts)

  function bundleScripts () {
    var src = b.bundle()
    var exo = exorcise('bundle.js', function (buf) {
      createEdge('bundle.js.map', buf)
    })
    var sink = concat({ encoding: 'buffer' }, function (buf) {
      createEdge('bundle', buf)
    })
    // exo.on('data', data => console.log(data))
    pump(src, exo, sink, function (err) {
      if (err) return self.emit('error', 'scripts', 'browserify.bundle', err)
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

function uglifyOpts (entry, otherOpts) {
  var opts = {
    global: true,
    compress: {
      properties: true,
      dead_code: true,
      drop_debugger: false,  // debugger statements should never be stripped
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

function exorcise (url, done) {
  var str = through(onreadMap, onflushMap)
  var map = ''

  return exorcist(str, url)

  function onreadMap (d, _, cb) { map += d; cb() }

  function onflushMap (cb) {
    var buf = Buffer.from(map)
    done(buf)
    cb()
  }
}
