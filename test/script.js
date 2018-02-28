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

tape('use custom browserslist config', function (assert) {
  assert.plan(5)

  var browserslist = `
    last 1 Chrome versions
  `
  var file = `
    for (const value of generator()) {}
    function * generator () {
      yield 'foo'
    }
  `

  var tmpDirname = path.join(__dirname, '../tmp', 'js-pipeline-' + (Math.random() * 1e4).toFixed())
  mkdirp.sync(tmpDirname)
  fs.writeFileSync(path.join(tmpDirname, '.browserslistrc'), browserslist)
  fs.writeFileSync(path.join(tmpDirname, 'app.js'), file)

  var compiler = bankai(path.join(tmpDirname, 'app.js'), { watch: false })
  compiler.on('error', assert.error)
  compiler.scripts('bundle.js', function (err, res) {
    assert.error(err, 'no error writing script')
    var content = res.buffer.toString('utf8')
    assert.ok(/for\s*\(\w+ \w+ of /.test(content), 'did not transpile for...of')
    assert.ok(/const/.test(content), 'did not transpile const keyword')
    assert.ok(/function\s*\*/.test(content), 'did not transpile generator function')
    assert.ok(/yield/.test(content), 'did not transpile yield keyword')
  })
})

tape('envify in watch mode', function (assert) {
  assert.plan(5)

  var file = `
    console.log(process.env.BANKAI_TEST_VALUE)
  `
  var file2 = `
    var a = process.env.BANKAI_TEST_VALUE
    console.log({ a: a })
  `

  var tmpDirname = path.join(__dirname, '../tmp', 'js-pipeline-' + (Math.random() * 1e4).toFixed())
  mkdirp.sync(tmpDirname)
  fs.writeFileSync(path.join(tmpDirname, 'app.js'), file)

  process.env.BANKAI_TEST_VALUE = 'replacement'
  var compiler = bankai(path.join(tmpDirname, 'app.js'), { watch: true, reload: false })
  compiler.on('error', assert.error)
  compiler.scripts('bundle.js', function (err, res) {
    assert.error(err, 'no error writing script')
    assert.notEqual(res.buffer.toString('utf8').indexOf('replacement'), -1, 'contains replacement value')

    compiler.graph.on('change', next)

    // Wait for a bit before changing the source file, because the watcher setup isn't instant.
    setTimeout(function () {
      fs.writeFileSync(path.join(tmpDirname, 'app.js'), file2)
    }, 500)
  })

  function next (stepName, nodeName) {
    if (stepName !== 'scripts' || nodeName !== 'bundle') return
    compiler.scripts('bundle.js', function (err, res) {
      assert.error(err, 'no error writing script')
      assert.notEqual(res.buffer.toString('utf8').indexOf('replacement'), -1, 'contains replacement value')
      assert.notEqual(res.buffer.toString('utf8').indexOf('a: a'), -1, 'is the updated file')

      compiler.close()
    })
    compiler.graph.removeListener('change', next)
  }
})
