var html = require('choo/html')
var css = require('sheetify')
var choo = require('choo')

var prefix = css`
  :host > h1 { font-size: 12rem }
`

var app = choo()
app.route('/', function (state, emit) {
  return html`
    <section class=${prefix}>
      <h1>hello planet</h1>
    </section>
  `
})

if (!module.parent) app.mount('body')
else module.exports = app
