var assertHtml = require('assert-html')
var dedent = require('dedent')
var mkdirp = require('mkdirp')
var rimraf = require('rimraf')
var path = require('path')
var tape = require('tape')
var fs = require('fs')

var bankai = require('../')

tape('renders some HTML', function (assert) {
  assert.plan(14)

  var expected = `
    <!DOCTYPE html>
    <html>
      <head>
        <style></style>
        <link rel="stylesheet" href="/styles/e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855/bundle.css" media="none" onload="if(media!=='all')media='all'">
        <script src="/scripts/27930b57cfcfa9afbc9328fea74cea94389f4319c8f4f7ca1def3750ae954b8b/bundle.js" defer></script>
      </head>
      <body></body>
    </html>
  `.replace(/\n +/g, '')

  var script = dedent`
    1 + 1
  `

  var dirname = 'document-pipeline-' + (Math.random() * 1e4).toFixed()
  var tmpDirname = path.join(__dirname, '../tmp', dirname)
  var tmpScriptname = path.join(tmpDirname, 'index.js')

  mkdirp.sync(tmpDirname)
  fs.writeFileSync(tmpScriptname, script)

  var compiler = bankai(tmpScriptname, { watch: false })
  compiler.document('/', function (err, res) {
    assert.error(err, 'no error writing document')
    assertHtml(assert, String(res.buffer), expected)
    rimraf.sync(tmpDirname)
  })

  compiler.script('bundle.js', function (err, res) {
    assert.error(err, 'no error writing script')
  })
})

tape('server render choo apps', function (assert) {
  assert.plan(15)

  var expected = `
    <!DOCTYPE html>
    <html>
      <head>
        <style></style>
        <link rel="stylesheet" href="/styles/e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855/bundle.css" media="none" onload="if(media!=='all')media='all'">
        <script src="/scripts/c7dc8debf10b6f5e9aca1cb67215b3f107e38edbae5981744a6287775ef547a9/bundle.js" defer></script>
      </head>
      <body>
        meow
      </body>
    </html>
  `.replace(/\n +/g, '')

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
    assertHtml(assert, String(res.buffer), expected)
    rimraf.sync(tmpDirname)
  })

  compiler.script('bundle.js', function (err, res) {
    assert.error(err, 'no error writing script')
  })
})
