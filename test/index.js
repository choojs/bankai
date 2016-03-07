const getPort = require('get-server-port')
const browserify = require('browserify')
const concat = require('concat-stream')
const isHtml = require('is-html')
const http = require('http')
const path = require('path')
const test = require('tape')
const bankai = require('../')

test('html', function (t) {
  t.test('returns data', function (t) {
    t.plan(2)
    const html = bankai.html()
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
    t.throws(bankai.css.bind(null, 'foo'), /object/)
  })

  t.test('returns data', function (t) {
    t.plan(2)
    const css = bankai.css({ basedir: __dirname })
    bankai.js(browserify, path.join(__dirname, './fixture.js'))
    const server = http.createServer(function (req, res) {
      css(req, res).pipe(res)
    })
    server.listen()

    process.nextTick(function () {
      http.get('http://localhost:' + getPort(server), function (res) {
        res.pipe(concat(function (buf) {
          const str = String(buf)
          t.equal(res.headers['content-type'], 'text/css')
          console.log(str)
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
    t.throws(bankai.js, /browserify/)
    t.throws(bankai.js.bind(null, browserify), /src/)
  })

  t.test('js returns data', function (t) {
    t.plan(1)
    const js = bankai.js(browserify, './test/fixture.js')
    const server = http.createServer(function (req, res) {
      js(req, res).pipe(res)
    })
    server.listen()

    http.get('http://localhost:' + getPort(server), function (res) {
      res.pipe(concat(function (buf) {
        t.equal(res.headers['content-type'], 'application/javascript')
        server.close()
      }))
    })
  })
})
