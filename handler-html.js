const lrScript = require('inject-lr-script-stream')
const htmlIndex = require('simple-html-index')
const hyperstream = require('hyperstream')
const xtend = require('xtend')
const bl = require('bl')

const env = process.env.NODE_ENV

module.exports = html

// create html stream
// obj -> obj? -> (req, res) -> rstream
function html (state) {
  return function (opts) {
    opts = opts || {}
    const defaultOpts = {
      entry: 'bundle.js',
      css: 'bundle.css',
      favicon: true
    }
    const htmlOpts = xtend(defaultOpts, opts)
    const html = htmlIndex(htmlOpts).pipe(createMetaTag())
    const htmlBuf = (env === 'development')
      ? html.pipe(lrScript()).pipe(bl())
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
