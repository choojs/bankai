var concat = require('concat-stream')

module.exports = function (emitter) {
  return function (req, res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    })

    res.write('retry: 10000\n')

    emitter.on('js-bundle', handleJs)
    emitter.on('css-bundle', handleCss)

    req.connection.once('close', function () {
      emitter.removeListener('js-bundle', handleJs)
      emitter.removeListener('css-bundle', handleCss)
    }, false)

    function handleJs (bundleStream) {
      bundleStream.pipe(concat({ encoding: 'string' }, function (bundle) {
        var msg = JSON.stringify({
          type: 'js',
          bundle: bundle
        })
        res.write('data: ' + msg + '\n\n')
      }))
    }

    function handleCss (bundle) {
      var msg = JSON.stringify({
        type: 'css',
        bundle: bundle.toString()
      })
      res.write('data: ' + msg + '\n\n')
    }
  }
}
