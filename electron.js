var path = require('path')

module.exports = createElectronOpts

function createElectronOpts () {
  return {
    insertGlobals: true,
    ignoreMissing: true,
    builtins: false,
    insertGlobalVars: {
      '__dirname': function (file, basedir) {
        var relativePath = path.relative(basedir, file)
        var dirPath = path.dirname(relativePath)
        var dirname = '"' + dirPath + '"'
        return "require('path').join(__dirname, " + dirname + ')'
      },
      '__filename': function (file, basedir) {
        var filename = '"' + path.relative(basedir, file) + '"'
        return "require('path').join(__dirname, " + filename + ')'
      },
      'process': undefined,
      'global': undefined,
      'Buffer': undefined,
      'Buffer.isBuffer': undefined
    },
    postFilter: function (id, file, pkg) {
      if (!file) return false
      file = path.relative(__dirname, file)
      if (file.indexOf('node_modules') !== -1 &&
        file.indexOf('sheetify') === -1) {
        return false
      }
      return true
    }
  }
}
