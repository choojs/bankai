const resolveEntry = require('../lib/resolve-entry')
const browserify = require('browserify')
const parallel = require('run-parallel')
const explain = require('explain-error')
const mkdirp = require('mkdirp')
const bankai = require('../')
const path = require('path')
const pump = require('pump')
const fs = require('fs')

module.exports = build

// (str, str, obj, fn) -> null
function build (entryFile, outputDir, opts, done) {
  entryFile = resolveEntry(entryFile)

  const optimize = opts.optimize

  const assets = bankai({ optimize: optimize })
  const js = assets.js(browserify, entryFile, opts.js)
  const css = assets.css(opts.css)
  const html = assets.html()

  mkdirp(outputDir, (err) => {
    if (err) return explain(err, `Error creating dir: ${outputDir}`)

    const operations = []

    operations.push(function (done) {
      const jsPath = path.join(outputDir, 'bundle.js')
      pump(js(), fs.createWriteStream(jsPath), done)
    })

    operations.push(function (done) {
      const cssPath = path.join(outputDir, 'bundle.css')
      pump(css(), fs.createWriteStream(cssPath), done)
    })

    operations.push(function (done) {
      const htmlPath = path.join(outputDir, 'index.html')
      pump(html(), fs.createWriteStream(htmlPath), done)
    })

    parallel(operations, done)
  })
}
