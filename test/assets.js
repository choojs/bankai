var dedent = require('dedent')
var rimraf = require('rimraf')
var path = require('path')
var tape = require('tape')
var fs = require('fs')
var os = require('os')

var bankai = require('../')

tape('run an asset pipeline', function (assert) {
  assert.plan(3)
  var script = dedent`
    console.log('meow')
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

  var compiler = bankai(tmpScriptname)
  compiler.script('bundle.js', function (err, res) {
    assert.error(err, 'no error writing script')
    rimraf.sync(tmpDirname)
  })

  compiler.asset('assets/file.txt', function (err, buf) {
    assert.error(err, 'no error reading file')
    assert.ok(buf, 'buffer is fine fine fine')
  })
})
