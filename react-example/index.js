var React = require('react')
var ReactDOM = require('react-dom')
var { Link, Route, StaticRouter, BrowserRouter } = require('react-router-dom')

const h = React.createElement

const App = () => (
  h('div', {},
    h(Link, { to: '/' }, 'Home'),
    h(Link, { to: '/beep' }, 'Beep'),
    h(Link, { to: '/beep/boop' }, 'Boop'),
    h(Link, { to: '/about' }, 'About'),
    h(Route, {
      path: '/',
      exact: true,
      component: () => (
        h('h1', {}, 'Home')
      )
    }),
    h(Route, {
      path: '/beep',
      component: () => (
        h(React.Fragment, {},
          h('h1', {}, 'Hello world'),
          h(Route, {
            path: '/beep/boop',
            component: () => h('h2', {}, 'Robotsssss')
          })
        )
      )
    }),
    h(Route, {
      path: '/about',
      component: () => (
        h('h1', {}, 'About')
      )
    })
  )
)

const app = h(App)
let element

if (typeof window === 'undefined') {
  element = h(StaticRouter, {}, app)
} else {
  ReactDOM.render(h(BrowserRouter, {}, app), document.body)
}

module.exports = element
