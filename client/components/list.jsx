import { createBento } from '../lib/bento'

const WebsiteList = ({ websites }) => {
  return (
    <div class='bento min-h-[90vh] grid w-full sm:grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2'>
      {websites.map((tile) => {
        return (
          <a
            key={tile.get('link')}
            href={tile.get('link')}
            class='group transition-all duration-200 min-h-[150px] rounded-lg overflow-hidden hover:z-10 scale-100 hover:scale-[115%]'
          >
            <div class='relative w-full h-full'>
              <img
                class='w-full h-full rounded-lg border bg-surface border-zinc-800'
                style={`background:${tile.get('backgroundColor')}`}
                data-src={tile.get('imageURL')}
                ref={(node) => {
                  if (!node) return
                  lazyLoadImage(node)
                }}
              />
              <div class='group-hover:hidden absolute bottom-2 left-2 px-3 py-1 text-xs rounded-sm bg-black supports-[backdrop-filter]:bg-black/75 supports-[backdrop-filter]:backdrop-blur-md text-white'>
                <p>{tile.get('title')}</p>
              </div>
            </div>
          </a>
        )
      })}
    </div>
  )
}

export default WebsiteList

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
