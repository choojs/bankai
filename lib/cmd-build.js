var gzipSize = require('gzip-size')
var getPort = require('getport')
var pump = require('pump')

var Router = require('./regex-router')
var remoteFs = require('./remote-fs')
var http = require('./http-server')
var bankai = require('../')
var ui = require('./ui')

var files = [
  'assets',
  'document',
  'script',
  'manifest',
  'style',
  'service-worker'
]

module.exports = start

function start (entry, opts) {
  var quiet = !!opts.quiet
  var compiler = bankai(entry)

  compiler.on('error', function (error) {
    console.error('error compiling', error)
  })

  compiler.on('change', function (nodeName, edgeName, nodeState) {
    console.log(nodeName + ':' + edgeName + ' changed')
  })

  router.route(/^\/manifest.json$/, function (req, res, params) {
    compiler.manifest(function (err, node) {
      if (err) {
        res.statusCode = 404
        return res.end(err.message)
      }
      res.setHeader('content-type', 'application/json')
      gzip(node.buffer, req, res)
    })
  })

  compiler.serviceWorker(function (err, node) {
    if (err) {
      res.statusCode = 404
      return res.end(err.message)
    }
    res.setHeader('content-type', 'application/javascript')
    gzip(node.buffer, req, res)
  })

  var name = params[1]
  compiler.script(name, function (err, node) {
    if (err) {
      res.statusCode = 404
      return res.end(err.message)
    }
    res.setHeader('content-type', 'application/javascript')
    gzip(node.buffer, req, res)
  })

  compiler.style(function (err, node) {
    if (err) {
      res.statusCode = 404
      return res.end(err.message)
    }
    res.setHeader('content-type', 'text/css')
    gzip(node.buffer, req, res)
  })

  var prefix = 'assets' // TODO: also accept 'content'
  var name = prefix + '/' + params[1]
  compiler.asset(name, function (err, node) {
    if (err) {
      res.statusCode = 404
      return res.end(err.message)
    }
    gzip(node.buffer, req, res)
  })

  compiler.document(url, function (err, node) {
    if (err) {
      return compiler.document('/404', function (err, node) {
        res.statusCode = 404
        if (err) {
          return res.end(err.message)
        }
        res.setHeader('content-type', 'text/html')
        gzip(node.buffer, req, res)
      })
    }
    res.setHeader('content-type', 'text/html')
    gzip(node.buffer, req, res)
  })
}
