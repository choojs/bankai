var findup = require('findup')
var path = require('path')

var filename = 'manifest.json'

module.exports = findManifest

function findManifest (location, cb) {
  findup(location, filename, function (err, dir) {
    if (err) return cb(err)
    var file = path.join(dir, filename)
    cb(null, file)
  })
}
