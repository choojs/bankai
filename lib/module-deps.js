var concat = require('concat-stream')
var mdeps = require('module-deps')
var pump = require('pump')

module.exports = moduleDeps

function moduleDeps (entry, done) {
  var md = mdeps()
  md.end({ file: entry })
  pump(md, concat({ encoding: 'object' }, function (obj) {
    var json = JSON.stringify(obj)
    done(null, json)
  }), end)

  function end () {
  }
}
