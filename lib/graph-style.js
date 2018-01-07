var Purgecss = require('purgecss')
var Clean = require('clean-css')
var assert = require('assert')

var clean = new Clean(createCleanCssOptions())

module.exports = node

function node (state, createEdge) {
  assert.equal(typeof state.metadata.entry, 'string', 'state.metadata.entries should be type string')

  assert.ok(state.scripts.bundle, 'bankai/node-style: state.script.bundle exists')
  assert.ok(state.scripts.style, 'bankai/node-style: state.script.style exists')

  var script = String(state.scripts.bundle.buffer)
  var style = String(state.scripts.style.buffer)
  var bundle

  try {
    bundle = new Purgecss({
      content: [{
        raw: script
      }],
      css: [style],
      stdin: true
    }).purge()[0].css
  } catch (e) {
    this.emit('error', 'styles', 'purgecss', e)
  }

  try {
    bundle = clean.minify(bundle).styles
  } catch (e) {
    this.emit('error', 'styles', 'clean-css', e)
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
