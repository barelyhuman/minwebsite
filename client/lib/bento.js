const modified = new Set()

export function createBento (gridContainer, maxCols = 3, gap = 16) {
  relocate(gridContainer, maxCols, gap)

  window.addEventListener('resize', () => {
    resetBento(gridContainer)
    debouncedRelocate(gridContainer, maxCols, gap)
  })

  for (const child of gridContainer.children) {
    const img = child.querySelector('img')
    if (!img) continue

    img.addEventListener('load', (evt) => {
      debouncedRelocate(gridContainer, maxCols, gap)
    })

    if (img.naturalHeight > 0) {
      continue
    }
  }
}

const debounce = (fn, delay) => {
  let id
  return (...args) => {
    if (id) clearTimeout(id)
    id = setTimeout(() => {
      fn(...args)
    }, delay)
  }
}

const debouncedRelocate = debounce(relocate, 550)

export async function relocate (gridContainer, maxCols = 3, gap = 16) {
  const windowWidth = window.innerWidth
  if (windowWidth <= 640) {
    maxCols = 1
  } else if (windowWidth < 1050) {
    maxCols -= 2
  }

  if (maxCols === 0) {
    maxCols = 1
  }

  const gridBox = gridContainer.getBoundingClientRect()
  const elemWidth = Math.ceil(gridBox.width / maxCols) - gap

  const rows = Array.from(gridContainer.children).reduce((arr, item, idx) => {
    return idx % maxCols === 0
      ? [...arr, [item]]
      : [...arr.slice(0, -1), [...arr.slice(-1)[0], item]]
  }, [])

  const expectedPositions = []

  for (const rowIndex in rows) {
    expectedPositions[rowIndex] = []
    const cols = rows[rowIndex]
    for (const colIndex in cols) {
      if (!expectedPositions[rowIndex][colIndex]) {
        expectedPositions[rowIndex][colIndex] = {}
      }
      const col = cols[colIndex]
      const img = col.querySelector('img')

      let dimensions = getElementDimensions(col)
      let expectedWidth = dimensions.width
      let expectedHeight = dimensions.height

      if (img && img.loaded) {
        dimensions = getImageNaturalDimensions(img)
        expectedWidth = elemWidth
        expectedHeight = elemWidth * dimensions.ratio
      }

      let prevLeft = expectedPositions[rowIndex][colIndex - 1]
      let prevTop
      if (rowIndex > 0) {
        prevTop = expectedPositions[rowIndex - 1][colIndex]
      } else {
        prevTop = {
          top: -expectedHeight,
          height: expectedHeight
        }
      }

      if (!prevLeft) {
        prevLeft = {
          left: -(expectedWidth + gap / 2),
          width: expectedWidth
        }
      }

      expectedPositions[rowIndex][colIndex] = {
        elem: col,
        left: prevLeft.left + gap + prevLeft.width,
        top: prevTop.top + gap + prevTop.height,
        height: expectedHeight,
        width: expectedWidth
      }
    }
  }

  let lastElem
  expectedPositions.forEach((rows) => {
    rows.forEach((vDom) => {
      modified.add(vDom)
      Object.assign(vDom.elem.style, {
        position: 'absolute',
        top: vDom.top + 'px',
        left: vDom.left + 'px',
        width: vDom.width + 'px',
        height: vDom.height + 'px',
        minHeight: vDom.height + 'px'
      })

      if (!lastElem && vDom.top > 0) {
        lastElem = vDom
      }

      if (!vDom.top) return

      if (vDom.top + vDom.height > lastElem.top + lastElem.height) {
        lastElem = vDom
      }
    })
  })

  if (lastElem) {
    Object.assign(gridContainer.style, {
      height: lastElem.top + lastElem.height + 'px'
    })
  }

  gridContainer.style.display = 'block'
  gridContainer.style.position = 'relative'
  gridContainer.style.opacity = 1
}

export function resetBento (container) {
  container.style.display = 'grid'
  container.style.position = 'static'
  container.style.opacity = 1
  for (const item of modified) {
    if (!(item.elm && item.elm.style)) continue
    delete item.elm.style.position
    delete item.elm.style.top
    delete item.elm.style.left
    delete item.elm.style.width
    delete item.elm.style.height
    delete item.elm.style.minHeight
  }
}

/**
 * @param {HTMLImageElement} img
 * @returns
 */
function getImageNaturalDimensions (img) {
  const height = img.naturalHeight || 0
  const width = img.naturalWidth || 0
  const ratio = height / width
  return {
    height,
    width,
    ratio: isNaN(ratio) ? 0 : ratio
  }
}

function getElementDimensions (elm) {
  const box = elm.getBoundingClientRect()
  const ratio = box.height / box.width
  return {
    height: box.height,
    width: box.width,
    ratio: isNaN(ratio) ? 0 : ratio
  }
}
