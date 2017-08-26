module.exports = detectRouter

function detectRouter (route, src, state) {
  if ((src.router && src.router.router && src.router.router._trie)) {
    return src.toString(route, state)
  } else {
    return null
  }
}
