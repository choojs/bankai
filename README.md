<h1 align="center">bankai</h1>

<div align="center">
  <strong>Streaming asset compiler</strong>
</div>
<div align="center">
  Serve, compile and optimize assets
</div>

---

<div align="center">
  <!-- Stability -->
  <a href="https://nodejs.org/api/documentation.html#documentation_stability_index">
    <img src="https://img.shields.io/badge/stability-experimental-orange.svg?style=flat-square"
      alt="API stability" />
  </a>
  <!-- NPM version -->
  <a href="https://npmjs.org/package/bankai">
    <img src="https://img.shields.io/npm/v/bankai.svg?style=flat-square"
      alt="NPM version" />
  </a>
  <!-- Build Status -->
  <a href="https://travis-ci.org/yoshuawuyts/bankai">
    <img src="https://img.shields.io/travis/yoshuawuyts/bankai/master.svg?style=flat-square"
      alt="Build Status" />
  </a>
  <!-- Test Coverage -->
  <a href="https://codecov.io/github/yoshuawuyts/bankai">
    <img src="https://img.shields.io/codecov/c/github/yoshuawuyts/bankai/master.svg?style=flat-square"
      alt="Test Coverage" />
  </a>
  <!-- Downloads -->
  <a href="https://npmjs.org/package/bankai">
    <img src="https://img.shields.io/npm/dm/bankai.svg?style=flat-square"
      alt="Downloads" />
  </a>
  <!-- Standard -->
  <a href="https://codecov.io/github/yoshuawuyts/bankai">
    <img src="https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square"
      alt="Standard" />
  </a>
</div>

## Installation
```sh
$ npm install bankai
```

## Usage
Given the following `client.js`:
```js
const css = require('sheetify')
const html = require('bel')

const prefix = css`
  :host > h1 { font-size: 12rem }
`

const el = html`
  <section class=${prefix}>
    <h1>hello planet</h1>
  </section>
`

document.body.appendChild(el)
```

Render with `server.js`:
```js
const bankai = require('bankai')
const http = require('http')
const path = require('path')

const clientPath = path.join(__dirname, 'client.js')
const assets = bankai(clientPath)

http.createServer((req, res) => {
  switch (req.url) {
    case '/': return assets.html(req, res).pipe(res)
    case '/bundle.js': return assets.js(req, res).pipe(res)
    case '/bundle.css': return assets.css(req, res).pipe(res)
    default: return (res.statusCode = 404 && res.end('404 not found'))
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
      -c, --css=<subargs>     Pass subarguments to sheetify
      -d, --debug             Include sourcemaps [default: false]
      -h, --help              Print usage
      -H, --html=<subargs>    Pass subarguments to create-html
      -j, --js=<subargs>      Pass subarguments to browserify
      -o, --open=<browser>    Open html in a browser [default: system default]
      -O, --optimize          Optimize assets served by bankai [default: false]
      -p, --port=<n>          Bind bankai to a port [default: 8080]
      -V, --verbose           Include debug messages

  Examples:
    $ bankai index.js -p 8080            # start bankai on port 8080
    $ bankai index.js --open             # open html in the browser
    $ bankai -c [ -u sheetify-cssnext ]  # use cssnext in sheetify
    $ bankai -j [ -t brfs ]              # use brfs in browserify
    $ bankai build index.js dist/        # compile and export to dist/
    $ bankai build -O index.js dist/     # optimize compiled files
```

## API
### assets = bankai(entryFile, opts?)
Create a new instance of `bankai`. The first argument is a route to the entry
file that is compiled by `browserify`. The second argument is optional and can
take the following options:
- __opts.js:__ (default: `{}`). Pass options to `browserify`. Cannot be
  disabled
- __opts.css:__ (default: `{}`). Pass options to `sheetify`. Set to `false` to
  disable
- __opts.html:__ (default: `{}`). Pass options to `create-html`. Set to `false`
  to disable
- __opts.optimize:__ (default `false`). Disable livereload scripts, cache
  output and optimize all bundles

### readableStream = assets.js(req?, res?)
Return a `js` stream. Sets correct header values if `req` and `res` are passed.

### readableStream = assets.html(req?, res?)
Return a `html` stream. Sets correct header values if `req` and `res` are passed.

### readableStream = assets.css(req?, res?)
Return a `css` stream. Sets correct header values if `req` and `res` are passed.

## See Also
- [budo](https://www.npmjs.com/package/budo)
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
[8]: http://img.shields.io/npm/dm/bankai.svg?style=flat-square
[9]: https://npmjs.org/package/bankai
[10]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[11]: https://github.com/feross/standard
