var html = require('choo/html')
var css = require('sheetify')
var choo = require('choo')
var splitRequire = require('split-require')
var lazy = require('choo-lazy-route')()

css('tachyons')

var app = choo()
app.use(lazy)

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

app.route('/other', lazy(function () {
  return splitRequire('./other')
}))

module.exports = app.mount('body')
