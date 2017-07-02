var hyperstream = require('hyperstream')

module.exports = manifestStream

function manifestStream (manifest) {
  var msg = '<link rel="manifest" href="/manifest.json">'
  if (manifest && manifest['theme_color']) {
    var color = manifest['theme_color']
    msg += '\n<meta name="theme-color" content="' + color + '">'
  }

  return hyperstream({
    head: { _appendHtml: Buffer.from(msg) }
  })
}
