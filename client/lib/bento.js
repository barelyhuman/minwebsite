export const debouncedBento = debounce(createBento, 350)
export const debouncedRelocate = debounce(relocate, 350)

const MIN_WIDTH_THRESHOLD = 40

let lastContainerWidth
export async function createBento (gridContainer, maxCols = 3, gap = 16) {
  if (!lastContainerWidth) {
    const box = gridContainer.getBoundingClientRect()
    lastContainerWidth = box.width
  }
  if (window.ResizeObserver) {
    const resizeObserver = new window.ResizeObserver((entries) => {
      for (const entry of entries) {
        if (
          Math.abs(lastContainerWidth - entry.contentRect.width) >
          MIN_WIDTH_THRESHOLD
        ) {
          lastContainerWidth = entry.contentRect.width
          debouncedRelocate(gridContainer, maxCols, gap, true)
        }
      }
    })
    resizeObserver.observe(gridContainer)
  } else {
    window.addEventListener('resize', function () {
      const newBox = gridContainer.getBoundingClientRect()
      if (Math.abs(lastContainerWidth - newBox.width) > MIN_WIDTH_THRESHOLD) {
        lastContainerWidth = newBox.width
        debouncedRelocate(gridContainer, maxCols, gap, true)
      }
    })
  }

  await debouncedRelocate(gridContainer, maxCols, gap)
}

export async function calculateChildSizeStyle (child, width) {
  const hasImg = child.querySelector('img')
  const updatedStyle = {}
  const defaultRatio = 0.525
  if (hasImg) {
    await loadImage(hasImg)
    const imageRatio = hasImg.naturalHeight / hasImg.naturalWidth
    updatedStyle.height = width * imageRatio + 'px'
    updatedStyle.minHeight = width * imageRatio + 'px'
    updatedStyle.width = width + 'px'
  } else {
    updatedStyle.height = width * defaultRatio + 'px'
    updatedStyle.minHeight = width * defaultRatio + 'px'
    updatedStyle.width = width + 'px'
  }
  return updatedStyle
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

  if (maxCols <= 0) {
    maxCols = 1
  }

  const expectedWidth = usableGridWidth / maxCols

  Object.assign(gridContainer.style, {
    position: 'relative',
    display: 'block'
  })

  for (
    let childIndex = 0;
    childIndex < gridContainer.children.length;
    childIndex += 1
  ) {
    const child = gridContainer.children[childIndex]
    child.classList.remove('scale-100')
    child.classList.remove('hover:scale-[115%]')
    child.style.visibility = 'hidden'
    const img = child.querySelector('img')
    if (img && img.src) {
      const alreadyLoaded = loadImage(img)
      if (alreadyLoaded instanceof Promise) {
        await alreadyLoaded
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

    Object.assign(
      style,
      await calculateChildSizeStyle(child, expectedWidth)
    )

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

    child.classList.add('scale-100')
    child.classList.add('hover:scale-[115%]')
    Object.assign(child.style, {
      ...style,
      position: 'absolute',
      visibility: 'visible'
    })

    if (img) {
      Object.assign(img.style, {
        ...style,
        visibility: 'visible'
      })
    }
  }

  let totalHeight = 0
  let rows = 0
  const children = Array.from(gridContainer.children)
  for (let i = 0; i < gridContainer.children.length; i += maxCols) {
    rows += 1

    const rowItems = children.slice(i, rows * maxCols)
    const maxHeight = Math.max(
      ...rowItems.map((x) => x.getBoundingClientRect().height)
    )
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

function throttle (func, delay) {
  let lastExec = 0
  return function (...args) {
    const now = new Date()
    if (now - lastExec >= delay) {
      func(...args)
      lastExec = now
    }
  }
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
      if (this.naturalHeight > 0) {
        resolve(true)
      } else {
        setTimeout(() => {
          resolve(true)
        }, 1000)
      }
    })
  })
}

async function resetGrid (grid) {
  grid.style.position = 'static'
  grid.style.display = 'grid'
  Array.from(grid.children).forEach((child) => {
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
