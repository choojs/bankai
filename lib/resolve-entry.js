'use strict'

const resolve = require('resolve')
const cwd = process.cwd()

module.exports = resolveEntry

// resolve a path according to require.resolve algorithm
// string -> string
function resolveEntry (id) {
  const entry = ['.', '/'].indexOf(id.charAt(0)) > -1 ? id : './' + id
  return resolve.sync(entry, {basedir: cwd})
}
