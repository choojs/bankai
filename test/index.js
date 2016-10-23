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
    t.throws(assets.js.bind(null, browserify), /src/)
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
