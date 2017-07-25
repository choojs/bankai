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
Create a new bankai instance.

### `stream = compiler.code(filename, [opts])`
Output a JS bundle.

### `stream = compiler.style(filename, [opts])`
Output a CSS bundle.

### `stream = compiler.html(filename, [opts])`
Output an HTML bundle.

## License
MIT
