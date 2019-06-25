var dedent = require('dedent')
var path = require('path')
var tape = require('tape')
var http = require('http')
var tmp = require('tmp')
var fs = require('fs')

var bankai = require('../http')

var tmpScriptname

function setup (assert) {
  var script = dedent`
    var css = require('sheetify')
    var html = require('bel')
    css\`
      .foo { color: blue }
    \`
    html\`<foo class="foo">hello</foo>\`
  `

  var file = dedent`
    hello planet
  `

  var tmpDir = tmp.dirSync({ dir: path.join(__dirname, '../tmp'), unsafeCleanup: true })
  assert.on('end', tmpDir.removeCallback)
  var contentDirname = path.join(tmpDir.name, 'content')
  var assetDirname = path.join(tmpDir.name, 'assets')
  var assetSubdirname = path.join(assetDirname, 'images')

  tmpScriptname = path.join(tmpDir.name, 'index.js')
  var tmpFilename = path.join(contentDirname, 'file.txt')
  var tmpAssetJsFilename = path.join(assetDirname, 'file.js')
  var tmpAssetCssFilename = path.join(assetDirname, 'file.css')
  var tmpJsonFilename = path.join(assetDirname, 'file.json')
  var tmpJpgFilename = path.join(assetDirname, 'file.jpg')
  var tmpJpgSubFilename = path.join(assetSubdirname, 'file.jpg')

  fs.mkdirSync(contentDirname)
  fs.mkdirSync(assetDirname)
  fs.mkdirSync(assetSubdirname)
  fs.writeFileSync(tmpScriptname, script)
  fs.writeFileSync(tmpFilename, file)
  fs.writeFileSync(tmpAssetJsFilename, file)
  fs.writeFileSync(tmpAssetCssFilename, file)
  fs.writeFileSync(tmpJsonFilename, file)
  fs.writeFileSync(tmpJpgFilename, file)
  fs.writeFileSync(tmpJpgSubFilename, file)
}

tape('should route urls appropriately', function (assert) {
  setup(assert)
  var handler = bankai(tmpScriptname, { watch: false, quiet: true })
  var server = http.createServer(function (req, res) {
    handler(req, res, function () {
      res.statusCode = 404
      res.end('not found')
    })
  })

  server.listen(3030, function () {
    console.log('listening on port 3030')
  })

  var urls = [
    '/bundle.js',
    '/bundle.js?cache=busted',
    '/bundle.css',
    '/bundle.css?cache=busted',
    '/content/file.txt',
    '/content/file.txt?cache=busted',
    '/assets/file.json',
    '/assets/file.css',
    '/assets/file.css?cache=busted',
    '/assets/file.js',
    '/assets/file.js?cache=busted',
    '/assets/file.json?cache=busted',
    '/assets/file.jpg',
    '/assets/file.jpg?cache=busted',
    '/assets/images/file.jpg',
    '/assets/images/file.jpg?cache=busted'
  ]

  var count = 0
  urls.forEach(function (url) {
    http.get('http://localhost:3030' + url, function (res) {
      assert.equal(res.statusCode, 200, url)
      if (++count === urls.length) {
        server.close()
        assert.end()
      }
    })
  })
})
