var html = require('choo/html')
var css = require('sheetify')
var choo = require('choo')

css('tachyons')

var app = choo()
app.use(require('choo-service-worker')())
app.route('/', function (state, emit) {
  return html`
    <body class="sans-serif">
      Hello planet
    </body>
  `
})

if (module.parent) module.exports = app
else app.mount('body')
