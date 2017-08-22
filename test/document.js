var dedent = require('dedent')
var mkdirp = require('mkdirp')
var rimraf = require('rimraf')
var path = require('path')
var tape = require('tape')
var fs = require('fs')

var bankai = require('../')

tape('server render choo apps', function (assert) {
  assert.plan(3)

  var expected = '<!DOCTYPE html><html><head><style></style></head><body>meow</body></html>'
  var script = dedent`
    var html = require('choo/html')
    var choo = require('choo')

    var app = choo()
    app.route('/', function () {
      return html\`<body>meow</body>\`
    })
    if (module.parent) module.exports = app
    else app.mount('body')
  `

  var dirname = 'document-pipeline-' + (Math.random() * 1e4).toFixed()
  var tmpDirname = path.join(__dirname, '../tmp', dirname)
  var tmpScriptname = path.join(tmpDirname, 'index.js')

  mkdirp.sync(tmpDirname)
  fs.writeFileSync(tmpScriptname, script)

  var compiler = bankai(tmpScriptname, { watch: false })
  compiler.document('/', function (err, res) {
    assert.error(err, 'no error writing document')
    assert.equal(String(res.buffer), expected, 'buffer ok')
    rimraf.sync(tmpDirname)
  })

  compiler.script('bundle.js', function (err, res) {
    assert.error(err, 'no error writing script')
  })
})
