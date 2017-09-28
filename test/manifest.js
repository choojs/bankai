var dedent = require('dedent')
var rimraf = require('rimraf')
var path = require('path')
var tape = require('tape')
var fs = require('fs')
var os = require('os')

var bankai = require('../')
var tmpDirname

function cleanup () {
  rimraf.sync(tmpDirname)
}

tape('read a manifest', function (assert) {
  assert.on('end', cleanup)
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

  var dirname = 'manifest-pipeline-' + (Math.random() * 1e4).toFixed()
  tmpDirname = path.join(os.tmpdir(), dirname)
  var tmpScriptname = path.join(tmpDirname, 'index.js')
  var tmpManifestname = path.join(tmpDirname, 'manifest.json')

  fs.mkdirSync(tmpDirname)
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
  assert.on('end', cleanup)
  assert.plan(3)

  var script = dedent`
    1 + 1
  `

  var dirname = 'manifest-pipeline-' + (Math.random() * 1e4).toFixed()
  tmpDirname = path.join(os.tmpdir(), dirname)
  var tmpScriptname = path.join(tmpDirname, 'index.js')

  fs.mkdirSync(tmpDirname)
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

tape('should watch the manifest for changes', function (assert) {
  assert.on('end', function () {
    compiler.close()
    cleanup()
  })
  assert.plan(12)

  var script = dedent`
    1 + 1
  `

  var manifest1 = dedent`
    { "name": "foo" }
  `

  var manifest2 = dedent`
    { "name": "bar" }
  `

  var dirname = 'manifest-pipeline-' + (Math.random() * 1e4).toFixed()
  tmpDirname = path.join(os.tmpdir(), dirname)
  var tmpScriptname = path.join(tmpDirname, 'index.js')
  var tmpManifestname = path.join(tmpDirname, 'manifest.json')

  fs.mkdirSync(tmpDirname)
  fs.writeFileSync(tmpScriptname, script)
  fs.writeFileSync(tmpManifestname, manifest1)

  var compiler = bankai(tmpScriptname)
  compiler.manifest(function (err, res) {
    assert.error(err, 'no error writing manifest')
    assert.ok(res, 'output exists')
    assert.ok(res.buffer, 'output buffer exists')
    assert.ok(res.hash, 'output hash exists')
    assert.ok(/foo/.exec(String(res.buffer)), 'contains foo')

    compiler.on('change', function (nodeName) {
      if (nodeName !== 'manifest') return
      compiler.manifest(function (err, res) {
        assert.error(err, 'no error writing manifest')
        assert.ok(res, 'output exists')
        assert.ok(res.buffer, 'output buffer exists')
        assert.ok(res.hash, 'output hash exists')
        assert.ok(/bar/.exec(String(res.buffer)), 'contains bar')
      })
    })

    fs.writeFile(tmpManifestname, manifest2, function (err) {
      assert.error(err, 'no error writing manifest 2')
    })
  })

  compiler.scripts('bundle.js', function (err, res) {
    assert.error(err, 'no error writing script')
  })
})
