const css = require('sheetify')
const html = require('bel')

const prefix = css`
  :host > h1 { font-size: 12rem }
`

const el = html`
  <section class=${prefix}>
    <h1>hello planet</h1>
  </section>
`

document.body.appendChild(el)
