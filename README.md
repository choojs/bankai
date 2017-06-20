<h1 align="center">bankai</h1>

<div align="center">
  <strong>Streaming {js,html,css} compiler</strong>
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

## Philosophy
Building things takes time. Configuring tooling takes time. We believe that by
taking modular tools, and wrapping them in a zero-configuration package we
can help people iterate faster and produce better results. And once people are
deep enough into a project that they might need something different, we make
sure they can easily create their own tooling from the components we use.

## Usage
```txt
  Usage:
    $ bankai <command> [options]

  Commands:
    <default>                      Run 'bankai start'
    start <filename>               Start a bankai server
    build <filename> <directory>   Compile and export files to a directory
    inspect <filename>             Visualize the dependency tree

    Options:
      -a, --assets=<directory>  Serve static assets [default: assets]
      -A, --address=<ip>      Ip address to listen [default: localhost]
      -c, --css=<subargs>     Pass subarguments to sheetify
      -d, --debug             Include sourcemaps [default: false]
      -e, --electron          Enable electron mode for the bundler
      -h, --help              Print usage
      -H, --html=<subargs>    Pass subarguments to create-html
      -j, --js=<subargs>      Pass subarguments to browserify
      -o, --open=<browser>    Open html in a browser [default: system default]
      -p, --port=<n>          Bind bankai to a port [default: 8080]
      -V, --verbose           Include debug messages
      -w, --watch <bool>      Toggle watch mode

  Examples:
    $ bankai index.js -p 8080            # start bankai on port 8080
    $ bankai index.js --open             # open html in the browser
    $ bankai -c [ -u sheetify-cssnext ]  # use cssnext in sheetify
    $ bankai -j [ -t brfs ]              # use brfs in browserify
    $ bankai build index.js dist/        # compile and export to dist/

  Notes:
    When specifying --watch using the long form, you must omit
    the = when specifying them to be turned off.

  Examples:
    bankai example.js --open=firefox-aurora -p 3000
    bankai example.js --watch false
```

## API
### assets = bankai(entryFile, [opts])
Create a new instance of `bankai`. The first argument is a route to the entry
file that is compiled by `browserify`. The second argument is optional and can
take the following options:
- __opts.js:__ (default: `{}`). Pass options to `browserify`. Cannot be
  disabled
- __opts.css:__ (default: `{}`). Pass options to `sheetify`. Set to `false` to
  disable
- __opts.html:__ (default: `{}`). Pass options to `create-html`. Set to `false`
  to disable
- __opts.watch:__ Disable livereload scripts
- __opts.electron:__ (default `false`). Enable [electron][electron] mode for
  the bundler.  Relies on `index.html` being served as a static file using
  `file://` to ensure `require()` paths are resolved correctly
- __opts.assert:__ (default: `true`) disable all calls to `require('assert')`

### readableStream = assets.js([req], [res])
Return a `js` stream. Sets correct header values if `req` and `res` are passed.
Uses [browserify][browserify] and [watchify][watchify] under the hood.

### readableStream = assets.html([req], [res])
Return a `html` stream. Sets correct header values if `req` and `res` are
passed. Uses [create-html][chtml] under the hood.

### readableStream = assets.css([req], [res])
Return a `css` stream. Sets correct header values if `req` and `res` are
passed. Uses [sheetify][sheetify] under the hood.

### readableStream = assets.static([req], [res])
Return a `static` stream. Don't set any header. Useful to serve static assets
like images, icons, fonts, etc. Uses [send][send] under the hood.

## Installation
```sh
$ npm install bankai
```

## See Also
- [stackcss/sheetify][sheetify]
- [substack/browserify][browserify]
- [sethvincent/create-html][chtml]

## Similar Packages
- [mattdesl/budo](https://www.npmjs.com/package/budo)
- [maxogden/wzrd](https://www.npmjs.com/package/wzrd)
- [chrisdickinson/beefy](https://www.npmjs.com/package/beefy)

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
[electron]: https://github.com/electron/electron
[sheetify]: https://github.com/stackcss/sheetify
[watchify]: https://github.com/substack/watchify
[browserify]: https://github.com/substack/node-browserify
[chtml]: https://github.com/sethvincent/create-html
[send]: https://github.com/pillarjs/send
