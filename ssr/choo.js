var getAllRoutes = require('wayfarer/get-all-routes')
var waitAll = require('p-wait-all')

module.exports.is = function (app) {
  return Boolean(app &&
    app.router &&
    app.router.router &&
    app.router.router._trie)
}

module.exports.listRoutes = function (app) {
  var keys = getAllRoutes(app.router.router)
  if (keys['/:']) delete keys['/:'] // Server rendering partials is tricky.
  return Object.keys(keys)
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
//
// NOTE: Choo currently doesn't use the passed-in state as the base. It probably
// should, so we can treat the state as the only stateful bits, and the rest is
// just context.

module.exports.render = function (app, route, state, cb) {
  state = state || {}
  state._experimental_prefetch = []
  app.toString(route, state)

  waitAll(state._experimental_prefetch)
    .then(render)
    .catch(render)

  function render () {
    var body = app.toString(route, state)
    delete state._experimental_prefetch // State needs to be serializable.
    cb(null, {
      body: body,
      title: app.state.title,
      language: app.state.language,
      initialState: state
    })
  }
}
