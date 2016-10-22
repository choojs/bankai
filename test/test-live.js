'use strict'
const redtape = require('redtape')
const path = require('path')
const request = require('request')
const fs = require('fs')
const childProcess = require('child_process')

const entryPath = path.join(__dirname, 'fixtures', 'app.js')
const jsSource = fs.readFileSync(entryPath, 'utf8')

let bankaiProcess

const test = redtape({
  beforeEach: (callback) => {
    bankaiProcess = childProcess.execFile(path.join(__dirname, '../bin/index.js'),
        ['start', '-l', '--css.use', 'sheetify-cssnext', `--entry`, entryPath])

    const contactBankai = () => {
      request('http://localhost:1337', function (err, resp, body) {
        if (err != null) {
          setTimeout(contactBankai, 1000)
          // callback(`Failed to get response from bankai: ${err}`)
        } else {
          console.log(`Got response from bankai`)
          callback()
        }
      })
    }

    setTimeout(contactBankai, 1000)
  },
  afterEach: (callback) => {
    console.log(`After each called`)
    if (bankaiProcess != null) {
      bankaiProcess.once('exit', () => {
        console.log(`Bankai exited`)
        callback()
      })
      console.log(`Stopping bankai`)
      bankaiProcess.kill()

      fs.writeFileSync(entryPath, jsSource)
    } else {
      console.log(`No bankai process in afterEach`)
      callback()
    }
  }
})

test('js', function (t) {
  t.test('js reloads upon source file modification', function (t) {
    t.plan(1)
    t.timeoutAfter(10000)

    fs.writeFileSync(entryPath, 'const isTamperedWith = true')

    request('http://localhost:1337/bundle.js', function (err, resp, body) {
      if (err != null) {
        t.fail(`Couldn't get bundle.js: ${err}`)
        t.end()
      } else {
        // Try for a number of times to get bundle that is as expected
        t.ok(/^const isTamperedWith = true$/m.test(body))
      }
    })
  })
})
