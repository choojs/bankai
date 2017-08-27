var recursiveWatch = require('recursive-watch')
var findup = require('findup')
var path = require('path')

// Figure out what directory the file is in.
// Does nothing if a directory is passed.
exports.dirname = function (pathname) {
  if (!path.extname(pathname)) {
    return pathname
  } else {
    return path.dirname(pathname)
  }
}

// Watch the directory for changes to the entry file.
// Does nothing if we're already watching.
exports.watch = function (dirname, filenames, cb) {
  recursiveWatch(dirname, function (filename) {
    if (filenames.indexOf(path.relative(dirname, filename)) !== -1) cb()
  })
}

// Find the entry file.
exports.find = function find (rootname, arr, done) {
  if (!arr.length) return done(new Error('Could not find files'))
  var filename = arr[0]
  var newArr = arr.slice(1)
  findup(rootname, filename, function (err, dirname) {
    if (err) return find(rootname, newArr, done)
    done(null, path.join(dirname, filename))
  })
}
