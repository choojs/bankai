var writeFileTree = require('write-file-tree')
var spawn = require('child_process').spawn
var dedent = require('dedent')
var tape = require('tape')
var path = require('path')
var tmp = require('tmp')
var fs = require('fs')

var BIN_PATH = require.resolve('../bin')
function build (entry, output, cb) {
  var args = [BIN_PATH, 'build', entry]
  if (output) args.push(output)
  var proc = spawn(process.execPath, args)
  proc.on('error', cb)
  proc.on('exit', function (code) {
    if (code === 0) cb(null)
    else cb(new Error(code))
  })
  return proc
}

tape('default output directory', function (assert) {
  assert.plan(4)

  var tmpDir = tmp.dirSync({ dir: path.join(__dirname, '../tmp'), unsafeCleanup: true })
  assert.on('end', tmpDir.removeCallback)

  writeFileTree.sync(tmpDir.name, {
    'index.js': dedent`
      var choo = require('choo')
      var raw = require('choo/html/raw')
      var app = choo()
      app.route('/', function () {
        return raw('<body>hello world</body>')
      })

      module.exports = app.mount('body')
    `
  })

  build(path.join(tmpDir.name, '/index.js'), null, function (err) {
    assert.ifError(err)
    try {
      assert.ok(fs.statSync(path.join(tmpDir.name, 'dist')).isDirectory())
    } catch (err) {
      assert.error(err, 'should have placed output in ./dist')
    }
  })
  build(tmpDir.name, null, function (err) {
    assert.ifError(err)
    try {
      assert.ok(fs.statSync(path.join(tmpDir.name, 'dist')).isDirectory())
    } catch (err) {
      assert.error(err, 'should have placed output in ./dist')
    }
  })
})

tape('outputs split bundles', function (assert) {
  assert.plan(4)

  var tmpDir = tmp.dirSync({ dir: path.join(__dirname, '../tmp'), unsafeCleanup: true })
  assert.on('end', tmpDir.removeCallback)

  writeFileTree.sync(tmpDir.name, {
    'index.js': dedent`
      var sr = require('split-require')

      sr('./a')
      sr('./b')
    `,
    'a.js': dedent`
      module.exports = 'THIS IS A'
    `,
    'b.js': dedent`
      module.exports = 'THIS IS B'
    `
  })

  var output = path.join(tmpDir.name, 'dist')
  build(tmpDir.name, output, function (err) {
    assert.ifError(err)

    // maybe these should use globs instead of hardcoded hashes
    // eg glob.sync('dist/*/bundle.js')
    assert.ok(fs.existsSync(path.join(output, '102124f5fbe2468e', 'bundle.js')))
    assert.notEqual(read(path.join(output, '98abfdc06765c024', 'bundle-2.js')).indexOf('THIS IS A'), -1)
    assert.notEqual(read(path.join(output, 'd045ba5484611349', 'bundle-3.js')).indexOf('THIS IS B'), -1)
  })
})

function read (p) {
  return fs.readFileSync(p, 'utf8')
}
