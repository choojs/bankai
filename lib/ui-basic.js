var nanoraf = require('nanoraf')
var pretty = require('prettier-bytes')
var gzipSize = require('gzip-size')

module.exports = createLogUI

var files = [
  'assets',
  'documents',
  'scripts',
  'styles',
  'manifest',
  'service-worker'
]

function createLogUI (compiler, state) {
  Object.assign(state, {
    count: compiler.metadata.count,
    files: {},
    size: 0
  })

  files.forEach(function (filename) {
    state.files[filename] = {
      size: 0,
      status: 'pending'
    }
  })

  var render = nanoraf(onrender, raf)

  compiler.on('change', function (nodeName, edgeName, nodeState) {
    var node = nodeState[nodeName][edgeName]
    var data = {
      size: 0,
      status: 'done'
    }
    state.files[nodeName] = data

    // Only calculate the gzip size if there's a buffer. Apparently zipping
    // an empty file means it'll pop out with a 20B base size.
    if (node.buffer.length) {
      gzipSize(node.buffer)
        .then(function (size) { data.size = size })
        .catch(function () { data.size = node.buffer.length })
        .then(render)
    } else {
      render()
    }
  })

  compiler.on('progress', render)
  compiler.on('sse-connect', render)
  compiler.on('sse-disconnect', render)

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
  var sseStatus = state.sse > 0 ? 'connected' : state.port ? 'ready' : 'starting'
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
    `bankai: Live Reload: ${sseStatus}`,
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
