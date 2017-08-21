var critical = require('inline-critical-css')
var documentify = require('documentify')
var explain = require('explain-error')
var concat = require('concat-stream')
var decache = require('decache')
var pump = require('pump')

module.exports = node

// TODO: emit multiple files
function node (state, createEdge) {
  var self = this

  var entry = load(state.arguments.entry)

  var list = []
  var d = documentify()
  d.transform(criticalTransform)

  var source = d.bundle()
  pump(source, concat(sink), function (err) {
    if (err) return self.emit('error', explain(err, 'Error in documentify'))
  })

  function sink (buf) {
    list.push('index.html')
    createEdge('index.html', buf)
    createEdge('list', Buffer.from(list.join(',')))
  }
}

function criticalTransform (opts) {
  return critical(opts.css)
}

function load (name) {
  decache(name)
  return require(name)
}
