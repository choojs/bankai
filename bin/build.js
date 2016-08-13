const path = require('path')
const browserify = require('browserify')
const resolve = require('resolve')
const xtend = require('xtend')
const fs = require('fs')
const mkdirp = require('mkdirp')

const defaults = {
  optimize: false,
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
  const bankai = require('../')({
    optimize: true
  })

  const settings = xtend({}, defaults, options)
  const callback = cb || function () {}

  const entryFile = resolveEntryFile(settings.entry)
  const outputDir = settings.dir

  // Register css & html if specified. Register js no matter what
  const css = settings.css && bankai.css(settings.css)
  const html = settings.html && bankai.html(settings.html)
  const js = bankai.js(browserify, entryFile, settings.js)

  mkdirp(outputDir, (err) => {
    if (err) return console.error(`Error creating directory ${outputDir}`, err)

    if (js) {
      const jsPath = path.join(outputDir, settings.html.js || 'bundle.js')
      js().pipe(fs.createWriteStream(jsPath))
    }

    if (css) {
      const cssPath = path.join(outputDir, settings.html.css || 'bundle.css')
      css().pipe(fs.createWriteStream(cssPath))
    }

    if (html) {
      const htmlPath = path.join(outputDir, 'index.html')
      html().pipe(fs.createWriteStream(htmlPath))
    }
  })

  callback()
}

module.exports = build
