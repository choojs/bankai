var toObject = require('json-stream-to-object')
var fs = require('fs')

exports.readdir = function (req, res) {
  toObject(req, function sink (err, obj) {
    if (err) {
      console.error(err)
      res.statusCode = 400
      return res.end(JSON.stringify({ error: err.message }))
    }

    if (!obj.target) {
      res.statusCode = 400
      return res.end(JSON.stringify({ error: 'Body did not contain a .target property' }))
    }

    fs.readdir(obj.target, function (err, list) {
      if (err) {
        res.statusCode = 500
        return res.end(JSON.stringify({ error: err.message }))
      }

      res.statusCode = 200
      return res.end(JSON.stringify(list))
    })
  })
}

exports.readFile = function (req, res) {
  toObject(req, function sink (err, obj) {
    if (err) {
      console.error(err)
      res.statusCode = 400
      return res.end(JSON.stringify({ error: err.message }))
    }

    if (!obj.target) {
      res.statusCode = 400
      return res.end(JSON.stringify({ error: 'Body did not contain a .target property' }))
    }

    fs.readFile(obj.target, function (err, file) {
      if (err) {
        res.statusCode = 500
        return res.end(JSON.stringify({ error: err.message }))
      }

      res.statusCode = 200
      return res.end(JSON.stringify({ data: file }))
    })
  })
}

exports.writeFile = function (req, res) {
  toObject(req, function sink (err, obj) {
    if (err) {
      console.error(err)
      res.statusCode = 400
      return res.end(JSON.stringify({ error: err.message }))
    }

    if (!obj.target) {
      res.statusCode = 400
      return res.end(JSON.stringify({ error: 'Body did not contain a .target property' }))
    }

    if (!obj.data) {
      res.statusCode = 400
      return res.end(JSON.stringify({ error: 'Body did not contain a .data property' }))
    }

    var data = typeof obj.data === 'object'
      ? JSON.stringify(obj.data)
      : obj.data

    fs.writeFile(obj.target, data, function (err, file) {
      if (err) {
        res.statusCode = 500
        return res.end(JSON.stringify({ error: err.message }))
      }

      res.statusCode = 200
      return res.end(JSON.stringify({ file: file }))
    })
  })
}
