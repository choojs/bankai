var StringDecoder = require('string_decoder').StringDecoder
var concat = require('concat-stream')
var exorcist = require('exorcist')
var through = require('through2')
var assert = require('assert')
var pump = require('pump')

module.exports = exorcise

function exorcise (buf, name, done) {
  assert.ok(Buffer.isBuffer(buf), 'lib/exorcise: buf should be a buffer')
  assert.strictEqual(typeof name, 'string', 'lib/exorcise: name should be type string')
  assert.strictEqual(typeof done, 'function', 'lib/exorcise: done should be type function')

  done = once(done)

  var bundle, sourceMap

  var exo = ex(name, function (buf) {
    sourceMap = buf
  })

  var sink = concat({ encoding: 'buffer' }, function (buf) {
    bundle = buf
    done(null, bundle, sourceMap)
  })

  pump(exo, sink, function (err) {
    if (err) done(err)
  })

  exo.end(buf)
}

function ex (uri, done) {
  var decoder = new StringDecoder('utf8')
  var stream = through(read, flush)
  var src = ''

  return exorcist(stream, uri)

  function read (chunk, _, cb) {
    src += decoder.write(chunk)
    cb()
  }

  function flush (cb) {
    src += decoder.end()
    done(Buffer.from(src))
    cb()
  }
}

function once (done) {
  var called = false
  return function (err, bundle, maps) {
    if (called) return
    called = true
    done(err, bundle, maps)
  }
}
