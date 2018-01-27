var dedent = require('dedent')
var rimraf = require('rimraf')
var path = require('path')
var tape = require('tape')
var fs = require('fs')
var os = require('os')

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

  var dirname = 'style-pipeline-' + (Math.random() * 1e4).toFixed()
  var tmpDirname = path.join(os.tmpdir(), dirname)
  var tmpScriptname = path.join(tmpDirname, 'index.js')

  fs.mkdirSync(tmpDirname)
  fs.writeFileSync(tmpScriptname, script)

  var compiler = bankai(tmpScriptname, { watch: false })
  compiler.styles('bundle.css', function (err, res) {
    assert.error(err, 'no error writing style')
    assert.equal(res.buffer.toString(), expected, 'res was equal')
    rimraf.sync(tmpDirname)
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

  var dirname = 'style-pipeline-' + (Math.random() * 1e4).toFixed()
  var tmpDirname = path.join(os.tmpdir(), dirname)
  var tmpScriptname = path.join(tmpDirname, 'index.js')

  fs.mkdirSync(tmpDirname)
  fs.writeFileSync(tmpScriptname, script)

  var compiler = bankai(tmpScriptname, { watch: false })
  compiler.styles('bundle.css', function (err, res) {
    assert.error(err, 'no error writing style')
    assert.equal(res.buffer.toString(), expected, 'res was equal')
    rimraf.sync(tmpDirname)
  })

  compiler.scripts('bundle.js', function (err, res) {
    assert.error(err, 'no error writing script')
  })
})
