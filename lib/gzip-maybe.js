var stream = require('stream')
var zlib = require('zlib')

module.exports = function (req, res) {
  var acceptEncoding = req.headers['accept-encoding']
  if (!acceptEncoding) acceptEncoding = ''

  if (acceptEncoding.match(/\bdeflate\b/)) {
    res.setHeader('Content-Encoding', 'deflate')
    return zlib.createDeflate()
  } else if (acceptEncoding.match(/\bgzip\b/)) {
    res.writeHead(200, { 'Content-Encoding': 'gzip' })
    return zlib.createGzip()
  } else {
    return new stream.PassThrough()
  }
}
