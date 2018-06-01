var requireWithGlobal = require('require-with-global')
var debug = require('debug')('bankai.server-render')
var Console = require('console').Console
var through = require('through2')
var assert = require('assert')

var choo = require('./choo')

module.exports = class ServerRender {
  constructor (entry) {
    assert.equal(typeof entry, 'string', 'bankai/ssr/index.js: entry should be type string')

    this.entry = entry
    this.error = null

    this.console = through()
    this.consoleInstance = new Console(this.console)
    this.require = requireWithGlobal()

    this.reload()

    this.DEFAULT_RESPONSE = {
      body: '<body></body>',
      title: '',
      language: 'en-US',
      selector: 'body'
    }
  }

  reload () {
    this.app = this._requireApp(this.entry)
    this.appType = this._getAppType(this.app)
    this.routes = this._listRoutes(this.app)
  }

  render (route, done) {
    var self = this
    if (this.appType === 'choo') choo.render(this.app, route, send)
    else done(null, Object.assign({ route: route }, this.DEFAULT_RESPONSE))

    function send (err, res) {
      if (err) return done(err)
      done(null, Object.assign({ route: route }, self.DEFAULT_RESPONSE, res))
    }
  }

  close () {
    this.require.remove()
  }

  _getAppType (app) {
    if (choo.is(app)) return 'choo'
    else return 'default'
  }

  _requireApp (entry) {
    try {
      return this._freshRequire(entry, { console: this.consoleInstance })
    } catch (err) {
      var failedRequire = err.message === `Cannot find module '${entry}'`
      if (!failedRequire) {
        var ssrError = err
        ssrError.isSsr = true
        this.error = ssrError
      }
    }
  }

  // Clear the cache, and require the file again.
  _freshRequire (file, vars) {
    clearRequireAndChildren(file)
    return this.require(file, vars)
  }

  _listRoutes (app) {
    if (this.appType === 'choo') return choo.listRoutes(this.app)
    return ['/']
  }
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

  function isNotNativeModulePath (module) {
    return /\.node$/.test(module.id) === false
  }

  function isNotInNodeModules (module) {
    return /node_modules/.test(module.id) === false
  }
}
