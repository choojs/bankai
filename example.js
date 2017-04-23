var html = require('choo/html')
var css = require('sheetify')
var choo = require('choo')

var prefix = css`
  :host > h1 { font-size: 12rem }
`

var app = choo()

app.route('/', mainView)
app.route('/about', aboutView)

if (module.parent) module.exports = app
else app.mount('body')

function mainView () {
  return html`
    <body class=${prefix}>
      <h1>hello planet</h1>
    </body>
  `
}

function aboutView () {
  return html`
    <body class=${prefix}>
      <p>beep boop</p>
    </body>
  `
}
