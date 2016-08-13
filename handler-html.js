const createHtml = require('create-html')
const xtend = require('xtend')
const stringToStream = require('string-to-stream')

module.exports = html

// create html stream
// obj -> obj? -> (req, res) -> rstream
function html (state) {
  return function initHtml (opts) {
    opts = opts || {}
    const defaultOpts = {
      script: 'bundle.js',
      css: 'bundle.css',
      meta: '<meta name="viewport" content="width=device-width, initial-scale=1">'
    }
    const htmlOpts = xtend(defaultOpts, opts)
    state.htmlOpts = htmlOpts
    const html = createHtml(htmlOpts)

    return function htmlHandler (req, res) {
      if (res) res.setHeader('Content-Type', 'text/html')
      return stringToStream(html)
    }
  }
}
