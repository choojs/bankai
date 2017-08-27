var purify = require('purify-css')
var assert = require('assert')

module.exports = node

function node (state, createEdge) {
  assert.equal(typeof state.arguments.entry, 'string', 'state.arguments.entries should be type string')

  assert.ok(state.script.bundle, 'bankai/node-style: state.script.bundle exists')
  assert.ok(state.script.style, 'bankai/node-style: state.script.style exists')

  var script = String(state.script.bundle.buffer)
  var style = String(state.script.style.buffer)

  var bundle = purify(script, style, { minify: true })
  createEdge('bundle', Buffer.from(bundle))
}
