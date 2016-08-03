Usage
  $ bankai <command> [options]

Commands
  start       Start a bankai server

  Options
    -e, --entry=<id>       Resolve <id> from cwd and use as entry module [default: .]
                           Entry module is expected to export `() -> app`
    -p, --port=<n>         Bind bankai to <n> [default: 1337]
    -o, --open=<app>       Open the page served by bankai with <app> [default: false]
    --html.entry=<uri>     Serve client js at <uri> [default: bundle.js]
    --html.css=<uri>       Serve client css at <uri> [default: bundle.css]
    --html.favicon         Disable favicon [default: true]
    --html.title           Title to use for page
    --html.lang            Lang attribute to use [default: en]
    --css.use              sheetify plugins to use
    --js.<opt>=<value>     Pass key <opt> with <value> to browserify

Examples
  $ bankai start
  Started bankai for index.js on http://localhost:1337

  $ bankai start --entry=basic
  Started bankai fro basic/index.js on http://localhost:1337

  $ bankai start --port=3000
  Started bankai for index.js on http://localhost:3000

  $ bankai start --open
  Started bankai for index.js on http://localhost:1337
  Opening http://localhost:1337 with default browser

  $ bankai start --open Safari
  Started bankai for index.js on http://localhost:1337
  Opening http://localhost:1337 with system browser

  $ bankai start --html.title bankai
  Started bankai for index.js on http://localhost:1337

  $ bankai start --css.use sheetify-cssnext
  Started bankai for index.js on http://localhost:1337

  $ bankai start --js.fullPaths=false
