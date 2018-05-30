var dedent = require('dedent')
var path = require('path')
var tape = require('tape')
var tmp = require('tmp')
var fs = require('fs')

var bankai = require('../')

tape('extract style from script', function (assert) {
  assert.plan(3)
  var expected = '.foo{color:#00f}'
  var script = dedent`
    var css = require('sheetify')
    var html = require('bel')
    css\`
      .foo { color: blue }
    \`
    html\`<foo class="foo">hello</foo>\`
  `

  var tmpDir = tmp.dirSync({ dir: path.join(__dirname, '../tmp'), unsafeCleanup: true })
  assert.on('end', tmpDir.removeCallback)
  var tmpScriptname = path.join(tmpDir.name, 'index.js')

  fs.writeFileSync(tmpScriptname, script)

  var compiler = bankai(tmpScriptname, { watch: false })
  compiler.styles('bundle.css', function (err, res) {
    assert.error(err, 'no error writing style')
    assert.equal(res.buffer.toString(), expected, 'res was equal')
  })

  compiler.scripts('bundle.js', function (err, res) {
    assert.error(err, 'no error writing script')
  })
})

tape('remove unused styles', function (assert) {
  assert.plan(3)
  var expected = '.foo{color:#00f}'
  var script = dedent`
    var css = require('sheetify')
    var html = require('bel')
    css\`
      .foo { color: blue }
      .bar { color: purple }
    \`
    html\`<foo class="foo">hello</foo>\`
  `

  var tmpDir = tmp.dirSync({ dir: path.join(__dirname, '../tmp'), unsafeCleanup: true })
  assert.on('end', tmpDir.removeCallback)
  var tmpScriptname = path.join(tmpDir.name, 'index.js')

  fs.writeFileSync(tmpScriptname, script)

  var compiler = bankai(tmpScriptname, { watch: false })
  compiler.styles('bundle.css', function (err, res) {
    assert.error(err, 'no error writing style')
    assert.equal(res.buffer.toString(), expected, 'res was equal')
  })

  compiler.scripts('bundle.js', function (err, res) {
    assert.error(err, 'no error writing script')
  })
})
