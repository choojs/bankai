# bankai
[![npm version][2]][3] [![build status][4]][5]
[![downloads][8]][9] [![js-standard-style][10]][11]

The easiest way to compile JavaScript, HTML and CSS.

We want people to have fun building things for the web. There should be no
hurdles between a great idea, and your first prototype. And once you're ready,
it should be easy to package it up and share it online. That's Bankai: a tool
that helps you build for the web. No configuration, and no hassle - that's our
promise.

If this is your first time building something for the web, take a look at
[choojs/create-choo-app](https://github.com/choojs/create-choo-app) to help get
a project setup from scratch :sparkles:.

## Usage
```txt
  $ bankai <command> [entry] [options]

  Commands:

    build       compile all files to dist/
    inspect     inspect the bundle dependencies
    start       start a development server

  Options:

    -d, --debug       output lots of logs
    -h, --help        print usage
    -q, --quiet       don't output any logs
    -v, --version     print version

  Examples:

    Start a development server
    $ bankai start index.js

    Visualize all dependencies in your project
    $ bankai inspect index.js

    Compile all files in the project to disk
    $ bankai build index.js

  Running into trouble? Feel free to file an issue:
  https://github.com/choojs/bankai/issues/new

  Do you enjoy using this software? Become a backer:
  https://opencollective.com/choo
```

## Optimizations
Bankai applies lots of optimizations to projects. Generally you won't need to
care how we do this: it's lots of glue code, and not necessarily pretty. But it
can be useful to know which optimizations we apply. This is a list:

### JavaScript
- __bundle-collapser:__ Remove all pathnames from inside the bundle, and
  replace them with IDs. This not only makes bundles smaller, it prevents
  details from your local dev setup leaking.
- __common-shakeify:__ Remove unused JavaScript code from the bundle. Best
  known as _dead code elimination_ or _tree shaking_.
- __unassertify:__ Remove all `require('assert')` statements from the code.
  Only applied for production builds.
- __uglifyify:__ Minify the bundle.
- __yo-yoify:__ Optimize `choo` HTML code so it run significantly faster in the
  browser.
- __glslify:__ Adds a module system to GLSL shaders.
- __envify:__ Allow environment variables to be used in the bundle. Especially
  useful in combination with minification, which removes unused code paths.
- __brfs:__ Statically inline calls to `fs.readFile()`. Useful to ship assets
  in the browser.

### CSS
- __sheetify:__ extract all inline CSS from JavaScript, and include it in
  `bundle.js`.
- __purifyCSS:__ removes unused CSS from the project.
- __cleanCSS:__ minify the bundle.

### HTML
- __polyfill:__ preloads [polyfill.io](http://polyfill.io/), the zero overhead
  polyfilling service.
- __inline-critical-css:__ extract all crititical CSS for a page into the
  `<head>` of the document. This means that every page will be able to render
  after the first roundtrip, which makes for super snappy pages.
- __async load scripts:__ loads scripts in the background using the
  [`defer`](https://devdocs.io/html/attributes#defer-attribute) attribute.
- __async load styles:__ loads styles in the background using the
  [`preload`](https://devdocs.io/html/attributes#preload-attribute) attribute.
- __async load styles:__ preloads fonts in the background using the
  [`preload`](https://devdocs.io/html/attributes#preload-attribute) attribute.
- __server render:__ server renders Choo applications. We're welcome to
  supporting other frameworks too. PRs welcome!
- __manifest:__ includes a link to `manifest.json` so the application can be
  installed on mobile.
- __viewport:__ defines the right viewport dimensions to make applications
  accessible for everyone.
- __theme color:__ sets the theme color defined in `manifest.json` so the
  navigator bar on mobile is styled on brand.
- __title:__ sets the right title on a page. Either extracts it from the
  application (choo only, for now) or uses whatever the title is in
  `manifest.json`.
- __live reload:__ during development, we inject a live reload script.

## Configuration
The Bankai CLI doesn't take any flags, other than to manipulate how we log to
the console. Configuring Bankai is done by modifying `package.json`.

Bankai is built on three technologies: [`browserify`][browserify],
[`sheetify`][sheetify], and [`documentify`][documentify]. Because these can be
configured inside `package.json` it means that Bankai itself can be configured
from there too. Also if people ever decide to switch from the command line to
JavaScript, no extra configuration is needed.

```json
{
  "name": "my-app",
  "browserify": {
     "transform": [
       "some-browserify-transform"
     ]
   },
   "sheetify": {
     "transform": [
       "some-sheetify-transform"
     ]
   },
   "documentify": {
     "transform": [
       "some-documentify-transform"
     ]
   }
}
```

## HTTP
Bankai can be hooked up directly to an HTTP server, which is useful when
working on full stack code.
```js
var bankai = require('bankai/http')
var http = require('http')
var path = require('path')

var compiler = bankai(path.join(__dirname, 'example'))
var server = http.createServer(function (req, res) {
  compiler(req, res, function () {
    res.statusCode = 404
    res.end('not found')
  })
})

server.listen(8080, function () {
  console.log('listening on port 8080')
})
```

## Events
### `compiler.on('error', callback(error))`
Whenever an internal error occurs.

### `compiler.on('change', callback(nodeName, edgeName, state))`
Whenever a change in the internal graph occurs.

## API
### `compiler = bankai(entry, [opts])`
Create a new bankai instance. Takes either an entry file location, or an array
of files.

### `compiler.documents(routename, [opts], done(err, buffer))`
Output an HTML bundle for a route. Routes are determined based on the project's
router. Pass `'/'` to get the default route.

- __opts.state:__ Will be passed the render function for the route, and inlined
  in the `<head>` of the body as `window.initialState`.

### `compiler.scripts(filename, done(err, buffer))`
Pass in a filename and output a JS bundle.

### `compiler.assets(assetName, done(err, buffer))`
Output any other file besides JS, CSS or HTML.

### `compiler.styles(name, done(err, buffer))`
Output a CSS bundle.

### `compiler.manifest(done(err, buffer))`
Output a `manifest.json`.

### `compiler.serviceWorker(done(err, buffer))`
Output a service worker.

### `compiler.close()`
Close all file watchers.

## License
Apache License 2.0

[sheetify]: https://github.com/stackcss/sheetify
[documentify]: https://github.com/stackhtml/documentify
[browserify]: https://github.com/substack/node-browserify

[0]: https://img.shields.io/badge/stability-experimental-orange.svg?style=flat-square
[1]: https://nodejs.org/api/documentation.html#documentation_stability_index
[2]: https://img.shields.io/npm/v/bankai.svg?style=flat-square
[3]: https://npmjs.org/package/bankai
[4]: https://img.shields.io/travis/choojs/bankai/master.svg?style=flat-square
[5]: https://travis-ci.org/choojs/bankai
[6]: https://img.shields.io/codecov/c/github/choojs/bankai/master.svg?style=flat-square
[7]: https://codecov.io/github/choojs/bankai
[8]: http://img.shields.io/npm/dm/bankai.svg?style=flat-square
[9]: https://npmjs.org/package/bankai
[10]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[11]: https://github.com/feross/standard
