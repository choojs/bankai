#! /usr/bin/env node

var spawn = require('child_process').spawn
var stdout = require('stdout-stream')
var through = require('through2')
var pumpify = require('pumpify')
var split = require('split2')
var EOL = require('os').EOL
var path = require('path')
var pump = require('pump')

// Switch to an alternate terminal buffer; clearing the screen.
process.stdout.write('\x1b[?1049h\x1b[H')

// Strip all 'http2 is experimental' warnings.
var regex = /ExperimentalWarning/
var filter = through(function (chunk, enc, cb) {
  if (!regex.test(chunk)) this.push(chunk + EOL)
  cb()
})
var sink = pumpify(split(), filter, stdout)

// Spawn up our main program.
var args = process.argv.slice(2)
var nodeArgs = [ '--expose-http2', path.join(__dirname, 'bin.js') ]
var nodeOpts = { stdio: [ 'inherit', 'pipe', 'pipe' ], shell: true }
var child = spawn('node', nodeArgs.concat(args), nodeOpts)

// Pipe child output to stdout.
pump(child.stdout, sink)
pump(child.stderr, sink)

// Call onExit whenever we exit.
process.on('SIGINT', onExit)
process.on('SIGTERM', onExit)
process.on('exit', onExit)

// Switch back to the main terminal buffer, restoring the screen.
function onExit () {
  process.stdout.write('\x1b[?1049l')
}
