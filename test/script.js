var dedent = require('dedent')
var path = require('path')
var tape = require('tape')
var fs = require('fs')
var os = require('os')

var bankai = require('../')

tape('run a JS pipeline', function (assert) {
  assert.plan(2)
  var file = dedent`
    console.log('meow')
  `

  var filename = 'js-pipeline-' + (Math.random() * 1e4).toFixed() + '.js'
  var tmpFilename = path.join(os.tmpdir(), filename)
  fs.writeFileSync(tmpFilename, file)

  var compiler = bankai(tmpFilename)
  compiler.script('bundle.js', function (err, res) {
    assert.error(err, 'no error writing script')
    assert.ok(res, 'output exists')
    fs.unlinkSync(tmpFilename)
  })
})

tape('run a JS pipeline', function (assert) {
  assert.plan(1)
  var file = dedent`
    console.log('meow')
  `

  var filename = 'js-pipeline-' + (Math.random() * 1e4).toFixed() + '.js'
  var tmpFilename = path.join(os.tmpdir(), filename)
  fs.writeFileSync(tmpFilename, file)

  var compiler = bankai(tmpFilename)
  compiler.script('bad-bad-not-good.js', function (err, res) {
    assert.ok(err, 'error writing script')
    fs.unlinkSync(tmpFilename)
  })
})
