'use strict'

const childProcess = require('child_process')
const getPort = require('get-server-port')
const browserify = require('browserify')
const concat = require('concat-stream')
const openport = require('openport')
const isHtml = require('is-html')
const bankai = require('../')
const http = require('http')
const path = require('path')
const test = require('tape')
const Promise = require('bluebird')
const fs = require('fs')
const request = require('request')
const sinon = require('sinon')

const entryPath = path.join(__dirname, 'fixtures', 'index.js')
const appJsPath = path.join(__dirname, 'fixtures', 'app.js')
const jsSource = fs.readFileSync(appJsPath, 'utf8')

const callServerAsync = Promise.method((server, path) => {
  path = path || ''
  return Promise.promisify(request)(`http://localhost:${getPort(server)}/${path}`)
})

test('html', function (t) {
  t.test('returns data', function (t) {
    t.plan(2)
    const assets = bankai()
    const html = assets.html()
    const server = http.createServer(function (req, res) {
      html(req, res).pipe(res)
    })
    server.listen()

    http.get('http://localhost:' + getPort(server), function (res) {
      res.pipe(concat({ string: true }, function (str) {
        t.equal(res.headers['content-type'], 'text/html')
        t.ok(isHtml(str), 'is html')
        server.close()
      }))
    })
  })
})

test('css', function (t) {
  t.test('asserts input types', function (t) {
    t.plan(1)
    const assets = bankai()
    t.throws(assets.css.bind(null, 'foo'), /object/)
  })

  t.test('returns data', function (t) {
    t.plan(2)
    const assets = bankai()
    const css = assets.css({ basedir: __dirname })
    assets.js(browserify, path.join(__dirname, './fixture.js'))
    const server = http.createServer(function (req, res) {
      css(req, res).pipe(res)
    })
    server.listen()

    process.nextTick(function () {
      http.get('http://localhost:' + getPort(server), function (res) {
        res.pipe(concat(function (buf) {
          const str = String(buf)
          t.equal(res.headers['content-type'], 'text/css')
          t.ok(/\.foo {}/.test(str), 'css is equal')
          server.close()
        }))
      })
    })
  })
})

test('js', function (t) {
  t.test('js asserts input types', function (t) {
    t.plan(2)
    const assets = bankai()
    t.throws(assets.js, /browserify/)
    t.throws(assets.js.bind(null, browserify), /entryFile/)
  })

  t.test('js returns data', function (t) {
    t.plan(1)
    const assets = bankai()
    const js = assets.js(browserify, './test/fixture.js')
    const server = http.createServer(function (req, res) {
      js(req, res).pipe(res)
    })
    server.listen()

    http.get('http://localhost:' + getPort(server), function (res) {
      res.pipe(concat(function (buf) {
        const actual = res.headers['content-type']
        const expected = 'application/javascript'
        t.equal(actual, expected, 'content type is equal')
        server.close()
      }))
    })
  })
})

test('start', function (t) {
  t.test('start does not throw', function (t) {
    t.plan(1)

    openport.find(function (err, p) {
      const port = err ? 1337 : p

      const args = ['start', '--entry=./fixture', `--port=${port}`]

      bin(args, function (error, data, child) {
        child.kill()

        if (error) {
          return t.fail(error)
        }

        const actual = data.toString().split('\n')[0]
        const expected = new RegExp(`^\\[\\d+\\] info {2}Started bankai for fixture.js on ` +
          `http://localhost:${port} \\(bankai.start\\)$`)
        t.ok(expected.test(actual), 'start logs success')
      })
    })
  })
})

const waitForRebundle = (t, server) => {
  return new Promise((resolve, reject) => {
    let numTries = 0

    const tryCall = () => {
      ++numTries
      callServerAsync(server, 'bundle.js')
        .then((result) => {
          const body = result.body
          if (/const isModified = true/m.test(body)) {
            t.pass('Bundle is recreated')
            resolve()
          } else {
            if (numTries < 3) {
              setTimeout(tryCall, 1000)
            } else {
              t.fail(`Bundle wasn't recreated on time`)
              resolve()
            }
          }
        })
    }

    setTimeout(tryCall, 300)
  })
}

test('source monitoring', (t) => {
  t.test('bundle is re-created when source files change', (t) => {
    t.timeoutAfter(10000)
    t.plan(2)

    const assets = bankai()
    const tinyLrReloadSpy = sinon.spy()
    assets._state.tinyLr = {reload: tinyLrReloadSpy}
    const js = assets.js(browserify, entryPath)
    const server = http.createServer((req, res) => {
      js(req, res).pipe(res)
    })
    server.listen()

    // First get original bundle, then cause re-bundling and verify the latter
    callServerAsync(server, 'bundle.js')
      .then(() => {
        // Cause re-bundling
        fs.writeFileSync(appJsPath, 'const isModified = true')
        return waitForRebundle(t, server)
          .then(() => {
            t.ok(tinyLrReloadSpy.called, 'tiny-lr reload should be called')
          })
      })
      .finally(() => {
        fs.writeFileSync(appJsPath, jsSource)
        server.close()
      })
  })
})

test('__END__', function (t) {
  t.on('end', function () {
    setTimeout(function () {
      process.exit(0)
    }, 100)
  })
  t.end()
})

function bin (args, cb) {
  const file = path.resolve(__dirname, '../bin/index.js')

  const child = childProcess.spawn(file, args, {
    cwd: __dirname,
    env: process.env
  })

  child.stdout.once('data', function (data) {
    cb(null, data, child)
  })

  child.stderr.once('data', function (error) {
    cb(new Error(error), null, child)
  })
}
