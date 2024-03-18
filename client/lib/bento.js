const debouncedCreateBento = debounce(resizeableBento, 350)

const MIN_WIDTH_THRESHOLD = 40
let lastContainerWidth

async function resizeableBento (gridContainer, maxCols = 3, gap = 16) {
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
          createBento(gridContainer, maxCols, gap, true)
        }
      }
    })
    resizeObserver.observe(gridContainer)
  } else {
    window.addEventListener('resize', function () {
      const newBox = gridContainer.getBoundingClientRect()
      if (Math.abs(lastContainerWidth - newBox.width) > MIN_WIDTH_THRESHOLD) {
        lastContainerWidth = newBox.width
        createBento(gridContainer, maxCols, gap, true)
      }
    })
  }

  await createBento(gridContainer, maxCols, gap)
}

function debounce (fn, delay) {
  let id
  return (...args) => {
    if (id) clearTimeout(id)
    id = setTimeout(() => {
      fn(...args)
    }, delay)
  }
}

async function getBentoPositions (
  container,
  maxCols = 4,
  gap = 16,
  expectedWidth
) {
  const elmsPointPromises = Array.from(container.childNodes).map(async (d) => {
    const img = d.querySelector('img')
    const imgDims = {}
    await loadImage(img)
    imgDims.height = img.naturalHeight
    imgDims.width = img.naturalWidth
    return {
      target: d,
      image: d.querySelector('img'),
      imageDims: imgDims,
      ratio: imgDims.height / imgDims.width
    }
  })

  const positionals = (await Promise.all(elmsPointPromises)).reduce(
    (acc, item, index) => {
      const row = Math.floor(index / maxCols)
      if (!acc[row]) {
        acc[row] = []
      }
      acc[row].push(item)
      return acc
    },
    []
  )

  for (const rowIndex in positionals) {
    for (const colIndex in positionals[rowIndex]) {
      const item = positionals[rowIndex][colIndex]
      const topItem = positionals[rowIndex - 1]
        ? positionals[rowIndex - 1][colIndex]
        : null
      const leftItem = positionals[rowIndex][colIndex - 1] ?? null
      item.styles = {
        height: expectedWidth * item.ratio,
        width: expectedWidth,
        top: 0,
        left: 0
      }
      if (topItem) {
        item.styles.top = topItem.styles.top + topItem.styles.height + gap
      }
      if (leftItem) {
        item.styles.left = leftItem.styles.left + leftItem.styles.width + gap
      }
    }
  }

  return positionals.flat(2)
}

async function createBento (container, maxCols = 4, gap = 16) {
  if (!container) return
  const gridBox = container.getBoundingClientRect()
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

  const expectedWidth = Math.floor(usableGridWidth / maxCols)

  const positions = await getBentoPositions(
    container,
    maxCols,
    gap,
    expectedWidth
  )

  container.style.position = 'relative'
  positions.forEach((p) => {
    Object.assign(p.target.style, {
      position: 'absolute',
      top: (p.styles.top || 0) + 'px',
      left: (p.styles.left || 0) + 'px',
      height: p.styles.height + 'px',
      width: p.styles.width + 'px'
    })
  })

  container.style.overflow = 'scroll'
  container.style.height = container.scrollHeight + gap + 'px'
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

export { debouncedCreateBento as createBento }
