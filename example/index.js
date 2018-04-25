var html = require('choo/html')
var css = require('sheetify')
var choo = require('choo')

css('tachyons')

var app = choo()

if (process.env.NODE_ENV === 'production') {
  app.use(require('choo-service-worker')())
} else {
  app.use(require('choo-devtools')())
}

app.route('/', function (state, emit) {
  emit('DOMTitleChange', 'hello planet')
  return html`
    <body class="sans-serif">
      Hello planet
    </body>
  `
})

app.route('/other', function (state, emit) {
  emit('DOMTitleChange', 'hello planet')
  return html`
    <body class="sans-serif">
      Hello other
    </body>
  `
})

module.exports = app.mount('body')
