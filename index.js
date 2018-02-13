var Emitter = require('events').EventEmitter
var debug = require('debug')('bankai')
var graph = require('buffer-graph')
var assert = require('assert')
var path = require('path')
var pino = require('pino')

var localization = require('./localization')
var queue = require('./lib/queue')
var utils = require('./lib/utils')

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
    'styles',
    'documents'
  ]

  // Initialize data structures.
  var key = Buffer.from('be intolerant of intolerance')
  this.dirname = utils.dirname(entry) // The base directory.
  this.queue = queue(methods)         // The queue caches requests until ready.
  this.graph = graph(key)             // The graph manages relations between deps.

  // Detect when we're ready to allow requests to go through.
  this.graph.on('change', function (nodeName, edgeName, state) {
    self.emit('change', nodeName, edgeName, state)
    var eventName = nodeName + ':' + edgeName
    var count = self.metadata.count
    var queue = self.queue

    if (eventName === 'assets:list') {
      count['assets'] = String(self.graph.data.assets.list.buffer).split(',').length
      queue['assets'].ready()
    } else if (eventName === 'documents:list') {
      count['documents'] = String(self.graph.data.documents.list.buffer).split(',').length
      queue['documents'].ready()
    } else if (eventName === 'manifest:bundle') {
      count['manifest'] = 1
      queue['manifest'].ready()
    } else if (eventName === 'scripts:bundle') {
      count['scripts'] = 1
      queue['scripts'].ready()
    } else if (eventName === 'service-worker:bundle') {
      count['service-worker'] = 1
      queue['service-worker'].ready()
    } else if (eventName === 'styles:bundle') {
      count['styles'] = 1
      queue['styles'].ready()
    }
  })

  // Handle errors so they can be logged.
  this.graph.on('error', function () {
    var args = ['error']
    for (var len = arguments.length, i = 0; i < len; i++) {
      args.push(arguments[i])
    }
    self.emit.apply(self, args)
  })

  this.graph.on('progress', function (chunk, value) {
    self.emit('progress', chunk, value)
  })

  this.graph.on('ssr', function (result) {
    self.emit('ssr', result)
  })

  // Insert nodes into the graph.
  this.graph.node('assets', assetsNode)
  this.graph.node('documents', [ 'assets:list', 'manifest:bundle', 'styles:bundle', 'scripts:bundle', 'reload:bundle' ], documentNode)
  this.graph.node('manifest', manifestNode)
  this.graph.node('scripts', scriptNode)
  this.graph.node('reload', reloadNode)
  this.graph.node('service-worker', [ 'assets:list', 'styles:bundle', 'scripts:bundle', 'documents:list' ], serviceWorkerNode)
  this.graph.node('styles', [ 'scripts:style', 'scripts:bundle' ], styleNode)

  // Kick off the graph.
  this.graph.start({
    dirname: this.dirname,
    watch: opts.watch !== false,
    babelifyDeps: opts.babelifyDeps !== false,
    fullPaths: opts.fullPaths,
    reload: Boolean(opts.reload),
    log: this.log,
    watchers: {},
    entry: entry,
    opts: opts,
    count: {
      assets: 0,
      documents: 0,
      manifest: 0,
      scripts: 0,
      'service-worker': 0,
      style: 0
    }
  })

  this.metadata = this.graph.metadata
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
    if (!data) return cb(new Error(`bankai.scripts: could not find a bundle for "${filename}"`))
    cb(null, data)
  })
}

Bankai.prototype.styles = function (filename, cb) {
  assert.equal(typeof filename, 'string')
  assert.equal(typeof cb, 'function')
  var stepName = 'styles'
  var edgeName = filename.split('.')[0]
  var self = this
  this.queue[stepName].add(function () {
    var data = self.graph.data[stepName][edgeName]
    if (!data) return cb(new Error('bankai.styles: could not find bundle'))
    cb(null, data)
  })
}

Bankai.prototype.documents = function (url, cb) {
  assert.equal(typeof url, 'string')
  assert.equal(typeof cb, 'function')

  var filename = url.split('?')[0]

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

Bankai.prototype.assets = function (filename, cb) {
  assert.equal(typeof filename, 'string')
  assert.equal(typeof cb, 'function')
  var stepName = 'assets'
  var self = this
  this.queue[stepName].add(function () {
    filename = path.join(self.dirname, filename)
    var data = self.metadata.assets[filename]
    if (!data) return cb(new Error('bankai.asset: could not find a file for ' + filename))
    cb(null, filename)
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
