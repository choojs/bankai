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

tape('run an asset pipeline', function (assert) {
  assert.on('end', cleanup)
  var script = dedent`
    1 + 1
  `

  var file = dedent`
    hello planet
  `

  var dirname = 'asset-pipeline-' + (Math.random() * 1e4).toFixed()
  tmpDirname = path.join(os.tmpdir(), dirname)
  var assetDirname = path.join(os.tmpdir(), dirname, 'assets')

  var tmpScriptname = path.join(tmpDirname, 'index.js')
  var tmpFilename = path.join(assetDirname, 'file.txt')

  fs.mkdirSync(tmpDirname)
  fs.mkdirSync(assetDirname)
  fs.writeFileSync(tmpScriptname, script)
  fs.writeFileSync(tmpFilename, file)

  var compiler = bankai(tmpScriptname, { watch: false })

  compiler.on('error', function (name, sub, err) {
    assert.error(err, 'no error')
  })

  compiler.on('change', function (nodeName, second) {
    if (nodeName !== 'documents' || second !== 'list') return
    assert.end()
  })

  compiler.assets('assets/file.txt', function (err, buf) {
    assert.error(err, 'no error reading file')
    assert.ok(buf, 'buffer is fine fine fine')
  })
})

tape('use correct asset dir when entry point is a dir', function (assert) {
  assert.on('end', cleanup)

  var script = dedent`
    document.body.textContent = 'Whatever'
  `
  var file = dedent`
    a file!!!
  `

  var dirname = 'asset-pipeline-' + (Math.random() * 1e4).toFixed()
  tmpDirname = path.join(os.tmpdir(), dirname)
  var assetDirname = path.join(os.tmpdir(), dirname, 'assets')

  var tmpScriptname = path.join(tmpDirname, 'index.js')
  var tmpFilename = path.join(assetDirname, 'file.txt')

  fs.mkdirSync(tmpDirname)
  fs.mkdirSync(assetDirname)
  fs.writeFileSync(tmpScriptname, script)
  fs.writeFileSync(tmpFilename, file)

  var compiler = bankai(tmpDirname, { watch: false })

  compiler.on('error', function (name, sub, err) {
    assert.error(err, 'no error')
  })

  compiler.assets('assets/file.txt', function (err, buf) {
    assert.error(err, 'no error reading file')
    assert.ok(buf, 'buffer is fine fine fine')
    assert.equal(buf, tmpFilename)
  })

  compiler.on('change', function (nodeName, second) {
    if (nodeName !== 'documents' || second !== 'list') return
    assert.end()
  })
})
