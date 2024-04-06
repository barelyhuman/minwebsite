import { signal } from '@preact/signals'
import fetch from '@webreflection/fetch'
import { set } from '@dumbjs/pick/set'
import { get } from '@dumbjs/pick/get'

export class Link {
  #item
  constructor (item) {
    this.#item = item
  }

  get (attr) {
    return get(this.#item, attr, undefined)
  }

  set (attr, value) {
    return set(this.#item, attr, value)
  }
}

class LinkRepo {
  #data = signal([])
  #totalCount = signal(0)
  #categories = signal([])

  get data () {
    return this.#data.value
  }

  get totalCount () {
    return this.#totalCount.value
  }

  get categories () {
    return this.#categories.value
  }

  onChange (cb) {
    this.#data.subscribe(() => cb())
    this.#totalCount.subscribe(() => cb())
    this.#categories.value(() => cb())
  }

  async #fetch () {
    try {
      const response = await fetch('/api/links').json()
      this.#categories.value = response.categories
      this.#data.value = response.data
        .map((d) => {
          const link = new Link(d)
          if (link.get('imageURL').startsWith('https://og.barelyhuman.xyz')) {
            const url = new URL(link.get('imageURL'))
            url.searchParams.set('backgroundColor', '#121212')
            link.set('imageURL', url.toString())
            link.set('backgroundColor', 'rgb(25,25,25)')
          }
          return link
        })
        .sort((x, y) =>
          String(x.get('title').toLowerCase()).localeCompare(
            y.get('title').toLowerCase()
          )
        )
      this.#totalCount.value = response.total
    } catch (err) {
      console.error(err)
    }
  }

  async sync () {
    this.#fetch()
  }
}

export const links = new LinkRepo()
