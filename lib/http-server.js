var http = require('http')
var pump = require('pump')
var net = require('net')

var getPort = require('getPort')
var pem = require('pem')

exports.createServer = createDevServer

function createDevServer (http2Handler) {
  var httpPort, httpsPort
  var createSecureServer

  try {
    createSecureServer = require('http2').createSecureServer
  } catch (e) {
    createSecureServer = require('https').createServer
  }

  return {
    listen: listen
  }

  function listen (port, onlisten) {
    net.createServer(tcpConnection).listen(port, function () {
      getPort(9000, 10000, function (err, port) {
        if (err) throw err

        httpPort = port
        http.createServer(httpConnection).listen(port, function () {
          createKeys(function (err, keys) {
            if (err) throw err
            var cert = keys.certificate
            var key = keys.serviceKey

            getPort(4443, 5443, function (err, port) {
              if (err) throw err

              httpsPort = port
              var serverOpts = { cert, key, allowHTTP1: true }
              var server = createSecureServer(serverOpts, http2Handler)
              server.listen(httpsPort, function () {
                if (onlisten) onlisten()
              })
            })
          })
        })
      })
    })
  }

  function tcpConnection (conn) {
    conn.once('data', function (buf) {
      // A TLS handshake record starts with byte 22.
      var address = buf[0] === 22 ? httpsPort : httpPort
      var proxy = net.createConnection(address, function () {
        proxy.write(buf)
        pump(conn, proxy, conn, function (err) {
          if (err) return false // TODO: log error to the logger part
        })
      })
    })
  }

  function httpConnection (req, res) {
    var host = req.headers['host']
    res.writeHead(301, {
      location: 'https://' + host + req.url
    })
    res.end()
  }
}

function createKeys (cb) {
  pem.createCertificate({ days: 1, selfSigned: true }, cb)
}
