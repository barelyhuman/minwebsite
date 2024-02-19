export const debouncedBento = debounce(createBento, 350)
export const debouncedRelocate = debounce(relocate, 350)

export async function createBento (gridContainer, maxCols = 3, gap = 16) {
  window.addEventListener('resize', function () {
    debouncedRelocate(gridContainer, maxCols, gap, true)
  })
  await debouncedRelocate(gridContainer, maxCols, gap)
}

async function relocate (gridContainer, maxCols = 3, gap = 16, resize = false) {
  if (resize) {
    await resetGrid(gridContainer)
  }

  const gridBox = gridContainer.getBoundingClientRect()
  const usableGridWidth = gridBox.width - gap * maxCols
  const minWidth = 327
  const cols = Math.floor(usableGridWidth / minWidth)

  // Only reduce, do not increase the value
  if (cols < maxCols) {
    maxCols = cols
  }

  const expectedWidth = usableGridWidth / maxCols

  for (
    let childIndex = 0;
    childIndex < gridContainer.children.length;
    childIndex += 1
  ) {
    const child = gridContainer.children[childIndex]
    child.style.opacity = 0
    const img = child.querySelector('img')
    if (img && img.src) {
      const alreadyLoaded = loadImage(img)
      if (alreadyLoaded instanceof Promise) {
        await alreadyLoaded
      } else {
        child.style.opacity = 1
      }
    }
    const boxPosition = childIndex + 1
    const row = Math.ceil(boxPosition / maxCols)
    const prevTopIndex = boxPosition - maxCols
    const prevTopRow = Math.ceil(prevTopIndex / maxCols)
    const prevLeftIndex = boxPosition - 1
    const prevLeftRow = Math.ceil(prevLeftIndex / maxCols)

    let prevLeft
    let prevTop

    if (prevLeftRow === row) {
      prevLeft = gridContainer.children[prevLeftIndex - 1]
    }

    if (prevTopRow < row) {
      prevTop = gridContainer.children[prevTopIndex - 1]
    }

    const style = {
      top: 0 + gap / 2 + 'px',
      left: 0 + gap / 2 + 'px'
    }

    if (img && img.src) {
      const ratio = img.naturalHeight / img.naturalWidth
      style.height = expectedWidth * ratio + 'px'
      style.minHeight = expectedWidth * ratio + 'px'
      style.width = expectedWidth + 'px'
    } else {
      style.height = expectedWidth * 0.525 + 'px'
      style.minHeight = expectedWidth * 0.525 + 'px'
      style.width = expectedWidth + 'px'
    }

    if (prevTop) {
      const topBox = prevTop.getBoundingClientRect()
      const topPosition =
          +prevTop.style.top.replace('px', '') + topBox.height + gap + 'px'
      style.top = topPosition
    }

    if (prevLeft) {
      const leftBox = prevLeft.getBoundingClientRect()
      const leftPosition =
          +prevLeft.style.left.replace('px', '') + leftBox.width + gap + 'px'
      style.left = leftPosition
    }

    Object.assign(child.style, {
      ...style,
      position: 'absolute',
      visibility: 'visible',
      opacity: 1
    })
  }

  let totalHeight = 0
  let rows = 0
  const children = Array.from(gridContainer.children)
  for (let i = 0; i < gridContainer.children.length; i += maxCols) {
    rows += 1

    const rowItems = children.slice(i, rows * maxCols)
    const maxHeight = Math.max(...rowItems.map(x => x.getBoundingClientRect().height))
    totalHeight += maxHeight
  }

  totalHeight += rows * gap

  Object.assign(gridContainer.style, {
    position: 'relative',
    display: 'block',
    height: totalHeight + 'px',
    minHeight: totalHeight + 'px'
  })

  gridContainer.classList.remove('grid')
  gridContainer.classList.remove('sm:grid-cols-1')
  gridContainer.classList.remove('md:grid-cols-3')
  gridContainer.classList.remove('lg:grid-cols-4')
  gridContainer.classList.remove('gap-2')
}

function debounce (fn, delay) {
  let id
  return (...args) => {
    if (id) {
      clearTimeout(id)
    }
    id = setTimeout(() => {
      fn(...args)
    }, delay)
  }
}

async function loadImage (img) {
  if (img.naturalHeight > 0) return true
  return new Promise((resolve) => {
    img.addEventListener('load', function () {
      resolve(true)
    })
  })
}

async function resetGrid (grid) {
  grid.style.position = 'static'
  grid.style.display = 'grid'
  Array.from(grid.children).forEach(child => {
    Object.assign(child.style, {
      position: 'static',
      height: 'auto',
      minHeight: 'auto',
      width: 'auto'
    })
  })
  // Wait for browser to paint
  await new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        resolve()
      })
    })
  })
}
