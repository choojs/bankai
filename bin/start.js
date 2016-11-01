const resolveEntry = require('../lib/resolve-entry')
const stringToStream = require('string-to-stream')
const getServerPort = require('get-server-port')
const logger = require('bole')('bankai.start')
const serverRouter = require('server-router')
const browserify = require('browserify')
const explain = require('explain-error')
const http = require('http')
const path = require('path')
const opn = require('opn')

const Bankai = require('../')

module.exports = start

// Start a development server
// (str, obj, fn) -> null
function start (entryFile, opts, done) {
  entryFile = resolveEntry(entryFile)

  const bankai = Bankai({ optimize: opts.optimize })
  const relativeEntry = path.relative(process.cwd(), entryFile)
  const open = opts.open
  const routes = []

  routes.push(['/404', (req, res) => {
    res.statusCode = 404
    return stringToStream('Not found')
  }])

  const html = bankai.html(opts.html)
  routes.push(['/', html])
  routes.push(['/:path', html])

  const css = bankai.css(opts.css)
  routes.push(['/bundle.css', css])

  const js = bankai.js(browserify, entryFile, opts.js)
  routes.push(['/bundle.js', js])

  const router = serverRouter('/404', routes)
  const server = http.createServer((req, res) => router(req, res).pipe(res))

  server.listen(opts.port, () => {
    const port = getServerPort(server)

    const addr = ['http://localhost', port].join(':')
    logger.info('Started bankai for', relativeEntry, 'on', addr)

    if (typeof open === 'string') {
      const app = typeof open === 'string' ? open : null
      const dapp = (typeof open === 'string' && open !== '')
        ? opts.open
        : 'system browser'

      opn(addr, {app: app})
        .catch((err) => done(explain(err, `err opening ${addr} with ${dapp}`)))
        .then(done)
    } else {
      done()
    }
  })
}
