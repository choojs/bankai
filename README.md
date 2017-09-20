# bankai
[![npm version][2]][3] [![build status][4]][5]
[![downloads][8]][9] [![js-standard-style][10]][11]

The easiest way to compile JavaScript, HTML and CSS.

We want people to have fun building things for the web. There should be no
hurdles between a great idea, and your first prototype. And once you're ready,
it should be easy to package it up and share it online. That's Bankai: a tool
that helps you build for the web. No configuration, no hassle. Get out there
and make things!

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

## Events
### `compiler.on('error', callback(error))`
Whenever an internal error occurs.

### `compiler.on('change', callback(nodeName, edgeName, state))`
Whenever a change in the internal graph occurs.

## API
### `compiler = bankai(entry, [opts])`
Create a new bankai instance. Takes either an entry file location, or an array
of files.

### `compiler.documents(routename, [opts], cb)`
Output an HTML bundle for a route. Routes are determined based on the project's
router. Pass `'/'` to get the default route.

- __opts.state:__ Will be passed the render function for the route, and inlined
  in the `<head>` of the body as `window.initialState`.

### `compiler.scripts(filename, cb)`
Pass in a filename and output a JS bundle.

### `compiler.assets(assetName, cb)`
Output any other file besides JS, CSS or HTML.

### `compiler.style(cb)`
Output a CSS bundle.

### `compiler.manifest(cb)`
Output a `manifest.json`.

### `compiler.serviceWorker(cb)`
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
