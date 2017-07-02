var hyperstream = require('hyperstream')

module.exports = manifestStream

function manifestStream (manifest) {
  return hyperstream({
    head: {
      _append: manifest
    }
  })
}
