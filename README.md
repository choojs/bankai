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
- use package.json fields

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

## License
MIT
