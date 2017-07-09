var hyperstream = require('hyperstream')

module.exports = titleStream

function titleStream (title) {
  var msg = '<title>' + title + '</title>'
  return hyperstream({
    head: { _appendHtml: Buffer.from(msg) }
  })
}
