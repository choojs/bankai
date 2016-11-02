const bankai = require('..')
const http = require('http')
const path = require('path')

const clientPath = path.join(__dirname, 'client.js')
const assets = bankai(clientPath)

http.createServer((req, res) => {
  switch (req.url) {
    case '/': return assets.html(req, res).pipe(res)
    // case '/bundle.js': return assets.js(req, res).pipe(res)
    // case '/bundle.css': return assets.css(req, res).pipe(res)
    default: return (res.statusCode = 404 && res.end('404 not found'))
  }
}).listen(8080)
