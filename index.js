var Emitter = require('events').EventEmitter
var debug = require('debug')('bankai')
var graph = require('buffer-graph')
var assert = require('assert')
var path = require('path')
var pino = require('pino')

var localization = require('./localization')
var progress = require('./lib/progress')
var queue = require('./lib/queue')

var assetsNode = require('./lib/graph-assets')
var documentNode = require('./lib/graph-document')
var manifestNode = require('./lib/graph-manifest')
var reloadNode = require('./lib/graph-reload')
var scriptNode = require('./lib/graph-script')
var serviceWorkerNode = require('./lib/graph-service-worker')
var styleNode = require('./lib/graph-style')

module.exports = Bankai

function Bankai (entry, opts) {
  if (!(this instanceof Bankai)) return new Bankai(entry, opts)
  opts = opts || {}

  this.local = localization(opts.language || 'en-US')
  this.log = pino(opts.logStream || process.stdout)

  assert.equal(typeof entry, 'string', 'bankai: entry should be type string')
  assert.ok(path.isAbsolute(entry), 'bankai: entry should be an absolute path. Received: ' + entry)
  assert.equal(typeof opts, 'object', 'bankai: opts should be type object')

  var self = this
  var methods = [
    'manifest',
    'assets',
    'service-worker',
    'scripts',
    'style',
    'documents'
  ]

  // Initialize data structures.
  var key = Buffer.from('be intolerant of intolerance')
  this.queue = queue(methods)       // The queue caches requests until ready.
  this.graph = graph(key)           // The graph manages relations between deps.
  this.errors = []                  // Keep track of any errors that occur.

  this.graph.on('progress', onprogress)
  this.graph.on('change', onchange)
  this.graph.on('error', onerror)

  // Insert nodes into the graph.
  this.graph.node('assets', assetsNode)
  this.graph.node('documents', [
    'manifest:color',
    'style:bundle',
    'scripts:bundle',
    'reload:bundle'
  ], documentNode)
  this.graph.node('manifest', manifestNode)
  this.graph.node('scripts', scriptNode)
  this.graph.node('reload', reloadNode)
  this.graph.node('service-worker', [
    'assets:list',
    'style:bundle',
    'scripts:bundle',
    'documents:list'
  ], serviceWorkerNode)
  this.graph.node('style', [
    'scripts:style',
    'scripts:bundle'
  ], styleNode)

  // Kick off the graph.
  this.graph.start(createOpts)()
  this.state = {
    nodes: progress(methods, this.graph, this.queue),
    errors: []
  }
  this.metadata = this.graph.metadata

  function createOpts () {
    return {
      dirname: path.dirname(entry),
      assert: opts.assert !== false,
      watch: opts.watch !== false,
      fullPaths: opts.fullPaths,
      reload: Boolean(opts.reload),
      log: this.log,
      watchers: {},
      entry: entry,
      opts: opts
    }
  }

  // TODO: this should be a general update event.
  // An event that responds to any form of change; where
  // the emitted chunk is just the latest state of the node.
  //
  // Also make heavy use of `debug` calls so it can be debugged more easily.
  //
  //  ## Internal events
  //    .on('progress') // Detect if progress === 100, update timestamp.
  //    .on('count')    // Whenever files are done, provides a count.
  //    .on('error')    // Detect error types, prettify if needed.
  //
  //  ## External events
  //    .on('change')   // Count + progress, only ever exposes `state`.
  //    .on('error')    // Every time a new error is emitted.
  //
  // Also expose this.errors = [], which is an aggregate of all errors
  // on each of the nodes.
  //
  function onprogress (chunk, value) {
    self.emit('progress', chunk, value)
  }

  function onchange (nodeName, edgeName, state) {
    var eventName = nodeName + ':' + edgeName
    var queue = self.queue

    if (eventName === 'assets:list') {
      queue['assets'].ready()
    } else if (eventName === 'documents:list') {
      queue['documents'].ready()
    } else if (eventName === 'manifest:bundle') {
      queue['manifest'].ready()
    } else if (eventName === 'scripts:bundle') {
      queue['scripts'].ready()
    } else if (eventName === 'service-worker:bundle') {
      queue['service-worker'].ready()
    } else if (eventName === 'style:bundle') {
      queue['style'].ready()
    }

    self.emit('change', nodeName, edgeName, state)
  }

  function onerror () {
    var args = ['error']
    for (var len = arguments.length, i = 0; i < len; i++) {
      args.push(arguments[i])
    }
    self.emit.apply(self, args)
  }
}
Bankai.prototype = Object.create(Emitter.prototype)

Bankai.prototype.scripts = function (filename, cb) {
  assert.equal(typeof filename, 'string')
  assert.equal(typeof cb, 'function')
  var stepName = 'scripts'
  var edgeName = filename.split('.')[0]
  var self = this
  this.queue[stepName].add(function () {
    var data = self.graph.data[stepName][edgeName]
    if (!data) return cb(new Error('bankai.scripts: could not find a bundle for ' + filename))
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

Bankai.prototype.documents = function (filename, cb) {
  assert.equal(typeof filename, 'string')
  assert.equal(typeof cb, 'function')
  if (filename === '/') filename = 'index'
  var stepName = 'documents'
  var edgeName = filename.split('.')[0] + '.html'
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

Bankai.prototype.serviceWorker = function (cb) {
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

Bankai.prototype.assets = function (edgeName, cb) {
  assert.equal(typeof edgeName, 'string')
  assert.equal(typeof cb, 'function')
  var stepName = 'assets'
  var self = this
  this.queue[stepName].add(function () {
    var data = self.graph.data[stepName][edgeName]
    if (!data) return cb(new Error('bankai.asset: could not find a file for ' + edgeName))
    cb(null, data)
  })
}

Bankai.prototype.sourceMaps = function (stepName, edgeName, cb) {
  assert.equal(typeof stepName, 'string')
  assert.equal(typeof edgeName, 'string')
  assert.equal(typeof cb, 'function')
  edgeName = /\.map$/.test(edgeName) ? edgeName : edgeName + '.map'
  var self = this
  var data = self.graph.data[stepName][edgeName]
  if (!data) return cb(new Error('bankai.sourceMaps: could not find a file for ' + stepName + ':' + edgeName))
  cb(null, data)
}

Bankai.prototype.close = function () {
  debug('closing all file watchers')
  this.graph.emit('close')
  this.emit('close')
}
