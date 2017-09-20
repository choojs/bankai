var enUs = require('./en-US')
var xtend = require('xtend')

module.exports = l10n

function l10n (language) {
  try {
    var lang = require('./' + language)
  } catch (e) {
    return enUs
  }
  return xtend(enUs, lang)
}
