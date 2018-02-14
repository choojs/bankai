var path = require('path')
var os = require('os')
var browserifyPersistFs = require('browserify-persist-fs')

module.exports = function (state) {
  var cacheDir = path.join(os.homedir(), '.cache', 'bankai')
  return browserifyPersistFs(cacheDir, getCacheId(state))
}

function getCacheId (state) {
  return {
    watch: state.metadata.watch,
    entry: state.metadata.entry,
    transforms: [
      'sheetify',
      'glslify',
      'tfilter',
      'brfs',
      'yo-yoify',
      'css-extract',
      'tinyify',
      'split-require',
      // TODO should probably add custom .babelrc here too if we can
      'babelify',
      'babel-preset-env'
    ].map(version)
  }

  function version (mod) {
    return require(mod + '/package.json').version
  }
}
