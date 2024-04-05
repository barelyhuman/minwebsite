import { effect, signal } from '@preact/signals'
import fetch from '@webreflection/fetch'
import { Link, useLocation, useSearch } from 'wouter-preact'
import { Layout } from '../components/layout'
import { createBento } from '../lib/bento'

const data = signal([])
const total = signal(0)
const categories = signal([])

if (typeof window !== 'undefined') {
  fetchLinks()
}

async function fetchLinks () {
  const sp = new URLSearchParams(window.location.search)
  try {
    const response = await fetch('/api/links?' + sp.toString()).json()
    categories.value = response.categories
    data.value = response.data
      .map((d) => {
        if (d.imageURL.startsWith('https://og.barelyhuman.xyz')) {
          const url = new URL(d.imageURL)
          url.searchParams.set('backgroundColor', '181819')
          d.imageURL = url.toString()
          d.backgroundColor = 'rgb(25,25,25)'
        }
        return d
      })
      .sort((x, y) =>
        String(x.title.toLowerCase()).localeCompare(y.title.toLowerCase())
      )
    total.value = response.total
  } catch (err) {
    console.error(err)
  }
}

effect(() => {
  if (data.value.length > 0) {
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
        <div class='overflow-hidden p-5'>
          <nav class='text-zinc-400'>
            <h1 class='mb-5 text-xl text-zinc-600'>MW</h1>
            <form>
              <div class='mb-10'>
                <input
                  type='text'
                  class='px-4 py-2 m-0 focus:outline-none ring-0 text-xs border bg-transparent rounded-[6px] border-zinc-700'
                  placeholder='search'
                  value={query}
                  onKeyUp={(e) => {
                    if (e.code === 'Enter') {
                      sp.set('q', e.target.value)
                      setLocation(location + `?${sp}`)
                    }
                  }}
                  name='q'
                />
              </div>
              <ul class='text-sm flex flex-col gap-[8px]'>
                <Link
                  href='/about'
                  class='max-w-[200px] text-zinc-400 hover:text-zinc-100'
                >
                  <li>About</li>
                </Link>
                <a
                  href='https://github.com/barelyhuman/minweb-public-data#add-another-site'
                  class='max-w-[200px] text-zinc-400 hover:text-zinc-100'
                >
                  <li>Submit a site?</li>
                </a>
                <hr class='h-[1px] w-full my-5 bg-zinc-500 border-0' />
                <li class='pt-2'>
                  Showing:{' '}
                  <span class='text-zinc-400'>{data.value.length}</span>
                  <span class='text-zinc-600'>/{total}</span>
                </li>
                <li>
                  <div class='flex flex-col gap-2'>
                    <p>Categories</p>
                    <div class='flex flex-wrap gap-y-2 gap-x-10 ml-3'>
                      {categories.value.map((x) => (
                        <label class='flex gap-2 items-center my-3' key={x}>
                          <input
                            type='checkbox'
                            class='w-3 h-3 rounded-sm bg-base checked:bg-lime-400 hover:checked:bg-lime-400 focus:bg-lime-400'
                            onChange={async (e) => {
                              const fd = new FormData(e.target.closest('form'))
                              const categories = fd.getAll('category')
                              sp.delete('category')
                              categories.forEach((c) => {
                                sp.append('category', c)
                              })
                              setLocation(location + `?${sp}`)
                              await fetchLinks()
                            }}
                            checked={selectedCategories.includes(x)}
                            value={x}
                            name='category'
                          />
                          <div>
                            <span>{x}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </li>
              </ul>
            </form>
          </nav>
        </div>
        <div class='bento min-h-[90vh] grid w-full sm:grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2'>
          {data.value.map((tile) => {
            return (
              <a
                key={tile.link}
                href={tile.link}
                class='group transition-all duration-200 min-h-[150px] rounded-lg overflow-hidden hover:z-10 scale-100 hover:scale-[115%]'
              >
                <div class='relative w-full h-full'>
                  <img
                    class='w-full h-full rounded-lg border border-zinc-800'
                    style={`background:${tile.backgroundColor}`}
                    data-src={tile.imageURL}
                    ref={(node) => {
                      if (!node) return
                      lazyLoadImage(node)
                    }}
                  />
                  <div class='group-hover:hidden absolute bottom-2 left-2 px-3 py-1 text-xs rounded-sm bg-black supports-[backdrop-filter]:bg-black/75 supports-[backdrop-filter]:backdrop-blur-md text-white'>
                    <p>{tile.title}</p>
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}

const microQueue = Promise.prototype.then.bind(Promise.resolve())

function lazyLoadImage (node) {
  const container = document.querySelector('.bento')
  if (node.__minWebLoaded) return
  node.addEventListener('load', function () {
    createBento(container, 4, 8)
  })
  microQueue(async () => {
    const img = new window.Image()
    if (img.naturalHeight > 0) {
      createBento(container, 4, 8)
      return
    }
    const promise = new Promise((resolve) => {
      img.addEventListener('load', function () {
        node.src = this.src
        node.style.backgroundColor = 'initial'
      })
      img.src = node.dataset.src
      resolve()
    })
    await promise
    node.__minWebLoaded = true
    createBento(container, 4, 8)
  })
}
