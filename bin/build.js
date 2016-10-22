'use strict'
const logger = require('bole')('bankai.build')
const resolveEntry = require('../lib/resolve-entry')
const browserify = require('browserify')
const parallel = require('run-parallel')
const mkdirp = require('mkdirp')
const xtend = require('xtend')
const bankai = require('../')
const path = require('path')
const pump = require('pump')
const fs = require('fs')

module.exports = build

const defaults = {
  optimize: false,
  dir: 'dist',
  entry: '.',
  html: {},
  css: {},
  js: {}
}

function build (options, cb) {
  const assets = bankai({ optimize: true })

  const settings = xtend({}, defaults, options)
  const callback = cb || function () {}

  const entryFile = resolveEntry(settings.entry)
  const outputDir = settings.dir

  // Register css & html if specified. Register js no matter what
  const css = settings.css && assets.css(settings.css)
  const html = settings.html && assets.html(settings.html)
  const js = assets.js(browserify, entryFile, settings.js)

  mkdirp(outputDir, (err) => {
    if (err) return logger.error(`Error creating directory ${outputDir}`, err)

    const operations = []

    if (js) {
      operations.push(function (done) {
        const jsPath = path.join(outputDir, settings.html.js || 'bundle.js')
        pump(js(), fs.createWriteStream(jsPath), done)
      })
    }

    if (css) {
      operations.push(function (done) {
        const cssPath = path.join(outputDir, settings.html.css || 'bundle.css')
        pump(css(), fs.createWriteStream(cssPath), done)
      })
    }

    if (html) {
      operations.push(function (done) {
        const htmlPath = path.join(outputDir, 'index.html')
        pump(html(), fs.createWriteStream(htmlPath), done)
      })
    }

    parallel(operations, callback)
  })
}
