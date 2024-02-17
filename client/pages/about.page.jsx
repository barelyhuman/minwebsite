import { Layout } from '../components/layout.jsx'

export default function AboutPage () {
  return (
    <Layout>
      <div class='m-10 flex flex-col'>
        <h1 class='font-semibold'>About</h1>
        <p>
          <a href='https://minweb.site' class='text-zinc-600 hover:text-zinc-100'>
            minweb.site{' '}
          </a>{' '}
          is a simple curation platform for minimally aesthetic websites.
          Currently curated by{' '}
          <a href='https://reaper.is' class='text-zinc-600 hover:text-zinc-100'>
            reaper
          </a>{' '}
          and{' '}
          <a
            class='text-zinc-600 hover:text-zinc-100 mx-1'
            href='https://www.wiesson.dev'
          >
            Arne Wiese
          </a>
        </p>
      </div>
    </Layout>
  )
}
