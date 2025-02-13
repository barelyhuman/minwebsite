import { get } from '@dumbjs/pick/get'
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow'

import { computed, signal } from '@preact/signals'
import { Image } from '../components/Image'

/**
 * @type {ReturnType<typeof microsearch>}
 */
let searcher

const sites$ = signal([])

const MIN_CARD_WIDTH = 280

async function getData() {
  const response = await fetch('/api/data').then(d => d.json())
  searcher = microsearch(response, ['title', 'link'])
  return response
}

if (typeof window != 'undefined') {
  const data = await getData()
  sites$.value = data.toSorted((x, y) => x.title.localeCompare(y.title))
}

const recents = computed(() =>
  sites$.value
    .toSorted(
      (x, y) => new Date(y.addedOn).getTime() - new Date(x.addedOn).getTime()
    )
    .slice(0, 4)
)

const containerWidth = signal(900)
const offset = { value: 8 }
const columns = signal(3)

const bentoPositions = computed(() => {
  const withPositions = []
  for (let index in sites$.value) {
    const indAsNum = Number(index)
    const d = sites$.value[indAsNum]
    const prevLeft = withPositions[indAsNum - 1]
      ? withPositions[indAsNum - 1].left
      : 0
    const prevWidth = withPositions[indAsNum - 1]
      ? withPositions[indAsNum - 1].width
      : 0

    const originalHeight = d.dimensions.height ?? 543
    const originalWidth = d.dimensions.width ?? 1039

    const ratio = originalHeight / originalWidth
    const widthByContainer = containerWidth.value / columns.value
    const heightByContainer = widthByContainer * ratio

    const prevByCol = withPositions[indAsNum - columns.value]
    let top = 0
    let left = prevLeft + prevWidth + (indAsNum === 0 ? 0 : offset.value / 2)

    if (prevByCol) {
      top = prevByCol.top + prevByCol.height + offset.value
    }

    const prevRow = Math.floor((indAsNum - 1) / columns.value)
    const currentRow = Math.floor(indAsNum / columns.value)

    let columnCountBroken = currentRow > prevRow ? true : false
    if (columnCountBroken) {
      left = 0
    }

    withPositions.push({
      top,
      left,
      height: heightByContainer,
      width: widthByContainer,
    })
  }
  return withPositions
})

export default () => {
  return (
    <div
      class="p-10 mx-auto max-w-screen"
      ref={node => {
        if (!node) return
        const resizer = debounce(() => {
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
        }, 350)

        window.addEventListener('resize', () => {
          resizer()
        })

        resizer()
      }}
    >
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
      <div class="my-24">
        <h2 class="font-semibold">Gallery</h2>
        <div class="relative gap-2 mt-4 w-full">
          {sites$.value.map((d, ind) => {
            const pos = Object.fromEntries(
              Object.entries(bentoPositions.value[ind]).map(d => [
                d[0],
                d[1] + 'px',
              ])
            )
            return (
              <div
                class="inline-flex absolute justify-center items-center hover:cursor-pointer text-zinc-500"
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

function debounce(fn, delay) {
  let handler
  return (...args) => {
    if (handler) clearTimeout(handler)
    handler = setTimeout(() => {
      fn(...args)
    }, delay)
  }
}
