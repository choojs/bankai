var explain = require('explain-error')
var findup = require('findup')
var path = require('path')
var fs = require('fs')

module.exports = isElectronProject

function isElectronProject (dirname, cb) {
  findup(dirname, 'package.json', function (err, dir) {
    if (err) return cb(null, false)
    fs.readFile(path.join(dir, 'package.json'), function (err, json) {
      if (err) return cb(explain(err, 'bankai/lib/is-electron-project: error reading package.json'))

      try {
        var pkg = JSON.parse(json)
        var hasElectronDep = Boolean((pkg.dependencies && pkg.dependencies.electron) ||
          (pkg.devDependencies && pkg.devDependencies.electron))
        cb(null, hasElectronDep)
      } catch (err) {
        if (err) return cb(explain(err, 'bankai/lib/is-electron-project: error parsing package.json'))
      }
    })
  })
}
