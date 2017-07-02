var hyperstream = require('hyperstream')

var buf = Buffer.from('<link rel="manifest" href="/manifest.json">')

module.exports = manifestStream

function manifestStream (manifest) {
  return hyperstream({
    head: { _appendHtml: buf }
  })
}
