const bankai = require('../')
const path = require('path')
const browserify = require('browserify')
const resolve = require('resolve')
const xtend = require('xtend')
const fs = require('fs')
const mkdirp = require('mkdirp')
const parallel = require('run-parallel')
const pump = require('pump')

module.exports = build

const defaults = {
  optimize: false,
  dir: 'dist',
  entry: '.',
  html: {},
  css: {},
  js: {}
}

const cwd = process.cwd()

// resolve a path according to require.resolve algorithm
// string -> string
function resolveEntryFile (relativePath) {
  const first = relativePath.charAt(0)
  const entry = ['.', '/'].includes(first) ? relativePath : './' + relativePath
  return resolve.sync(entry, {basedir: cwd})
}

function build (options, cb) {
  const assets = bankai({ optimize: true })

  const settings = xtend({}, defaults, options)
  const callback = cb || function () {}

  const entryFile = resolveEntryFile(settings.entry)
  const outputDir = settings.dir

  // Register css & html if specified. Register js no matter what
  const css = settings.css && assets.css(settings.css)
  const html = settings.html && assets.html(settings.html)
  const js = assets.js(browserify, entryFile, settings.js)

  mkdirp(outputDir, (err) => {
    if (err) return console.error(`Error creating directory ${outputDir}`, err)

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
