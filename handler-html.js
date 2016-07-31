const path = require('path')
const bl = require('bl')
const browserify = require('browserify')
const htmlIndex = require('simple-html-index')
const hyperstream = require('hyperstream')
const resolve = require('resolve')
const stream = require('stream')
const xtend = require('xtend')

const cwd = process.cwd()

// resolve a path according to require.resolve algorithm
// string -> string
function resolveEntryFile (relativePath) {
  const entry = relativePath[0] === '.' || relativePath[0] === '/'
    ? relativePath
    : './' + relativePath
  return resolve.sync(entry, {basedir: cwd})
}

module.exports = html

// create html stream
// obj -> obj? -> (req, res) -> rstream
function html (state) {
  return function (opts) {
    opts = opts || {}
    const defaultOpts = {
      src: '.',
      entry: 'bundle.js',
      css: 'bundle.css',
      favicon: true
    }
    const htmlOpts = xtend(defaultOpts, opts)
    state.htmlOpts = htmlOpts
    const html = htmlIndex(htmlOpts).pipe(createMetaTag())
    const scriptSelector = 'script[src="' + htmlOpts.entry + '"]'
    const styleSelector = 'link[href="' + htmlOpts.css + '"]'

    const htmlBuf = state.env === 'development'
      ? html
          .pipe(markHotReplaceable(scriptSelector, htmlOpts.src))
          .pipe(markHotReplaceable(styleSelector, true))
          .pipe(hmrScript())
          .pipe(bl())
      : html.pipe(bl())

    return function (req, res) {
      res.setHeader('Content-Type', 'text/html')
      return htmlBuf.duplicate()
    }
  }
}

function createMetaTag () {
  var metaTag = '<meta name="viewport"'
  metaTag += 'content="width=device-width, initial-scale=1">'

  return hyperstream({
    head: { _appendHtml: metaTag }
  })
}

function markHotReplaceable (selector, src) {
  const query = {}
  const value = typeof src === 'string'
    ? resolveEntryFile(src)
    : src

  query[selector] = {
    'data-bankai-hmr': value
  }

  return hyperstream(query)
}

function hmrScript () {
  const b = browserify(path.resolve(__dirname, 'client-hmr.js'))
  const script$ = new stream.PassThrough()
  script$.push('<script>')

  b.on('bundle', function (bundle$) {
    bundle$.pipe(script$)
  })

  b.bundle(function (error) {
    if (error) {
      console.error(error)
    }
    script$.end('</script>')
  })

  return hyperstream({
    body: { _appendHtml: script$ }
  })
}
