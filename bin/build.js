const path = require('path')
const browserify = require('browserify')
const resolve = require('resolve')
const xtend = require('xtend')
const fs = require('fs')

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
    optimize: options.optimize
  })

  const settings = xtend({}, defaults, options)
  const callback = cb || function () {}

  const entryFile = resolveEntryFile(settings.entry)
  const outputDir = settings.dir

  let css
  if (settings.css) {
    css = bankai.css(settings.css)
  }

  let html
  if (settings.html) {
    html = bankai.html(settings.html)
  }

  const js = bankai.js(browserify, entryFile, settings.js)
  js().pipe(fs.createWriteStream(path.join(outputDir, settings.html.js || 'bundle.js')))

  if (css) {
    css().pipe(fs.createWriteStream(path.join(outputDir, settings.html.css || 'bundle.css')))
  }

  if (html) {
    html().pipe(fs.createWriteStream(path.join(outputDir, 'index.html')))
  }

  callback()
}

module.exports = build
