var nanotiming = require('nanotiming')
var logger = require('nanologger')
var onIdle = require('on-idle')

if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    onIdle(initReload)
  })
}

function initReload () {
  var timing = nanotiming('bankai:reload')
  var log = logger('bankai:reload')
  var source = new window.EventSource('/reload')

  source.addEventListener('open', function () {
    log.info('connected')
  })

  source.addEventListener('message', function (event) {
    try {
      var ev = JSON.parse(event.data)
    } catch (e) {
      return log.error('error parsing event', e)
    }
    if (ev.type === 'styles') handleStyles(ev.bundle)
    else if (ev.type === 'scripts') handleScripts()
  }, false)

  window.addEventListener('beforeunload', beforeunload)

  // Done setting up!
  timing()

  function beforeunload (event) {
    source.close()
  }

  function handleScripts () {
    log.info('scripts', 'reloading')
    window.location.reload()
  }

  function handleStyles (content) {
    var node = document.createElement('style')
    node.setAttribute('type', 'text/css')
    node.textContent = content

    log.info('styles', 'reloading')

    var linkNode = document.querySelector('link')
    if (linkNode) linkNode.parentNode.removeChild(linkNode)

    var prevNode = document.querySelector('style')
    if (prevNode) prevNode.parentNode.replaceChild(node, prevNode)
    else document.head.appendChild(node)
  }

  source.addEventListener('error', function (event) {
    if (event.target.readyState === window.EventSource.CLOSED) {
      source.close()
      log.info('closed')
    } else if (event.target.readyState === window.EventSource.CONNECTING) {
      log.warn('reconnecting')
    } else {
      log.error('connection closed: unknown error')
    }
  }, false)
}
