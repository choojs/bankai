const bl = require('bl')
const htmlIndex = require('simple-html-index')
const hyperstream = require('hyperstream')
const xtend = require('xtend')

module.exports = html

// create html stream
// obj -> obj? -> (req, res) -> rstream
function html (state) {
  return opts => {
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

    const htmlBuf = html.pipe(bl())

    return (req, res) => {
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
