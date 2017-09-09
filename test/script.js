var dedent = require('dedent')
var rimraf = require('rimraf')
var path = require('path')
var tape = require('tape')
var fs = require('fs')
var os = require('os')

var bankai = require('../')

tape('run a JS pipeline', function (assert) {
  assert.plan(4)
  var file = dedent`
    1 + 1
  `

  var filename = 'js-pipeline-' + (Math.random() * 1e4).toFixed() + '.js'
  var tmpFilename = path.join(os.tmpdir(), filename)
  fs.writeFileSync(tmpFilename, file)

  var compiler = bankai(tmpFilename, { watch: false })
  compiler.scripts('bundle.js', function (err, res) {
    assert.error(err, 'no error writing script')
    assert.ok(res, 'output exists')
    assert.ok(res.buffer, 'output buffer exists')
    assert.ok(res.hash, 'output hash exists')
    rimraf.sync(tmpFilename)
  })
})

tape('return an error if an incorrect script is selected', function (assert) {
  assert.plan(1)
  var file = dedent`
    1 + 1
  `

  var filename = 'js-pipeline-' + (Math.random() * 1e4).toFixed() + '.js'
  var tmpFilename = path.join(os.tmpdir(), filename)
  fs.writeFileSync(tmpFilename, file)

  var compiler = bankai(tmpFilename, { watch: false })
  compiler.scripts('bad-bad-not-good.js', function (err, res) {
    assert.ok(err, 'error writing script')
    rimraf.sync(tmpFilename)
  })
})
