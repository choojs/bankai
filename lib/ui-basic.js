var nanoraf = require('nanoraf')
var pretty = require('prettier-bytes')
module.exports = render

function render (state) {
  var diff = new Differ(state)

  var renderRaf = nanoraf(onrender, raf)
  return renderRaf

  function onrender () {
    diff.update(state)
  }
}

function raf (cb) {
  setTimeout(cb, 50)
}

function view (state) {
  var ssrState = 'Pending'
  if (state.ssr) {
    if (state.ssr.success) ssrState = 'Success'
    else ssrState = 'Skipped - ' + state.ssr.error.message
  }
  var SSEStatus = state.sse > 0 ? 'connected' : state.port ? 'ready' : 'starting'
  var httpStatus = state.port ? 'https://localhost:' + state.port : 'starting'

  var allFilesDone = true
  var size = Object.keys(state.files).reduce(function (num, filename) {
    var file = state.files[filename]
    if (file.status !== 'done') allFilesDone = false
    return num + file.size
  }, 0)

  var files = state.files

  var output = [
    `bankai: HTTP Status: ${httpStatus}`,
    `bankai: Live Reload: ${SSEStatus}`,
    `bankai: Server Side Rendering: ${ssrState}`,
    `bankai: assets ${files.assets ? files.assets.status : 'starting'}`,
    `bankai: documents ${files.documents ? files.documents.status : 'starting'}`,
    `bankai: scripts ${files.scripts ? files.scripts.status : 'starting'}`,
    `bankai: styles ${files.styles ? files.styles.status : 'starting'}`,
    `bankai: manifest ${files.manifest ? files.manifest.status : 'starting'}`,
    `bankai: service-worker ${files['service-worker'] ? files['service-worker'].status : 'starting'}`,
    `bankai: Total File size: ${allFilesDone ? pretty(size).replace(' ', '') : 'pending'} `
  ]
  return output
}

function Differ (state) {
  var logLines = view(state)
  console.log(logLines.join('\n'))
  this.oldState = logLines
}

Differ.prototype.update = function (state) {
  var newState = view(state)

  this.oldState.forEach((line, i) => {
    if (line !== newState[i]) console.log(newState[i])
  })

  this.oldState = newState
}
