const http = require('http')
const path = require('path')
const bankai = require('../')
const browserify = require('browserify')
const getServerPort = require('get-server-port')
const hyperstream = require('hyperstream')
const opn = require('opn')
const projectNameGenerator = require('project-name-generator')
const resolve = require('resolve')
const serverRouter = require('server-router')
const stringToStream = require('string-to-stream')
const stream = require('stream')
const xtend = require('xtend')

const defaults = {
  port: 1337,
  open: false,
  entry: '.',
  html: {},
  css: {},
  js: {}
}

const cwd = process.cwd()

// resolve a path according to require.resolve algorithm
// string -> string
function resolveEntryFile (relativePath) {
  const entry = relativePath[0] === '.' || relativePath[0] === '/'
    ? relativePath
    : './' + relativePath
  return resolve.sync(entry, {basedir: cwd})
}

function injectScript () {
  const b = browserify(path.resolve(__dirname, 'client-start.js'))
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

function injectContent (content, id) {
  const addId = hyperstream({
    '*:first': {'data-bankai': id}
  })
  return hyperstream({
    body: {
      _prependHtml: content.pipe(addId)
    }
  })
}

// get a html request handler for settings, entryFile and id
// (object, string, string) -> rstream
function getHtmlHandler (htmlSettings, entryFile, id) {
  const entryModule = require(entryFile)

  const entryApp = entryModule()
  const layout = bankai.html(htmlSettings)

  return function (req, res) {
    const content = stringToStream(entryApp.toString(req.url))

    return layout(req, res)
      .pipe(injectContent(content, id))
      .pipe(injectScript())
  }
}

// Start a development server
function start (options, cb) {
  const settings = xtend({}, defaults, options)
  const callback = cb || function () {}

  const entryFile = resolveEntryFile(settings.entry)
  const relativeEntry = path.relative(cwd, entryFile)
  const router = serverRouter('/404')
  const id = ['bankai'].concat(projectNameGenerator().raw).join('-')

  router.on('/404', function (req, res) {
    res.statusCode = 404
    return stringToStream('Not found')
  })

  if (settings.html) {
    const htmlOpts = xtend({id: id}, settings.html)
    const html = getHtmlHandler(htmlOpts, entryFile, id)
    router.on('/:path', html)
    router.on('/', html)
  }

  if (settings.css) {
    const css = bankai.css(settings.css)
    router.on(settings.html.css || '/bundle.css', css)
  }

  const jsOpts = xtend({id: id}, settings.js)
  const js = bankai.js(browserify, entryFile, jsOpts)
  router.on(settings.html.entry || '/bundle.js', js)

  const server = http.createServer(function (req, res) {
    router(req, res).pipe(res)
  })

  server.listen(settings.port, function () {
    const port = getServerPort(server)

    const address = ['http://localhost', port].join(':')
    console.log('Started bankai for', relativeEntry, 'on', address)

    if (settings.open) {
      const app = typeof settings.open === 'string' ? settings.open : null

      const appName = typeof settings.open === 'string'
        ? settings.open
        : 'system browser'
      console.log('Opening', address, 'with', appName)

      opn(address, {app: app})
        .catch(function (error) {
          console.error(error)
        })
    }

    callback()
  })
}

module.exports = start
