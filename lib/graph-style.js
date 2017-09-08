var purify = require('purify-css')
var Clean = require('clean-css')
var assert = require('assert')

var clean = new Clean(createCleanCssOptions())
var log = null

module.exports = node

function node (state, createEdge) {
  assert.equal(typeof state.arguments.entry, 'string', 'state.arguments.entries should be type string')

  assert.ok(state.script.bundle, 'bankai/node-style: state.script.bundle exists')
  assert.ok(state.script.style, 'bankai/node-style: state.script.style exists')

  log = log || state.arguments.log.child({ name: 'style' })

  var script = String(state.script.bundle.buffer)
  var style = String(state.script.style.buffer)
  var bundle

  try {
    bundle = purify(script, style, { minify: true })
  } catch (e) {
    log.error('purify-css', e)
  }

  try {
    bundle = clean.minify(bundle).styles
  } catch (e) {
    log.error('clean-css', e)
  }

  createEdge('bundle', Buffer.from(bundle))
}

function createCleanCssOptions () {
  return {
    level: {
      1: {
        specialComments: 0
      }
    }
  }
}
