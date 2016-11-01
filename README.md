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

## CLI
```txt
  Usage:
    $ bankai <command> [options]

  Commands:
    <default>                      Run 'bankai start'
    start <filename>               Start a bankai server
    build <filename> <directory>   Compile and export files to a directory

    Options:
      -p, --port=<n>          Bind bankai to <n> [default: 8080]
      -o, --open=<browser>    Open html in a browser [default: system default]
      -O, --optimize          Optimize assets served by bankai [default: false]
      -s, --stream            Print messages to stdout
      -v, --verbose           Include debug messages
      -c, --css=<subargs>     Pass subarguments to sheetify
      -j, --js                Pass subarguments to browserify

  Examples:
    $ bankai start index.js -p 8080      # start bankai on port 8080
    $ bankai index.js --open             # open html in the browser
    $ bankai -c [ -u sheetify-cssnext ]  # use cssnext in sheetify
    $ bankai -j [ -t brfs ]              # use brfs in browserify
    $ bankai build index.js dist/        # compile and export to dist/
    $ bankai build -O index.js dist/     # optimize compiled files
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
- __opts.id__ id to expose the root bundle as via `require()`. Defaults to `bankai-app`
- __opts.basedir__ directory to resolve `src` from. Defaults to `process.cwd()`
- __opts.fullPaths__ use full module paths as module ids. Defaults to `true`

## Examples
Projects showing exemplary usage are provided. Install root project dependencies,
example project dependencies and execute `npm start` to start an example.

- [Basic](./example/basic) - Minimal CLI and API usage

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
