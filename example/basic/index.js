const choo = require('choo');
const html = require('choo/html');
const sheetify = require('sheetify');

sheetify('normalize.css');
const sheet = sheetify('./index.css');

function createApplication () {
  const application = choo()

  application.model({
    state: { title: 'Not quite set yet!' },
    reducers: {
      update: (data, state) => ({ title: data })
    }
  })

  const mainView = (state, prev, send) => html`
    <main class="${sheet}">
      <h1>Title: ${state.title}</h1>
      <input
        type="text"
        oninput=${(e) => send('update', e.target.value)}/>
      <button>Hello!</button>
    </main>
  `

  const testView = (state, prev, send) => html`
    <main class="${sheet}" id="lapse-root">
      <h1>Test: ${state.title}</h1>
      <input
        type="text"
        oninput=${(e) => send('update', e.target.value)}/>
      <button>Hello!</button>
    </main>
  `

  application.router((route) => [
    route('/', mainView),
    route('/test', testView)
  ])

  return application
}

module.exports = createApplication;
