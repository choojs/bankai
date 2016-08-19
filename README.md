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
const browserify = require('browserify')
const bankai = require('bankai')
const http = require('http')
const path = require('path')

const client = path.join(__dirname, 'client.js')

const assets = bankai()
const css = assets.css()
const js = assets.js(browserify, client)
const html = assets.html()

http.createServer((req, res) => {
  switch (req.url) {
    case '/': return html(req, res).pipe(res)
    case '/bundle.js': return js(req, res).pipe(res)
    case '/bundle.css': return css(req, res).pipe(res)
    default: return res.statusCode = 404 && res.end('404 not found')
  }
}).listen(8080)
```

## API
### assets = bankai(opts?)
- __optimize:__ default `false`. Disable livereload scripts, cache output and
  optimize all bundles.

### assets.html(opts?)
Return an `html` stream. Takes the following options:
- __opts.entry:__ `js` entry point. Defaults to `/bundle.js`
- __opts.css:__ `css` entry point. Defaults to `/bundle.css`

### assets.css(opts?)
Return a `css` stream using [sheetify](https://github.com/stackcss/sheetify).
. Takes the following options:
- __use:__ array of transforms. Empty by default.
- __basedir:__ project base directory. Defaults to `process.cwd()`

### assets.js(browserify, src, opts?)
Return a `js` stream. `src` is the bundle entry file. `opts` are passed
directly to `browserify`

## CLI

```
$ node ./bin/ --help

  DIY asset server

  Usage
    $ bankai <command> [options]

  Commands
    start       Start a bankai server
    build       Build the application and write it to disk

    Options
      -e, --entry=<id>       Resolve <id> from cwd and use as entry module [default: .]
                             Entry module is expected to export `() -> app`
      -p, --port=<n>         Bind bankai to <n> [default: 1337]
      -o, --optimize         Optimize the page and all assets served by bankai [default: false]
      -b, --browse=<app>     Browse the page served by bankai with <app> [default: false]
      -d, --dir=<dir>        Write built application files to <dir>
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

    $ bankai build --dir=dist

    $ bankai build --dir=dist --html.title bankai

    $ bankai build --dir=dist --css.use sheetify-cssnext

    $ bankai build --dir=dist --js.fullPaths=false
```

## Examples
Projects showing exemplary usage are provided. Install root project dependencies,
example project dependencies and execute `npm start` to start an example.

- [Basic](./example/basic) - Showing default settings, Hot Module Replacement

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
