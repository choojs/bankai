var html = require('choo/html')
var css = require('sheetify')
var choo = require('choo')

var prefix = css`
  :host > h1 { font-size: 12rem }
`

var app = choo()
app.use(function (state, emitter) {
  emitter.on(state.events.DOMCONTENTLOADED, function () {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register('/service.js', {scope: '/'})
    }
  })
})
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
