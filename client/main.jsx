import './main.css'

import { hydrate } from 'preact'
import { Route, Router, Switch } from 'wouter-preact'
import HomePage from './pages/home.page.jsx'
import AboutPage from './pages/about.page.jsx'
import renderToString from 'preact-render-to-string'

const App = (props) => (
  <>
    <Router ssrPath={props.url}>
      <Switch>
        <Route path='/about' component={AboutPage} />
        <Route path='/' component={HomePage} />
        <Route default>404: No such page!</Route>
      </Switch>
    </Router>
  </>
)

if (typeof window !== 'undefined') {
  hydrate(<App />, document.getElementById('root'))
}

export async function prerender (data) {
  const maxDepth = 10
  let tries = 0

  const render = () => {
    if (++tries > maxDepth) return
    try {
      return renderToString(<App {...data} />)
    } catch (e) {
      if (e && e.then) return e.then(render)
      throw e
    }
  }

  try {
    const result = await render()
    return result
  } catch {}
}
