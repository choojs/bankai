var path = require('path')
var utils = require('./utils')

module.exports = node

function node (state, createEdge) {
  var dirname = state.metadata.dirname
  var filenames = [
    'favicon.ico',
    'favicon.png',
    'favicon.gif'
  ]

  // find favicon at the root
  utils.find(dirname, filenames, function (err, filename) {
    if (err || filename === void 0) {
      createEdge('bundle', Buffer.from(''))
      return
    }
    createEdge('bundle', Buffer.from(path.relative(dirname, filename)))
  })
}
