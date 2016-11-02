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
      -h, --help              Print usage
      -j, --js=<subargs>      Pass subarguments to browserify
      -o, --open=<browser>    Open html in a browser [default: system default]
      -O, --optimize          Optimize assets served by bankai [default: false]
      -p, --port=<n>          Bind bankai to <n> [default: 8080]

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
Create a new instance of `bankai`. Takes the following options:
- __opts.js:__ (default: `{}`). Pass options to `browserify`. Cannot be
  disabled
- __opts.css:__ (default: `{}`). Pass options to `sheetify`. Set to `false` to
  disable
- __opts.html:__ (default: `{}`). Pass options to `create-html`. Set to `false`
  to disable
- __opts.optimize:__ (default `false`). Disable livereload scripts, cache
  output and optimize all bundles

### assets.js(req?, res?)
Return a `js` stream. Sets correct header values if `req` and `res` are passed.

### assets.html(req?, res?)
Return a `html` stream. Sets correct header values if `req` and `res` are passed.

### assets.css(req?, res?)
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
[6]: https://img.shields.io/codecov/c/github/yoshuawuyts/bankai/master.svg?style=flat-square
[7]: https://codecov.io/github/yoshuawuyts/bankai
[8]: http://img.shields.io/npm/dm/bankai.svg?style=flat-square
[9]: https://npmjs.org/package/bankai
[10]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[11]: https://github.com/feross/standard
