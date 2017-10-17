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
        <script src="/__HASH__/bundle.js" defer></script>
        <link rel="preload" as="style" href="/ebfdda3dbc9e925b/bundle.css" onload="this.rel='stylesheet'">
        <script>;(function(a){"use strict";var b=function(b,c,d){function e(a){return h.body?a():void setTimeout(function(){e(a)})}function f(){i.addEventListener&&i.removeEventListener("load",f),i.media=d||"all"}var g,h=a.document,i=h.createElement("link");if(c)g=c;else{var j=(h.body||h.getElementsByTagName("head")[0]).childNodes;g=j[j.length-1]}var k=h.styleSheets;i.rel="stylesheet",i.href=b,i.media="only x",e(function(){g.parentNode.insertBefore(i,c?g:g.nextSibling)});var l=function(a){for(var b=i.href,c=k.length;c--;)if(k[c].href===b)return a();setTimeout(function(){l(a)})};return i.addEventListener&&i.addEventListener("load",f),i.onloadcssdefined=l,l(f),i};"undefined"!=typeof exports?exports.loadCSS=b:a.loadCSS=b})("undefined"!=typeof global?global:this);;(function(a){if(a.loadCSS){var b=loadCSS.relpreload={};if(b.support=function(){try{return a.document.createElement("link").relList.supports("preload")}catch(b){return!1}},b.poly=function(){for(var b=a.document.getElementsByTagName("link"),c=0;c<b.length;c++){var d=b[c];"preload"===d.rel&&"style"===d.getAttribute("as")&&(a.loadCSS(d.href,d,d.getAttribute("media")),d.rel=null)}},!b.support()){b.poly();var c=a.setInterval(b.poly,300);a.addEventListener&&a.addEventListener("load",function(){b.poly(),a.clearInterval(c)}),a.attachEvent&&a.attachEvent("onload",function(){a.clearInterval(c)})}}})(this);</script>
        <link rel="manifest" href="/manifest.json">
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="description" content=>
        <meta name="theme-color" content=#fff>
        <title></title>
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
    expected = expected.replace('__HASH__', res.hash)
    assert.error(err, 'no error writing script')
  })
})

tape('server render choo apps', function (assert) {
  var expected = `
    <!DOCTYPE html>
    <html lang="en-US" dir="ltr">
      <head>
        <script src="https://cdn.polyfill.io/v2/polyfill.min.js" defer></script>
        <script src="/__HASH__/bundle.js" defer></script>
        <link rel="preload" as="style" href="/ebfdda3dbc9e925b/bundle.css" onload="this.rel='stylesheet'">
        <script>;(function(a){"use strict";var b=function(b,c,d){function e(a){return h.body?a():void setTimeout(function(){e(a)})}function f(){i.addEventListener&&i.removeEventListener("load",f),i.media=d||"all"}var g,h=a.document,i=h.createElement("link");if(c)g=c;else{var j=(h.body||h.getElementsByTagName("head")[0]).childNodes;g=j[j.length-1]}var k=h.styleSheets;i.rel="stylesheet",i.href=b,i.media="only x",e(function(){g.parentNode.insertBefore(i,c?g:g.nextSibling)});var l=function(a){for(var b=i.href,c=k.length;c--;)if(k[c].href===b)return a();setTimeout(function(){l(a)})};return i.addEventListener&&i.addEventListener("load",f),i.onloadcssdefined=l,l(f),i};"undefined"!=typeof exports?exports.loadCSS=b:a.loadCSS=b})("undefined"!=typeof global?global:this);;(function(a){if(a.loadCSS){var b=loadCSS.relpreload={};if(b.support=function(){try{return a.document.createElement("link").relList.supports("preload")}catch(b){return!1}},b.poly=function(){for(var b=a.document.getElementsByTagName("link"),c=0;c<b.length;c++){var d=b[c];"preload"===d.rel&&"style"===d.getAttribute("as")&&(a.loadCSS(d.href,d,d.getAttribute("media")),d.rel=null)}},!b.support()){b.poly();var c=a.setInterval(b.poly,300);a.addEventListener&&a.addEventListener("load",function(){b.poly(),a.clearInterval(c)}),a.attachEvent&&a.attachEvent("onload",function(){a.clearInterval(c)})}}})(this);</script>
        <link rel="manifest" href="/manifest.json">
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="description" content=>
        <meta name="theme-color" content=#fff>
        <title></title>
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
    expected = expected.replace('__HASH__', res.hash)
    assert.error(err, 'no error writing script')
  })
})
