'use strict'
const logger = require('bole')('server')
const serverRouter = require('server-router')
const browserify = require('browserify')
const bankai = require('../../')()
const http = require('http')

const html = bankai.html()
const css = bankai.css({use: ['sheetify-cssnext']})
const js = bankai.js(browserify, './index.js', {basedir: __dirname})

const routes = [
  ['/', html],
  ['/404', html],
  ['/bundle.css', css],
  ['bundle.js', js]
]

const router = serverRouter('/404', routes)
const server = http.createServer((req, res) => router(req, res).pipe(res))

server.listen(1337, () => {
  logger.info('Started bankai on http://localhost:1337')
})
