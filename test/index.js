var path = require('path')
var mkdirp = require('mkdirp')
mkdirp.sync(path.join(__dirname, '../tmp'))

require('./assets')
require('./document')
require('./http')
require('./manifest')
require('./script')
require('./style')

// CLI tests
require('./build')
