var css = require('sheetify')
var html = require('bel')

var prefix = css`
  :host > h1 { font-size: 12rem }
`

// if (process.env.NODE_ENV !== 'production') {
//   window.alert('not in production!')
// }

var el = html`
  <section class=${prefix}>
    <h1>hello planet</h1>
  </section>
`

document.body.appendChild(el)
