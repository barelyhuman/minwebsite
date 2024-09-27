import { useEffect, useState } from 'preact/hooks'
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow'
import { get } from '@dumbjs/pick/get'

/**
 * @type {ReturnType<typeof microsearch>}
 */
let searcher

async function getData() {
  const response = await fetch('/api/data').then(d => d.json())

  searcher = microsearch(response, ['title', 'link'])

  return response
}

export default () => {
  const [sites, setSites] = useState([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    getData().then(d => setSites(d))
  }, [])

  const recents = sites
    .toSorted(
      (x, y) => new Date(y.addedOn).getTime() - new Date(x.addedOn).getTime()
    )
    .slice(0, 4)

  const totalCount = sites.length

  const filteredSites = (searchTerm ? searcher(searchTerm) : sites).toSorted(
    (x, y) => x.title.localeCompare(y.title)
  )

  return (
    <div class="p-10 mx-auto max-w-4xl">
      <div class="flex justify-end w-full">
        <ul class="flex gap-2 items-center mx-2 font-sans text-xs">
          <li>
            <a
              class="text-zinc-600 hover:underline hover:underline-offset-4 hover:text-white"
              href="https://github.com/barelyhuman/minweb-public-data?tab=readme-ov-file#add-another-site"
            >
              Add your site?
            </a>
          </li>
        </ul>

        <h1 class="font-sans text-sm text-zinc-400">minweb.site</h1>
      </div>
      <div class="my-24">
        <h2 class="font-semibold">Recent</h2>
        <ul class="flex flex-col gap-4 mt-8 w-full">
          {recents.map(d => {
            return (
              <li class="w-full text-zinc-500">
                <a
                  href={d.link}
                  class="relative w-full transition duration-300 link"
                >
                  {d.title}
                  <span class="font-sans italic absolute top-0 text-[8px] text-emerald-400 -right-99 min-w-44">
                    {formatDistanceToNow(new Date(d.addedOn), {
                      addSuffix: true,
                    })}
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
      </div>

      <div class="my-24">
        <div class="flex flex-wrap gap-2 justify-between">
          <h2 class="font-semibold">
            All <span class="text-zinc-500">( {totalCount} )</span>
          </h2>
          <div class="flex min-w-56">
            <input
              name="search"
              class="transition-colors duration-300 input focus:ring-0 focus:border-emerald-400"
              placeholder="search"
              ref={node => {
                if (!node) return
                node.addEventListener('keyup', e => {
                  setSearchTerm(e.target.value)
                })
              }}
            />
          </div>
        </div>
        <ul class="flex flex-col gap-4 mt-8">
          {filteredSites.map(d => {
            return (
              <li class="w-full text-zinc-500">
                <a
                  href={d.link}
                  class="relative w-full transition duration-300 link"
                >
                  {d.title}
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function microsearch(collection, paths) {
  const index = collection.map(d => paths.map(p => get(d, p)))
  return term => {
    return index
      .map((d, index) => {
        return [d, index]
      })
      .filter(val =>
        val[0].find(t => t.toLowerCase().includes(term.toLowerCase()))
      )
      .map(matches => collection[matches[1]])
  }
}
