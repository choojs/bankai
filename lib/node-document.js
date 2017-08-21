// var StringDecoder = require('string_decoder').StringDecoder
var critical = require('inline-critical-css')
var documentify = require('documentify')
var explain = require('explain-error')
var concat = require('concat-stream')
var pump = require('pump')
// var through = require('through2')

module.exports = node

// TODO: emit multiple files
function node (state, createEdge) {
  var self = this

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

// function criticalTransform (opts) {
//   var decoder = new StringDecoder('utf8')
//   var src = ''

//   return through(write, flush)

//   function write (chunk, _, cb) {
//     src += decoder.write(chunk)
//     cb()
//   }

//   function flush () {
//     src += decoder.end()
//   }
// }
