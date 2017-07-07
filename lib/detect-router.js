module.exports = detectRouter

function detectRouter (route, src) {
  if ((src.router && src.router.router && src.router.router._trie)) {
    return src.toString(route)
  } else {
    return null
  }
}
