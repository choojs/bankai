var assertHtml = require('assert-html')
var dedent = require('dedent')
var mkdirp = require('mkdirp')
var rimraf = require('rimraf')
var path = require('path')
var tape = require('tape')
var fs = require('fs')

var bankai = require('../')

tape('renders some HTML', function (assert) {
  var expected = `
    <!DOCTYPE html>
    <html lang="en-US" dir="ltr">
      <head>
        <script src="https://cdn.polyfill.io/v2/polyfill.min.js" defer></script>
        <script src="/8675b35975a61e2e/bundle.js" defer></script>
        <link rel="preload" as="style" href="/ebfdda3dbc9e925b/bundle.css" onload="this.rel='stylesheet'">
        <link rel="manifest" href="/manifest.json">
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="description" content=>
        <meta name="theme-color" content=#fff>
        <title></title>
        <style></style>
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
  compiler.documents('/', function (err, res) {
    assert.error(err, 'no error writing document')
    assertHtml(assert, String(res.buffer), expected)
    rimraf.sync(tmpDirname)
    assert.end()
  })

  compiler.scripts('bundle.js', function (err, res) {
    assert.error(err, 'no error writing script')
  })
})

tape('server render choo apps', function (assert) {
  var expected = `
    <!DOCTYPE html>
    <html lang="en-US" dir="ltr">
      <head>
        <script src="https://cdn.polyfill.io/v2/polyfill.min.js" defer></script>
        <script src="/2435e158c2ea202c/bundle.js" defer></script>
        <link rel="preload" as="style" href="/ebfdda3dbc9e925b/bundle.css" onload="this.rel='stylesheet'">
        <link rel="manifest" href="/manifest.json">
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="description" content=>
        <meta name="theme-color" content=#fff>
        <title></title>
        <style></style>
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
  compiler.documents('/', function (err, res) {
    assert.error(err, 'no error writing document')
    assertHtml(assert, String(res.buffer), expected)
    rimraf.sync(tmpDirname)
    assert.end()
  })

  compiler.scripts('bundle.js', function (err, res) {
    assert.error(err, 'no error writing script')
  })
})
