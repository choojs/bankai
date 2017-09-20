var dedent = require('dedent')
var rimraf = require('rimraf')
var path = require('path')
var tape = require('tape')
var fs = require('fs')
var os = require('os')

var bankai = require('../')

tape('run an asset pipeline', function (assert) {
  var script = dedent`
    1 + 1
  `

  var file = dedent`
    hello planet
  `

  var dirname = 'manifest-pipeline-' + (Math.random() * 1e4).toFixed()
  var tmpDirname = path.join(os.tmpdir(), dirname)
  var assetDirname = path.join(os.tmpdir(), dirname, 'assets')

  var tmpScriptname = path.join(tmpDirname, 'index.js')
  var tmpManifestname = path.join(assetDirname, 'file.txt')

  fs.mkdirSync(tmpDirname)
  fs.mkdirSync(assetDirname)
  fs.writeFileSync(tmpScriptname, script)
  fs.writeFileSync(tmpManifestname, file)

  var compiler = bankai(tmpScriptname, { watch: false })
  compiler.on('error', function (name, sub, err) {
    assert.notOk(`${name}:${sub}`, 'no error')
  })
  compiler.scripts('bundle.js', function (err, res) {
    assert.error(err, 'no error writing script')
  })

  compiler.on('error', function (one, two, err) {
    assert.error(err)
  })

  compiler.on('change', function (first, second) {
    var name = `${first}:${second}`
    if (name === 'documents:list') {
      rimraf.sync(tmpDirname)
      assert.end()
    }
  })

  compiler.assets('assets/file.txt', function (err, buf) {
    assert.error(err, 'no error reading file')
    assert.ok(buf, 'buffer is fine fine fine')
  })
})
