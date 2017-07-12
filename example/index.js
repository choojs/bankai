var html = require('choo/html')
var css = require('sheetify')
var choo = require('choo')

var prefix = css`
  :host > h1 { font-size: 12rem }
`

var app = choo()
if (process.env.NODE_ENV !== 'production') {
  app.use(require('choo-expose')())
  app.use(require('choo-log')())
}
app.use(require('choo-service-worker')())

app.route('/', function (state, emit) {
  var title = 'Hello planet'
  if (state.title !== title) emit(state.events.DOMTITLECHANGE, title)

  return html`
    <body class=${prefix}>
      <h1>hello planet</h1>
    </body>
  `
})

if (!module.parent) app.mount('body')
else module.exports = app
