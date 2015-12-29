const chokidar = require('chokidar')
const tinylr = require('tiny-lr')

const defaultIgnores = [
  'node_modules/**', 'bower_components/**',
  '.git', '.hg', '.svn', '.DS_Store',
  '*.swp', 'thumbs.db', 'desktop.ini'
]
const defaultGlob = '**/*.{html,css}'
const defaultPort = 35729

module.exports = livereload

// create a livereload utility
// starts watching files, and returns
// reload() and close() methods
// obj -> obj
function livereload (opts) {
  opts = opts || {}

  var ready = false
  var closed = false

  const ignores = opts.ignore || defaultIgnores
  const glob = opts.glob || defaultGlob
  const port = opts.port || defaultPort

  const watcher = chokidar.watch(glob, { ignored: ignores })
  const reloader = tinylr().listen(port)

  watcher.on('change', reload)
  watcher.on('add', reload)
  watcher.on('ready', function () {
    ready = true
  })

  return {
    close: close,
    reload: reload
  }

  function close () {
    if (closed) return
    if (ready) watcher.close()
    reloader.close()
    closed = true
  }

  function reload (file) {
    tinylr.reload(file)
  }
}
