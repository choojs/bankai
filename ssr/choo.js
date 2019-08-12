var getAllRoutes = require('wayfarer/get-all-routes')

module.exports.is = function (app) {
  return Boolean(app &&
    app.router &&
    app.router.router &&
    app.router.router._trie)
}

module.exports.listRoutes = function (app) {
  var keys = getAllRoutes(app.router.router)
  return Object.keys(keys).filter(function (key) {
    return !/\/:/.test(key) // Server rendering partials is tricky.
  })
}

// Do a double render pass - the first time around we wait for promises to be
// pushed into `state._experimental_prefetch`. Once all promises resolve, we
// take the state, and do a second render pass with the new state.
//
// In Nanocomponent, people should do a conditional call to render this.
//
// ## Example
//
// ```js
// class Button extends Nanocomponent {
//   constructor (name, state, emit) {
//     super(name)
//     this.state = state
//     this.emit = emit
//     this.local = this.state.components[name] = {
//       loaded: false // This is set on the global "state" object.
//     }
//   }
//
//   render () {
//     if (!this.local.loaded) {
//       this.state._experimental_prefetch.push(this.fetch())
//     }
//
//     html`<button>
//       ${this.local.loaded ? 'loaded' : 'not loaded'
//     </button>`
//   }
//
//   update () {
//     return true
//   }
//
//   async fetch () {
//     this.local.loaded = true // async functions return promises
//   }
// }
// ```
//
// NOTE: state is never passed in it seems. Funky fn signature, this should be
// fixed.

module.exports.render = function (app, route, cb) {
  var state = {}
  state._experimental_prefetch = []

  return new Promise(function (resolve, reject) {
    // First pass to populate prefetch
    try {
      app.toString(route, state)
    } catch (err) {
      return reject(err)
    }
    resolve(state._experimental_prefetch)
  }).then(function (prefetches) {
    return Promise.all(prefetches)
  }).then(render).catch(cb)

  function render () {
    var res = { state: state }
    res.body = app.toString(route, state)
    delete res.state._experimental_prefetch // State needs to be serializable.
    var title = state.title || app.state.title // Support for choo@6
    var lang = state.language || app.state.language // Support for choo@6
    if (title) res.title = title
    if (lang) res.language = lang
    if (app.selector) res.selector = app.selector
    cb(null, res)
  }
}
