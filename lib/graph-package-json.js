var findup = require('@choojs/findup')
var path = require('path')
var fs = require('fs')

module.exports = node

function node (state, createEdge, emit) {
  findup(state.metadata.dirname, 'package.json', function (err, dir) {
    if (err) {
      createEdge('list', Buffer.from(JSON.stringify({})))
      return
    }
    fs.readFile(path.join(dir, 'package.json'), function (err, json) {
      if (err) {
        createEdge('list', Buffer.from(JSON.stringify({})))
        return
      }

      try {
        var pkg = JSON.parse(json)
        var hasTurbolinksDep = Boolean((pkg.dependencies && pkg.dependencies.turbolinks) ||
          (pkg.devDependencies && pkg.devDependencies.turbolinks))
        createEdge('list', Buffer.from(JSON.stringify({ hasTurbolinksDep })))
      } catch (err) {
        if (err) createEdge('list', Buffer.from(JSON.stringify({})))
      }
    })
  })
}
