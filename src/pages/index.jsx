import { useEffect, useState } from 'preact/hooks'
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow'
import { get } from '@dumbjs/pick/get'

import { signal } from '@preact/signals'
import { computed } from '@preact/signals'
import { Component } from 'preact'

/**
 * @type {ReturnType<typeof microsearch>}
 */
let searcher

const sites$ = signal([])

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
const columns = { value: 3 }

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
    const widthByContainer = containerWidth.value / columns.value - offset.value
    const heightByContainer = widthByContainer * ratio

    const prevByCol = withPositions[indAsNum - columns.value]
    let top = 0
    let left = prevLeft + prevWidth + (indAsNum === 0 ? 0 : offset.value / 2)

    console.log({ indAsNum, prevByCol })
    if (prevByCol) {
      top = prevByCol.top + prevByCol.height + offset.value / 2
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
                class="inline-flex absolute justify-center items-center text-zinc-500"
                style={{
                  ...pos,
                }}
              >
                <Image
                  src={d.imageURL}
                  className="h-full rounded-md"
                  classNameOnLoad="border border-black"
                />
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

class Image extends Component {
  state = {
    loaded: false,
  }

  inview(entries, observer) {
    entries.forEach(entry => {
      if (!entry.intersectionRatio) return

      entry.target.addEventListener('load', this.loading.bind(this))
      entry.target.src = this.props.src
      observer.unobserve(entry.target)
    })
  }

  loading(event) {
    if (event.target.complete)
      this.setState({
        loaded: true,
      })
  }

  componentDidMount() {
    this.setState({
      loaded: false,
    })

    const observer = new IntersectionObserver(this.inview.bind(this))

    observer.observe(this.element)
  }

  render() {
    const { loaded } = this.state
    const classList = (this.props.class ?? this.props.className)
      .split(' ')
      .filter(Boolean)
      .concat(loaded ? this.props.classNameOnLoad.split(' ') : [])
      .join(' ')
    return (
      <img className={classList} ref={element => (this.element = element)} />
    )
  }
}
