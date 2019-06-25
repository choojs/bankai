# bankai change log

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](http://semver.org/).

## 9.15.1
* Linkify all the transforms in the documentation. (#514)
* Replace deprecated package `opn` by `open`. (#525)
* Update dependencies. (#513)

Thanks @perguth!

## 9.15.0
* Add favicon. (#502)
  A `favicon.ico` in the root of your project will be used as the icon for your
  app!
* Prevent infinite redirect behind a reverse proxy. (#510)
* Fix documentation typo. (#505)

Thanks @ZhouHansen, @mjstahl and @jekrb!

## 9.14.0
* Add console panel. (#468)
  With `bankai start`, press "2" to switch to the console output.
  Press "1" to switch to the main output.

## 9.13.0
* enable reload when necessary (#493)
* correct router regex (#496)
* Init bankai after mkdirp (#489)
* Switch to nanohtml. (#488)
* ci: Add Node 10.
* swap `open` with `opn` (#484)

## 9.12.1
* 🐛 Unify service-worker env url format (#483)
* use utils.find() (#482)

## 9.12.0
* Update v8-compile-cache to 2.0.0.
* Improve syntax error messages (#480)
* Fixed + more consistent basedir handling (#467)

## 9.11.2
* Fix outputting dynamic bundles, fixes #472 (#474)
* Add gitignore to example. (#476)

## 9.11.1
* deps: add missing dependency `resolve` (#471)
* Update example app.mount() usage (#469)
* Add quotes around theme-color `content`. (#466)

## 9.11.0
* Disable Babel modules transform for dependencies (#455)
* Add option babelifyDeps (#422)

## 9.10.7
* Replace findup by @choojs/findup (#465)
* Move UI code out of http.js (#417)
* Upgrade standard (#464)

## 9.10.6
* support content and public dirs in http (#463)
* support files without extensions in assets (#462)
* Add some words about service workers (#461)

## 9.10.5
* Catch routing errors when attempting to render missing routes (#457)

## 9.10.4
* Fix assets pathing, and add fonts to document tests (#454)

## 9.10.3
* Fix inlining critical css (#448)
* Only minify CSS when `watch: false`. (#442)

## 9.10.2
* Exclude all choo routes with partials (#445)

## 9.10.1
## 9.10.0
* Read custom html templates (#447)
* Expose mime types on graph nodes, fixes #402 (#443)

## 9.9.1
* Inject server rendered app at mount point. (#414)
* Fix assets list assigned an empty buffer (#444)

## 9.9.0
* add configuration usage to cli (#437)
* list tinyify optimizations separately + add browser-pack-flat (#440)

## 9.8.0
* Add envify in `watch` mode (`bankai start`) (#436)
* Add appveyor.yml (#439)
* Lookup browserslist config (#438)
* Async server render (#427)

## 9.7.2
* Revert "Persistent cache (#426)", fixes #432, fixes #434 (#433)

## 9.7.1
* Fix split-require integrity hashes (#428)
* use minimist correctly (#429)

## 9.7.0
* Add base option (#399)
* Persistent cache (#426)

## 9.6.1
* Expose `compiler` on http handler (#425)

## 9.6.0
* document entry level opts (#401)
* Add output dir option to `bankai build`, closes #333 (#416)
* Fix documentation of error event (#419)
* add .github/ dir (#405)
* Update browserify to v16 (#415)
* Fix lint

## 9.5.1
* Fix gzip-size use

## 9.5.0
* Update dependencies (#375)
* Subresource integrity for split bundles (#407)

## 9.4.1
* Revert "Replace purifycss by purgecss (#371)" (#403)
* Prefetch dynamic bundles, fixes #390 (#392)
* hyperstream → hstream (#394)

## 9.4.0
* Restore asset serving behavior (#396)
* Detect if a project is an electron project (#384)
* Replace purifycss by purgecss (#371)

## 9.3.1
* Add X-Accel-Buffering: no to /reload's header (#389)

## 9.3.0
* upgrade sheetify (#385)

## 9.2.1
* Output `<link rel=stylesheet>` after `<style>` (#381)
* ignore package-lock.json (#378)

## 9.2.0
* Tweak generated SSL key to make Chrome happy (#357)
* Support dots in file names and ignore query strings for static files (#373)
* save sourcemaps with `bankai build` (#363)
* Use JS brotli implementation on Node < 8 (#376)
* Collapse hyperstream (#365)
* Support spread operators by default (#372)
* Remove attributes from loadCSS polyfill inline script (#350)
* Use get-port instead of getport (#344)
* Swap iltorb for wasm-brotli (#360)

## 9.1.0
* Enable tinyify in `bankai inspect` (#349)
* Leverage v8 cache (#351)
* Ignore .babelrc files of dependencies. (#352)
* Compare asset creation date on build (#355)

## 9.0.2
* fix scripts build if empty server split (#353)
* trace SSR errors (#354)
* prune deps (#340)

## 9.0.0
* Initial release.
