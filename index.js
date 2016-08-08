const stream = require('readable-stream')
const mutate = require('xtend/mutable')
const Emitter = require('events')

const html = require('./handler-html')
const css = require('./handler-css')
const js = require('./handler-js')

module.exports = bankai

// create a new bankai instance
// (obj?) -> obj
function bankai (opts) {
  opts = opts || {}

  const state = new Emitter()
  state.cssStream = new stream.PassThrough()
  state.cssBuf = null
  state.jsRegistered = false
  state.cssReady = false
  state.cssOpts = null
  mutate(state, opts)

  return {
    html: html(state),
    css: css(state),
    js: js(state)
  }
}
