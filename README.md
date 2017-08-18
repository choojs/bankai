# bankai

Streaming `{js,css,html}` compiler.

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
from there too. Also if people ever decide to switch from the Bankai CLI, to
calling it from JavaScript, no extra configuration is needed.

```json
{
  "name": "my-app",
  "browserify": {
     "transforms": [
       "some-browserify-transform"
     ]
   },
   "sheetify": {
     "transforms": [
       "some-sheetify-transform"
     ]
   },
   "documentify": {
     "transforms": [
       "some-documentify-transform"
     ]
   }
}
```

## API
### `compiler = bankai(entry, [opts])`
Create a new bankai instance. Takes either an entry file location, or an array
of files.

### `compiler.script(filename, cb)`
Pass in a filename and output a JS bundle.

### `compiler.style(cb)`
Output a CSS bundle.

### `compiler.document(routename, cb)`
Output an HTML bundle for a route. Routes are determined based on the project's
router. Pass `'/'` to get the default route.

### `compiler.asset(assetName, cb)`
Output any other file besides JS, CSS or HTML.

### `compiler.manifest(cb)`
Output a `manifest.json`.

### `compiler.serviceWorker(cb)`
Output a service worker.

## License
MIT

[sheetify]: https://github.com/stackcss/sheetify
[documentify]: https://github.com/stackhtml/documentify
[browserify]: https://github.com/substack/node-browserify
