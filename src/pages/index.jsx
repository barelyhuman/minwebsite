import { get } from '@dumbjs/pick/get'
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow'
import { useMeta, useTitle } from 'adex/head'

import { computed, signal } from '@preact/signals'
import { Image } from '../components/Image'

/**
 * @type {ReturnType<typeof microsearch>}
 */
let searcher

const sites$ = signal([])
const searchTerm$ = signal('')

const MIN_CARD_WIDTH = 280

async function getData() {
  const response = await fetch('/api/data').then(d => d.json())
  const sortedResponse = response.sort((x, y) => x.title.localeCompare(y.title))
  searcher = microsearch(sortedResponse, ['title', 'link'])
  return sortedResponse
}

if (typeof window != 'undefined') {
  ;(async () => {
    const data = await getData()
    sites$.value = data
  })()
}

const recents = computed(() =>
  sites$.value
    .toSorted(
      (x, y) => new Date(y.addedOn).getTime() - new Date(x.addedOn).getTime()
    )
    .slice(0, 4)
)

const filtered$ = computed(() => {
  if (searchTerm$.value.length > 0) {
    const searched = searcher(searchTerm$.value)
    return searched
  }
  return sites$.value
})

const containerWidth = signal(900)
const offset = { value: 8 }
const columns = signal(3)

const bentoPositions = computed(() => {
  const sites = filtered$.value
  const containerW = containerWidth.value
  const cols = columns.value
  const offsetVal = offset.value
  const count = sites.length
  const cardWidth = containerW / cols
  const withPositions = new Array(count)

  for (let i = 0; i < count; i++) {
    const d = sites[i]
    const originalHeight = d.dimensions.height ?? 543
    const originalWidth = d.dimensions.width ?? 1039
    const ratio = originalHeight / originalWidth
    const heightByContainer = cardWidth * ratio

    let left = 0
    let top = 0

    // Calculate horizontal position:
    if (i % cols !== 0) {
      const prev = withPositions[i - 1]
      left = prev.left + prev.width + offsetVal / 2
    } else {
      left = 0
    }

    // Calculate vertical position if not in the first row:
    if (i >= cols) {
      const prevByCol = withPositions[i - cols]
      top = prevByCol.top + prevByCol.height + offsetVal
    }

    withPositions[i] = {
      top,
      left,
      height: heightByContainer,
      width: cardWidth,
    }
  }
  return withPositions
})

function useDefaultHead() {
  useTitle('minweb.site | Minimal Websites Gallery')
  useMeta({
    name: 'viewport',
    content: 'width=device-width, initial-scale=1.0',
  })
}

export default () => {
  useDefaultHead()

  return (
    <div class="p-2 mx-auto sm:p-5 md:p-10 max-w-screen" ref={onGridMount()}>
      <div class="flex justify-end w-full">
        <ul class="flex gap-2 items-center mx-2 font-sans text-xs">
          <li>
            <a
              class="text-zinc-600 hover:underline hover:underline-offset-4 hover:text-black"
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
          {recents.value.map(d => {
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
      <div>
        <div class="w-full max-w-xs ml-auto">
          <input
            type="text"
            placeholder="Search"
            class="flex w-full h-10 px-3 py-2 text-sm bg-white border rounded-md border-neutral-300 ring-offset-background placeholder:text-neutral-500 focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-400 disabled:cursor-not-allowed disabled:opacity-50"
            value={searchTerm$.value}
            onInput={e => {
              searchTerm$.value = e.target.value
            }}
          />
        </div>
      </div>
      <div class="my-24">
        <h2 class="font-semibold">Gallery</h2>
        <div class="relative gap-2 mt-4 w-full">
          {filtered$.value.map((d, ind) => {
            const pos = Object.fromEntries(
              Object.entries(bentoPositions.value[ind]).map(d => [
                d[0],
                d[1] + 'px',
              ])
            )
            return (
              <div
                class="inline-flex absolute justify-center items-center hover:cursor-pointer text-zinc-500"
                key={d.link}
                style={{
                  ...pos,
                }}
              >
                <a href={d.link} class="transition-all transition hover:px-1">
                  <Image
                    src={d.imageURL}
                    className="rounded-md"
                    classNameOnLoad="border-2 border-black"
                  />
                </a>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const listenToContainerBoundaries = node => {
  const computedStyle = getComputedStyle(node)
  const widthWithoutPadding =
    node.getBoundingClientRect().width -
    (parseFloat(computedStyle.paddingLeft) +
      parseFloat(computedStyle.paddingRight))

  const negationWidthForOffset = offset.value
  let colsWithOffset = Math.floor(
    (widthWithoutPadding - negationWidthForOffset) / MIN_CARD_WIDTH
  )

  if (colsWithOffset <= 1) {
    colsWithOffset = 1
  }

  containerWidth.value = widthWithoutPadding - negationWidthForOffset
  columns.value = colsWithOffset
}

function onGridMount() {
  const debouncedListenToContainerBoundaries = debounce(
    listenToContainerBoundaries,
    350
  )
  return node => {
    if (!node) return
    window.addEventListener('resize', () => {
      debouncedListenToContainerBoundaries(node)
    })
    debouncedListenToContainerBoundaries(node)
  }
}

function microsearch(collection, paths) {
  const searchIndex = collection.map(d => paths.map(p => get(d, p)))
  return term => {
    return searchIndex
      .map((d, index) => {
        return [d, index]
      })
      .filter(val => {
        return val[0].some(t => t.toLowerCase().includes(term.toLowerCase()))
      })
      .map(matches => {
        return collection[matches[1]]
      })
  }
}

function debounce(fn, delay) {
  let handler
  return (...args) => {
    if (handler) clearTimeout(handler)
    handler = setTimeout(() => {
      fn(...args)
    }, delay)
  }
}
