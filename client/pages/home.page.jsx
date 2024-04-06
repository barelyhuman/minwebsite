import { effect } from '@preact/signals'
import { useLocation, useSearch } from 'wouter-preact'
import { Layout } from '../components/layout'
import WebsiteBento from '../components/list'
import { createBento } from '../lib/bento'
import { links } from '../lib/models/Link'

if (typeof window !== 'undefined') {
  links.sync()
}

effect(() => {
  if (links.data.length > 0) {
    const bentoContainer = document.querySelector('.bento')
    createBento(bentoContainer, 4, 8)
  }
})

export default function HomePage () {
  const rawParams = useSearch()
  const sp = new URLSearchParams(rawParams)
  const [location, setLocation] = useLocation()

  const query = sp.get('q')
  const selectedCategories = sp.getAll('category')

  return (
    <Layout>
      <div class='flex flex-col w-full'>
        <div>
          <WebsiteBento websites={links.data} />
        </div>
      </div>
    </Layout>
  )
}
