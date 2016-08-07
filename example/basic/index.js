const choo = require('choo')
const html = require('choo/html')
const sheetify = require('sheetify')
const xtend = require('xtend')

sheetify('normalize.css')
const sheet = sheetify('./index.css')

function createApplication (state, use) {
  const initial = state || {}
  const middleware = use || {}
  const application = choo()

  application.use(middleware)

  application.model({
    state: xtend({}, {title: 'Not quite set yet!'}, initial),
    reducers: {
      update: (data, state) => ({ title: data })
    }
  })

  const mainView = (state, prev, send) => html`
    <main class="${sheet}">
      <h1>Title: ${state.title}</h1>
      <input
        type="text"
        value=${state.title}
        oninput=${(e) => send('update', e.target.value)}/>
      <button>Hello!</button>
    </main>
  `

  const testView = (state, prev, send) => html`
    <main class="${sheet}">
      <h1>Test: ${state.title}</h1>
      <input
        type="text"
        value="${state.title}"
        oninput=${(e) => send('update', e.target.value)}/>
    </main>
  `

  application.router((route) => [
    route('/', mainView),
    route('/test', testView)
  ])

  return application
}

module.exports = createApplication
