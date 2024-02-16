import './main.css'

import { render } from 'preact'
import { Route, Switch } from 'wouter-preact'
import HomePage from './pages/home.page.jsx'
import AboutPage from './pages/about.page.jsx'

const App = () => (
  <>
    <Switch>
      <Route path='/about' component={AboutPage} />
      <Route path='/' component={HomePage} />
      <Route>404: No such page!</Route>
    </Switch>
  </>
)

render(<App />, document.getElementById('root'))
