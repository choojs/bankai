var html = require('choo/html')
module.exports = function (state, emit) {
  emit('DOMTitleChange', 'hello planet')
  return html`
    <body class="sans-serif">
      Hello other
    </body>
  `
}
