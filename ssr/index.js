var debug = require('debug')('bankai.server-render')
var assert = require('assert')

var choo = require('./choo')

module.exports = class ServerRender {
  constructor (entry) {
    assert.equal(typeof entry, 'string', 'bankai/ssr/index.js: entry should be type string')

    this.entry = entry
    this.app = this._requireApp(this.entry)

    this.appType = this._getAppType(this.app)
    this.routes = this._listRoutes(this.app)
    this.entry = entry
    this.error = null

    this.DEFAULT_RESPONSE = {
      body: '<body></body>',
      title: '',
      language: 'en-US'
    }
  }

  render (route, done) {
    var self = this
    if (this.appType === 'choo') choo.render(this.app, route, send)
    else done(null, Object.assign({ route: route }, this.DEFAULT_RESPONSE))

    function send (err, res) {
      if (err) return done(err)
      done(null, Object.assign(self.DEFAULT_RESPONSE, res))
    }
  }

  _getAppType (app) {
    if (choo.is(app)) return 'choo'
    else return 'default'
  }

  _requireApp (entry) {
    try {
      return freshRequire(entry)
    } catch (err) {
      var failedRequire = err.message === `Cannot find module '${entry}'`
      if (!failedRequire) {
        var ssrError = err
        ssrError.isSsr = true
        this.error = ssrError
      }
    }
  }

  _listRoutes (app) {
    if (this.appType === 'choo') return choo.listRoutes(this.app)
    return ['/']
  }
}

// Clear the cache, and require the file again.
function freshRequire (file) {
  clearRequireAndChildren(file)
  var exports = require(file)
  return exports

  function isNotNativeModulePath (file) {
    return /\.node$/.test(file.id) === false
  }

  function isNotInNodeModules (file) {
    return /node_modules/.test(file.id) === false
  }

  function clearRequireAndChildren (key) {
    if (!require.cache[key]) return

    require.cache[key].children
      .filter(isNotNativeModulePath)
      .filter(isNotInNodeModules)
      .forEach(function (child) {
        clearRequireAndChildren(child.id)
      })

    debug('clearing require cache for %s', key)
    delete require.cache[key]
  }
}
