var nanoajax = require('nanoajax')
// var yo = require('yo-yo')

// script injected in development mode
function updateStream (target, callback) {
  var es = new window.EventSource(target)

  es.addEventListener('message', function (e) {
    nanoajax.ajax({url: target}, function (code, text) {
      callback(null, text)
    })
  })
}

function toArray (list) {
  return Array.prototype.slice.call(list)
}

function main () {
  var scripts = toArray(document.querySelectorAll('script[data-bankai-hmr]'))
  var styles = toArray(document.querySelectorAll('link[data-bankai-hmr]'))

  scripts.forEach(function (script) {
    updateStream(script.src, function (error, data) {
      if (error) {
        console.error(error)
      }
      var el = document.createElement('script')
      var prev = document.querySelector('[data-bankai-hmr-copy="' + script.src + '"]')
      el.text = data
      el.setAttribute('data-bankai-hmr-copy', script.src)

      if (prev) {
        prev.parentNode.replaceChild(el, prev)
      } else {
        script.parentNode.insertBefore(el, script.nextSibling)
      }

      var id = script.dataset.bankaiHmr
      var application = require(id)
      var app = application(window.__BANKAI_GLOBAL_STATE_HOOK__, {
        onStateChange: function (data, state) { window.__BANKAI_GLOBAL_STATE_HOOK__ = state }
      })
      var tree = app.start()
      document.body.replaceChild(tree, document.body.firstChild)
      // yo.update(old, tree)
    })
  })

  styles.forEach(function (style) {
    updateStream(style.href, function (error, data) {
      if (error) {
        console.error(error)
      }
      var el = document.createElement('style')
      var prev = document.querySelector('[data-bankai-hmr-copy="' + style.href + '"]')
      el.setAttribute('data-bankai-hmr-copy', style.href)
      el.appendChild(document.createTextNode(data))

      if (prev) {
        prev.parentNode.replaceChild(el, prev)
      } else {
        style.parentNode.insertBefore(el, style.nextSibling)
      }
    })
  })
}

main()
