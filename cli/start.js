const http = require('http')
const path = require('path')
const browserify = require('browserify')
const getServerPort = require('get-server-port')
const hyperstream = require('hyperstream')
const projectNameGenerator = require('project-name-generator')
const resolve = require('resolve')
const serverRouter = require('server-router')
const stringToStream = require('string-to-stream')
const xtend = require('xtend')
const bankai = require('../')

const defaults = {
  port: 1337,
  entry: '.',
  html: {},
  css: {},
  js: {}
}

const cwd = process.cwd()

function getHtmlHandler (htmlSettings, entryFile, id) {
  const entryModule = require(entryFile)
  const entryApp = entryModule()
  const layout = bankai.html(htmlSettings)

  return function (req, res) {
    const content = stringToStream(entryApp.toString(req.url))

    const addId = hyperstream({
      '*:first': {'data-bankai': id}
    })

    const injectContent = hyperstream({
      body: {
        _prependHtml: content.pipe(addId)
      }
    })

    const injectScript = hyperstream({
      body: {
        _appendHtml: [
          '<script>',
          'var application = require(\'' + entryFile + '\')',
          'var tree = application().start(\'[data-bankai="' + id + '"]\')',
          'if (tree) {',
          '  document.body.appendChild(tree)',
          '}',
          '</script>'
        ].join('\n')
      }
    })

    return layout(req, res)
      .pipe(injectContent)
      .pipe(injectScript)
  }
}

/**
 * Start an opinionated development server
 */
function start (options, cb) {
  const settings = xtend({}, defaults, options)
  const callback = cb || function () {}
  const entryFile = resolve.sync(settings.entry, {basedir: cwd})
  const relativeEntry = path.relative(cwd, entryFile)
  const id = ['bankai'].concat(projectNameGenerator().raw).join('-')

  const router = serverRouter()
  const html = getHtmlHandler(settings.html, entryFile, id)
  router.on('/', html)

  const css = bankai.css(settings.css)
  router.on('/bundle.css', css)

  const browserifyOpts = xtend(settings.js, {require: [entryFile]})
  const js = bankai.js(browserify, entryFile, browserifyOpts)
  router.on('/bundle.js', js)

  const server = http.createServer(function (req, res) {
    router(req, res).pipe(res)
  })

  server.listen(settings.port, function () {
    const port = getServerPort(server)
    console.log('Started bankai for', relativeEntry, 'on http://localhost:' + port)
    callback()
  })
}

module.exports = start
