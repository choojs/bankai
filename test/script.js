var dedent = require('dedent')
var rimraf = require('rimraf')
var mkdirp = require('mkdirp')
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

tape('output multiple bundles if `split-require` is used', function (assert) {
  assert.plan(2)

  var file = `
    require('split-require')('./dynamic')
  `
  var dynamicFile = `
    console.log('loaded')
    module.exports = null
  `

  var tmpDirname = path.join(__dirname, '../tmp', 'js-pipeline-' + (Math.random() * 1e4).toFixed())
  mkdirp.sync(tmpDirname)
  fs.writeFileSync(path.join(tmpDirname, 'app.js'), file)
  fs.writeFileSync(path.join(tmpDirname, 'dynamic.js'), dynamicFile)

  var compiler = bankai(path.join(tmpDirname, 'app.js'), { watch: false })
  compiler.scripts('bundle.js', function (err, res) {
    assert.error(err, 'error writing main bundle')
    var dynamicName = /bundle-\d+\.js/.exec(res.buffer.toString('utf-8'))
    compiler.scripts(dynamicName[0], function (err, res) {
      assert.error(err, 'error writing dynamic bundle')

      rimraf.sync(tmpDirname)
    })
  })
})

tape('use custom babel config for local files, but not for dependencies', function (assert) {
  assert.plan(2)

  var babelPlugin = `
    module.exports = function (b) {
      return {
        visitor: {
          Program: function (path) {
            path.unshiftContainer('body', b.types.stringLiteral('hello'))
          }
        }
      }
    }
  `
  var babelrc = JSON.stringify({
    plugins: ['./plugin']
  })
  var file = `
   require('a-module-with-babelrc')
  `

  var tmpDirname = path.join(__dirname, '../tmp', 'js-pipeline-' + (Math.random() * 1e4).toFixed())
  mkdirp.sync(tmpDirname)
  fs.writeFileSync(path.join(tmpDirname, 'plugin.js'), babelPlugin)
  fs.writeFileSync(path.join(tmpDirname, '.babelrc'), babelrc)
  fs.writeFileSync(path.join(tmpDirname, 'app.js'), file)

  var compiler = bankai(path.join(tmpDirname, 'app.js'), { watch: false })
  compiler.on('error', assert.error)
  compiler.scripts('bundle.js', function (err, res) {
    assert.error(err, 'error building .babelrc dependency')
    assert.pass('should build')
  })
})
