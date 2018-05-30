var dedent = require('dedent')
var path = require('path')
var tape = require('tape')
var tmp = require('tmp')
var fs = require('fs')

var bankai = require('../')

tape('run an asset pipeline', function (assert) {
  var script = dedent`
    1 + 1
  `

  var file = dedent`
    hello planet
  `

  var tmpDir = tmp.dirSync({ dir: path.join(__dirname, '../tmp'), unsafeCleanup: true })
  assert.on('end', tmpDir.removeCallback)
  var assetDirname = path.join(tmpDir.name, 'assets')

  var tmpScriptname = path.join(tmpDir.name, 'index.js')
  var tmpFilename = path.join(assetDirname, 'file.txt')

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
  var script = dedent`
    document.body.textContent = 'Whatever'
  `
  var file = dedent`
    a file!!!
  `

  var tmpDir = tmp.dirSync({ dir: path.join(__dirname, '../tmp'), unsafeCleanup: true })
  assert.on('end', tmpDir.removeCallback)
  var assetDirname = path.join(tmpDir.name, 'assets')

  var tmpScriptname = path.join(tmpDir.name, 'index.js')
  var tmpFilename = path.join(assetDirname, 'file.txt')

  fs.mkdirSync(assetDirname)
  fs.writeFileSync(tmpScriptname, script)
  fs.writeFileSync(tmpFilename, file)

  var compiler = bankai(tmpDir.name, { watch: false })

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
