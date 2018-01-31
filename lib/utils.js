var recursiveWatch = require('recursive-watch')
var findup = require('findup')
var Debug = require('debug')
var path = require('path')
var explain = require('explain-error')
var fs = require('fs')

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
    debug('watching files %s in %s', filenames, dirname)
    if (filenames.indexOf(path.relative(dirname, filename)) !== -1) {
      debug('%s changed', filename)
      cb(filename)
    }
  })
}

// Watch a full directory for changes
// Does nothing if we're already watching.
exports.watchDirs = function (basedir, dirnames, cb) {
  var debug = Debug('bankai.utils.watchDir')
  debug('watching directories %s in %s', dirnames, basedir)

  var regexes = dirnames.map(function (dirname) {
    var relative = path.join(basedir, dirname)
    return new RegExp('^' + relative)
  })

  return recursiveWatch(basedir, function (filename) {
    var changed = regexes.some(function (regex) {
      return regex.test(filename)
    })

    if (changed) {
      debug('%s changed', filename)
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

// Brotli compression: wasm for Node 8, emscriptened JS for older.
var brotliCompress
try {
  var wasm = require('wasm-brotli')
  brotliCompress = wasm.compress
} catch (err) {
  var compress = require('brotli/compress')
  brotliCompress = function (buffer) {
    return new Promise(function (resolve, reject) {
      try {
        var compressed = compress(buffer)
        if (compressed) {
          resolve(Buffer.from(compressed))
        } else {
          reject(new Error('could not compress buffer'))
        }
      } catch (err) {
        reject(err)
      }
    })
  }
}
exports.brotli = brotliCompress

exports.hasDependency = function hasDependency (dirname, dep, cb) {
  findup(dirname, 'package.json', function (err, dir) {
    if (err) return cb(null, false)
    fs.readFile(path.join(dir, 'package.json'), function (err, json) {
      if (err) return cb(explain(err, 'bankai.hasDependency: error reading package.json'))

      try {
        var pkg = JSON.parse(json)
        var hasTypeScriptDep = Boolean((pkg.dependencies && pkg.dependencies[dep]) ||
          (pkg.devDependencies && pkg.devDependencies[dep]))
        cb(null, hasTypeScriptDep)
      } catch (err) {
        if (err) return cb(explain(err, 'bankai.hasDependency: error parsing package.json'))
      }
    })
  })
}
