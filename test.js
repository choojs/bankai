const sheetify = require('sheetify/stream')
const getPort = require('get-server-port')
const browserify = require('browserify')
const concat = require('concat-stream')
const isHtml = require('is-html')
const http = require('http')
const test = require('tape')
const bankai = require('./')

test('html returns data', function (t) {
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

test('css asserts input types', function (t) {
  t.plan(2)
  t.throws(bankai.css, /sheetify/)
  t.throws(bankai.css.bind(null, sheetify), /src/)
})

test('css returns data', function (t) {
  t.plan(2)
  const css = bankai.css(sheetify, './test/fixture.css')
  const server = http.createServer(function (req, res) {
    css(req, res).pipe(res)
  })
  server.listen()

  http.get('http://localhost:' + getPort(server), function (res) {
    res.pipe(concat(function (buf) {
      const str = String(buf)
      t.equal(res.headers['content-type'], 'text/css')
      t.ok(/\.foo {}/.test(str), 'css is equal')
      server.close()
    }))
  })
})

test('js asserts input types', function (t) {
  t.plan(2)
  t.throws(bankai.js, /browserify/)
  t.throws(bankai.js.bind(null, browserify), /src/)
})

test('js returns data', function (t) {
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
