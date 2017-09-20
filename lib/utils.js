var recursiveWatch = require('recursive-watch')
var findup = require('findup')
var Debug = require('debug')
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

// Figure out what directory the file is in.
// Does nothing if a directory is passed.
exports.basefile = function (pathname) {
  if (!path.extname(pathname)) {
    return path.join(pathname, 'index.js')
  } else {
    return pathname
  }
}

// Watch the directory for changes to the entry file.
// Does nothing if we're already watching.
exports.watch = function (dirname, filenames, cb) {
  var debug = Debug('bankai.utils.watch')
  return recursiveWatch(dirname, function (filename) {
    if (filenames.indexOf(path.relative(dirname, filename)) !== -1) {
      debug(filename + ' changed')
      cb(filename)
    }
  })
}

// Watch a full directory for changes
// Does nothing if we're already watching.
exports.watchDirs = function (basedir, dirnames, cb) {
  var debug = Debug('bankai.utils.watchDir')

  var regexes = dirnames.map(function (dirname) {
    var relative = path.relative(basedir, dirname)
    return new RegExp('^' + relative)
  })

  return recursiveWatch(basedir, function (filename) {
    var changed = regexes.some(function (regex) {
      return regex.test(filename)
    })

    if (changed) {
      debug(filename + ' changed')
      cb(filename)
    }
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
