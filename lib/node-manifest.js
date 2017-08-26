var recursiveWatch = require('recursive-watch')
var explain = require('explain-error')
var parseJson = require('fast-json-parse')
var findup = require('findup')
var path = require('path')
var fs = require('fs')

var DEFAULT_COLOR = Buffer.from('#fff')
var DEFAULT_MANIFEST = Buffer.from(JSON.stringify({
  name: 'app',
  short_name: 'app',
  theme_color: '#fff'
}))

var watching = false
var filenames = [
  'manifest.json'
]

module.exports = node

function node (state, createEdge, emit) {
  var basedir = dirname(state.arguments.entry)
  var self = this

  watch(basedir, parse)
  parse()

  function parse () {
    find(basedir, filenames, function (err, filename) {
      if (err) {
        createEdge('color', DEFAULT_COLOR)
        createEdge('bundle', DEFAULT_MANIFEST)
        return
      }

      fs.readFile(filename, function (err, file) {
        if (err) {
          return self.emit('error', explain(err, 'bankai/node-manifest: could not read file ' + file))
        }

        var res = parseJson(file)
        if (res.err) {
          return self.emit('error', explain(res.err, 'bankai/node-manifest: could not parse JSON in ' + file))
        }

        createEdge('color', Buffer.from(res.value.color || ''))
        createEdge('bundle', Buffer.from(JSON.stringify(res.value)))
      })
    })
  }
}

// Figure out what directory the file is in.
// Does nothing if a directory is passed.
function dirname (pathname) {
  if (!path.extname(pathname)) {
    return pathname
  } else {
    return path.dirname(pathname)
  }
}

// Watch the directory for changes to the entry file.
// Does nothing if we're already watching.
function watch (dirname, cb) {
  if (watching) return
  watching = true
  recursiveWatch(dirname, function (filename) {
    if (filenames.indexOf(path.relative(dirname, filename)) !== -1) cb()
  })
}

// Find the entry file.
function find (rootname, arr, done) {
  if (!arr.length) return done(new Error('Could not find files'))
  var filename = arr[0]
  var newArr = arr.slice(1)
  findup(rootname, filename, function (err, dirname) {
    if (err) return find(rootname, newArr, done)
    done(null, path.join(dirname, filename))
  })
}
