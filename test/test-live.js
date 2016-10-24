const test = require('tape')
const path = require('path')
const fs = require('fs')
const childProcess = require('child_process')
const phantom = require('phantom')
const request = require('request')
const Promise = require('bluebird')

const entryPath = path.join(__dirname, 'fixtures', 'index.js')
const appJsPath = path.join(__dirname, 'fixtures', 'app.js')
const jsSource = fs.readFileSync(appJsPath, 'utf8')

const testTimeout = 20000
let bankaiProcess
const port = 10001
const url = `http://localhost:${port}`
const waitTimeout = 10000

// TODO: Make setup and teardown run before each test
test('setup', (t) => {
  t.plan(1)

  bankaiProcess = childProcess.execFile(path.join(__dirname, '../bin/index.js'),
      ['start', '-l', '-p', port, '--css.use', 'sheetify-cssnext', `--entry`, entryPath])

  let numTries = 0

  const goToBankai = () => {
    ++numTries
    request(url, (error) => {
      if (error == null) {
        t.pass('Got response from bankai server')
      } else {
        if (numTries < 3) {
          setTimeout(goToBankai, 1000)
        } else {
          t.fail(`Failed to get response from bankai server`)
        }
      }
    })
  }

  setTimeout(goToBankai, 300)
})

// Wait for condition (as evaluated by callback) to become true
const waitForCondition = Promise.method((page, t, callback) => {
  return new Promise((resolve, reject) => {
    const evaluateCondition = () => {
      page.evaluate(callback)
        .then((wasSuccessful) => {
          if (wasSuccessful) {
            resolve()
          } else {
            const timeElapsed = Date.now() - startOfWait
            if (timeElapsed < waitTimeout) {
              setTimeout(evaluateCondition, 50)
            } else {
              reject()
            }
          }
        })
    }

    let startOfWait = Date.now()
    evaluateCondition()
  })
    .catch((error) => {
      if (error != null) {
        console.error(error)
        t.fail(`An unexpected error occurred`)
      } else {
        throw error
      }
    })
})

const testWithPhantom = (func) => {
  phantom.create()
    .then((instance) => {
      return instance.createPage()
        .then((page) => {
          return page.open(url)
            .then(() => {
              return page
            })
        })
        .then((page) => {
          return [instance, page]
        })
    })
    .then(([instance, page]) => {
      return Promise.method(func)(page)
        .finally(() => {
          page.close()
          instance.exit()
        })
    })
}

test('js', (t) => {
  t.test('live reload is triggered by JS source modification', (t) => {
    t.plan(1)
    t.timeoutAfter(testTimeout)

    fs.writeFileSync(appJsPath, 'document.title = \'Modified\'')

    testWithPhantom((page) => {
      return waitForCondition(page, t, function () {
        return document.title === 'Modified'
      })
        .then(() => {
          t.pass(`Page was reloaded`)
        }, () => {
          t.fail(`Page was not reloaded`)
        })
    })
  })
})

test('teardown', (t) => {
  if (bankaiProcess != null) {
    bankaiProcess.once('exit', () => {
      t.end()
    })
    bankaiProcess.kill()

    fs.writeFileSync(appJsPath, jsSource)
  } else {
    t.end()
  }
})
