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
  state.env = process.env.NODE_ENV === 'production'
    ? 'production'
    : 'development'

  state.cssStream = new stream.PassThrough()
  state.jsRegistered = false
  state.htmlOpts = {}
  state.jsOpts = null
  state.cssReady = false
  state.cssOpts = null
  state.cssBuf = null
  mutate(state, opts)

  return {
    html: html(state),
    css: css(state),
    js: js(state),
    _state: state
  }
}
