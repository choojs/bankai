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
  var tmpfile = path.join(os.tmpdir(), filename)
  fs.writeFileSync(tmpfile, file)

  var compiler = bankai(tmpfile)
  compiler.script('index.js', function (err, res) {
    assert.error(err, 'no error writing script')
    assert.ok(res, 'output exists')
    fs.unlinkSync(tmpfile)
  })
})
