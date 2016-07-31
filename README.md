# bankai [![stability][0]][1]
[![npm version][2]][3] [![build status][4]][5] [![test coverage][6]][7]
[![downloads][8]][9] [![js-standard-style][10]][11]

DIY asset server. Serves HTML, CSS and JS as streams. Sets proper
`Content-Type` encodings and buffers where possible for sub-milisecond response
times in production and development.

## Installation
```sh
$ npm install bankai
```

## Usage
```js
const serverRouter = require('server-router')
const browserify = require('browserify')
const bankai = require('bankai')
const http = require('http')

const router = createRouter()
http.createServer(function (req, res) {
  router(req, res).pipe(res)
}).listen(1337)

function createRouter () {
  const router = serverRouter()

  const html = bankai.html()
  router.on('/', html)

  const css = bankai.css({ use: [ 'sheetify-cssnext' ] })
  router.on('/bundle.css', css)

  const js = bankai.js(browserify, '/src/index.js', { transform: 'babelify' })
  router.on('/bundle.js', js)

  return router
}
```

## API
### bankai.html(opts)
Return an `html` stream. Cached by default. Includes livereload if
`NODE_ENV=development`. Takes the following options:
- __opts.entry:__ `js` entry point. Defaults to `/bundle.js`
- __opts.css:__ `css` entry point. Defaults to `/bundle.css`

### bankai.css(opts)
Return a `css` stream.
Cached if `NODE_ENV=production`. Takes the following options:
- __use:__ array of transforms. Empty by default.
- __basedir:__ project base directory. Defaults to `process.cwd()`

### bankai.js(browserify, src, opts)
Return a `js` stream. Uses `watchify` for incremental builds if
`NODE_ENV=development`. `src` is the bundle entry file. Cached by default.

## CLI

```
$ bankai --help

  DIY asset server

  Usage
    $ bankai <command> [options]

  Commands
    start       Start a bankai server

    Options
      -e, --entry=<id>       Resolve <id> from cwd and use as entry module [default: .]
                             Entry module is expected to export `() -> app`
      -p, --port=<n>         Bind bankai to <n> [default: 1337]
      -o, --open=<app>       Open the page served by bankai with <app> [default: false]
      --html.entry=<uri>     Serve client js at <uri> [default: bundle.js]
      --html.css=<uri>       Serve client css at <uri> [default: bundle.css]
      --html.favicon         Disable favicon [default: true]
      --html.title           Title to use for page
      --html.lang            Lang attribute to use [default: en]
      --css.use              sheetify plugins to use
      --js.<opt>=<value>     Pass key <opt> with <value> to browserify

  Examples
    $ bankai start
    Started bankai for index.js on http://localhost:1337

    $ bankai start --entry=basic
    Started bankai fro basic/index.js on http://localhost:1337

    $ bankai start --port=3000
    Started bankai for index.js on http://localhost:3000

    $ bankai start --open
    Started bankai for index.js on http://localhost:1337
    Opening http://localhost:1337 with default browser

    $ bankai start --open Safari
    Started bankai for index.js on http://localhost:1337
    Opening http://localhost:1337 with system browser

    $ bankai start --html.title bankai
    Started bankai for index.js on http://localhost:1337

    $ bankai start --css.use sheetify-cssnext
    Started bankai for index.js on http://localhost:1337

    $ bankai start --js.fullPaths=false
```

## See Also
- [budo](https://www.npmjs.com/package/budo)
- [tiny-lr](https://github.com/mklabs/tiny-lr)
- [sheetify](https://github.com/sheetify/sheetify)
- [browserify](https://github.com/substack/node-browserify)

## License
[MIT](https://tldrlegal.com/license/mit-license)

[0]: https://img.shields.io/badge/stability-experimental-orange.svg?style=flat-square
[1]: https://nodejs.org/api/documentation.html#documentation_stability_index
[2]: https://img.shields.io/npm/v/bankai.svg?style=flat-square
[3]: https://npmjs.org/package/bankai
[4]: https://img.shields.io/travis/yoshuawuyts/bankai/master.svg?style=flat-square
[5]: https://travis-ci.org/yoshuawuyts/bankai
[6]: https://img.shields.io/codecov/c/github/yoshuawuyts/bankai/master.svg?style=flat-square
[7]: https://codecov.io/github/yoshuawuyts/bankai
[8]: http://img.shields.io/npm/dm/bankai.svg?style=flat-square
[9]: https://npmjs.org/package/bankai
[10]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[11]: https://github.com/feross/standard
