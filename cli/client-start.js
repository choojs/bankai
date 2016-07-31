function main () {
  var el = document.querySelector('[data-bankai]')
  var id = el.dataset.bankai
  var application = require(id)

  var app = application(window.__BANKAI_GLOBAL_STATE_HOOK__, {
    onStateChange: function (data, state) {
      window.__BANKAI_GLOBAL_STATE_HOOK__ = state
    }
  })

  var tree = app.start('[data-bankai="' + id + '"]')

  if (tree) {
    document.body.appendChild(tree)
  }
}

main()
