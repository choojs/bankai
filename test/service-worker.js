var dedent = require('dedent')
var path = require('path')
var tape = require('tape')
var tmp = require('tmp')
var fs = require('fs')

var bankai = require('../')

tape('read a manifest', function (assert) {
  assert.plan(5)
  var script = dedent`
    1 + 1
  `

  var manifest = dedent`
    {
      "name": "demo",
      "short_name": "demo",
      "description": "A very cute app",
      "start_url": "/",
      "display": "standalone",
      "background_color": "#ffc0cb",
      "theme_color": "#ffc0cb",
      "icons": [{
        "src": "/assets/icon.png",
        "type": "image/png",
        "sizes": "512x512"
      }]
    }
  `

  var tmpDir = tmp.dirSync({ dir: path.join(__dirname, '../tmp'), unsafeCleanup: true })
  assert.on('end', tmpDir.removeCallback)
  var tmpScriptname = path.join(tmpDir.name, 'index.js')
  var tmpManifestname = path.join(tmpDir.name, 'manifest.json')

  fs.writeFileSync(tmpScriptname, script)
  fs.writeFileSync(tmpManifestname, manifest)

  var compiler = bankai(tmpScriptname, { watch: false })
  compiler.manifest(function (err, res) {
    assert.error(err, 'no error writing manifest')
    assert.ok(res, 'output exists')
    assert.ok(res.buffer, 'output buffer exists')
    assert.ok(res.hash, 'output hash exists')
  })

  compiler.scripts('bundle.js', function (err, res) {
    assert.error(err, 'no error writing script')
  })
})

tape('should provide a default manifest', function (assert) {
  assert.plan(3)
  var script = dedent`
    1 + 1
  `

  var tmpDir = tmp.dirSync({ dir: path.join(__dirname, '../tmp'), unsafeCleanup: true })
  assert.on('end', tmpDir.removeCallback)
  var tmpScriptname = path.join(tmpDir.name, 'index.js')

  fs.writeFileSync(tmpScriptname, script)

  var compiler = bankai(tmpScriptname, { watch: false })
  compiler.manifest(function (err, res) {
    assert.error(err, 'no error writing manifest')
    assert.ok(res, 'output exists')
  })

  compiler.scripts('bundle.js', function (err, res) {
    assert.error(err, 'no error writing script')
  })
})
