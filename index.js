var Emitter = require('events').EventEmitter
var graph = require('buffer-graph')
var assert = require('assert')
var path = require('path')

var localization = require('./localization')
var queue = require('./lib/queue')

var assetsNode = require('./lib/node-assets')
var documentNode = require('./lib/node-document')
var manifestNode = require('./lib/node-manifest')
var scriptNode = require('./lib/node-script')
var serviceWorkerNode = require('./lib/node-service-worker')
var styleNode = require('./lib/node-style')

module.exports = Bankai

function Bankai (entry, opts) {
  if (!(this instanceof Bankai)) return new Bankai(entry, opts)
  opts = opts || {}
  this.local = localization(opts.language || 'en-US')

  assert.equal(typeof entry, 'string', 'bankai: entries should be type string')
  assert.equal(typeof opts, 'object', 'bankai: opts should be type object')

  var self = this
  var methods = [
    'manifest',
    'assets',
    'serviceWorker',
    'script',
    'style',
    'document'
  ]

  // Initialize data structures.
  this.queue = queue(methods)    // The queue caches requests until ready.
  this.graph = graph()           // The graph manages relations between deps.

  // Detect when we're ready to allow requests to go through.
  this.graph.on('change', function (nodeName, edgeName, state) {
    self.emit('change', nodeName, edgeName, state)
    var eventName = nodeName + ':' + edgeName
    if (eventName === 'script:bundle') self.queue.script.ready()
    else if (eventName === 'manifest:bundle') self.queue.manifest.ready()
    else if (eventName === 'style:bundle') self.queue.style.ready()
  })

  // Handle errors so they can be logged.
  this.graph.on('error', function (err) {
    self.emit('error', err)
  })

  // Insert nodes into the graph.
  this.graph.node('assets', assetsNode)
  this.graph.node('document', [ 'manifest:color', 'style:bundle', 'assets:favicons', 'script:bundle' ], documentNode)
  this.graph.node('manifest', manifestNode)
  this.graph.node('script', scriptNode)
  this.graph.node('service-worker', [ 'assets:list' ], serviceWorkerNode)
  this.graph.node('style', [ 'script:style', 'script:bundle' ], styleNode)

  // Kick off the graph.
  this.graph.start({
    dirname: path.dirname(entry),
    assert: opts.assert !== false,
    watch: opts.watch !== false,
    entry: entry,
    opts: opts,
    cache: {}
  })
}
Bankai.prototype = Object.create(Emitter.prototype)

Bankai.prototype.script = function (filename, cb) {
  assert.equal(typeof filename, 'string')
  assert.equal(typeof cb, 'function')
  var stepName = 'script'
  var edgeName = filename.split('.')[0]
  var self = this
  this.queue[stepName].add(function () {
    var data = self.graph.data[stepName][edgeName]
    if (!data) return cb(new Error('bankai.script: could not find a bundle for ' + filename))
    cb(null, data)
  })
}

Bankai.prototype.style = function (cb) {
  assert.equal(typeof cb, 'function')
  var stepName = 'style'
  var edgeName = 'bundle'
  var self = this
  this.queue[stepName].add(function () {
    var data = self.graph.data[stepName][edgeName]
    if (!data) return cb(new Error('bankai.style: could not find bundle'))
    cb(null, data)
  })
}

Bankai.prototype.document = function (filename, cb) {
  assert.equal(typeof filename, 'string')
  assert.equal(typeof cb, 'function')
  var stepName = 'document'
  var edgeName = filename.split('.')[0]
  var self = this
  this.queue[stepName].add(function () {
    var data = self.graph.data[stepName][edgeName]
    if (!data) return cb(new Error('bankai.document: could not find a document for ' + filename))
    cb(null, data)
  })
}

Bankai.prototype.manifest = function (cb) {
  assert.equal(typeof cb, 'function')
  var stepName = 'manifest'
  var edgeName = 'bundle'
  var self = this
  this.queue[stepName].add(function () {
    var data = self.graph.data[stepName][edgeName]
    if (!data) return cb(new Error('bankai.manifest: could not find bundle'))
    cb(null, data)
  })
}

Bankai.prototype.serviceWorker = function (filename, cb) {
  assert.equal(typeof cb, 'function')
  var stepName = 'service-worker'
  var edgeName = 'bundle'
  var self = this
  this.queue[stepName].add(function () {
    var data = self.graph.data[stepName][edgeName]
    if (!data) return cb(new Error('bankai.serviceWorker: could not find bundle'))
    cb(null, data)
  })
}

Bankai.prototype.asset = function (filename, cb) {
  assert.equal(typeof filename, 'string')
  assert.equal(typeof cb, 'function')
  var stepName = 'asset'
  var edgeName = filename.split('.')[0]
  var self = this
  this.queue[stepName].add(function () {
    var data = self.graph.data[stepName][edgeName]
    if (!data) return cb(new Error('bankai.asset: could not find a file for ' + filename))
    cb(null, data)
  })
}
