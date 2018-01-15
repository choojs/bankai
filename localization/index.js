var enUs = require('./en-US')

module.exports = l10n

function l10n (language) {
  try {
    var lang = require('./' + language)
  } catch (e) {
    return enUs
  }
  return Object.assign({}, enUs, lang)
}
