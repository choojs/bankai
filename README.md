# bankai [![stability][0]][1]
[![npm version][2]][3] [![build status][4]][5] [![test coverage][6]][7]
[![downloads][8]][9] [![js-standard-style][10]][11]

DIY development server. Serves HTML, CSS and JS as streams. Sets proper
`Content-Type` encodings and buffers where possible for sub-milisecond response
times in production and development.

## Installation
```sh
$ npm install bankai
```

## Usage
```js
const sheetify = require('sheetify/stream')
const serverRouter = require('wayfarer')
const browserify = require('browserify')
const bankai = require('bankai')
const http = require('http')

const router = serverRouter()
http.createServer(function (req, res) {
  router(req, res).pipe(res)
}).listen(1337)

const js = bankai.js(browserify, '/src/index.js', { transform: 'babelify' })
const css = bankai.css(sheetify, '/src/index.css')
const html = bankai.html()

router('/bundle.css', css)
router('/bundle.js', js)
router('/', html)
```

## API
### bankai.html(opts)
Return an `html` stream. Cached by default. Takes the following options:
- __opts.entry:__ `js` entry point. Defaults to `/bundle.js`
- __opts.css:__ `css` entry point. Defaults to `/bundle.css`

### bankai.css(sheetify, src, opts)
Return a `css` stream. `sheetify` doesn't support incremental builds yet.
Cached if `NODE_ENV=production`. Takes the following options:
- __use:__ array of transforms. Empty by default.
- __basedir:__ project base directory. Defaults to the dir part of `src`.

### bankai.js(browserify, src, opts)
Return a `js` stream. Uses `watchify` for incremental builds if
`NODE_ENV=development`. `src` is the bundle entry file. Cached by default.

## See Also
- [budo](https://www.npmjs.com/package/budo)

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
