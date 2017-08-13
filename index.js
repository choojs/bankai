var Emitter = require('events').EventEmitter
var graph = require('buffer-graph')
var assert = require('assert')
var path = require('path')

var localization = require('./localization')

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

  this.queue = methods.reduce(function (obj, method) {
    obj[method] = Queue()
    return obj
  }, {})

  this.graph = graph()
  this.graph.on('change', function (nodeName, edgeName, state) {
    self.emit('change', nodeName, edgeName, state)
    var eventName = nodeName + ':' + edgeName
    if (eventName === 'script:bundle') self.queue.script.ready()
    if (eventName === 'manifest:bundle') self.queue.manifest.ready()
  })

  this.graph.on('error', function (err) {
    self.emit('error', err)
  })

  this.graph.node('assets', assetsNode)
  this.graph.node('document', [ 'manifest:color', 'style:bundle', 'assets:favicons', 'script:bundle' ], documentNode)
  this.graph.node('manifest', manifestNode)
  this.graph.node('script', scriptNode)
  this.graph.node('service-worker', [ 'assets:list' ], serviceWorkerNode)
  this.graph.node('style', [ 'script:style', 'script:bundle' ], styleNode)

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

  var bundle = filename.split('.')[0]

  var self = this
  this.queue.script.add(function () {
    var data = self.graph.data.script[bundle]
    if (!data) return cb(new Error('bankai.script: could not find a bundle for ' + filename))
    cb(null, data)
  })
}

Bankai.prototype.style = function (filename, opts) {
}

Bankai.prototype.html = function (filename, opts) {
}

Bankai.prototype.manifest = function (filename, opts) {
}

Bankai.prototype.serviceWorker = function (filename, opts) {
}

Bankai.prototype.assets = function (filename, opts) {
}

function Queue () {
  if (!(this instanceof Queue)) return new Queue()
  this._ready = false
  this._arr = []
}

Queue.prototype.add = function (cb) {
  if (!this._ready) this._arr.push(cb)
  else cb()
}

Queue.prototype.ready = function () {
  this._ready = true
  this._arr.forEach(function (fn) {
    fn()
  })
  this._arr.length = 0 // clean up internal array
}
