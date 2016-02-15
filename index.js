const stream = require('readable-stream')
const Emitter = require('events')

const state = new Emitter()

state.cssStream = new stream.PassThrough()
state.jsRegistered = false
state.cssReady = false
state.cssOpts = null
state.cssBuf = null

exports.html = require('./handler-html')(state)
exports.css = require('./handler-css')(state)
exports.js = require('./handler-js')(state)
