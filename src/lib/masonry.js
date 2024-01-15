export function createBento(gridContainer, maxCols = 3, gap = 16) {
  for (let child of gridContainer.children) {
    const img = child.querySelector("img");
    if (img.naturalHeight > 0) {
      // already loaded image
      continue;
    }

    img.addEventListener("load", (evt) => {
      debouncedRelocate(gridContainer, maxCols, gap);
    });
  }
  debouncedRelocate(gridContainer, maxCols, gap);
}

const debounce = (fn, delay) => {
  let id;
  return (...args) => {
    if (id) clearTimeout(id);
    id = setTimeout(() => {
      fn(...args);
    }, delay);
  };
};

const debouncedRelocate = debounce(relocate, 550);

function relocate(gridContainer, maxCols = 3, gap = 16) {
  const windowWidth = window.innerWidth;
  if (windowWidth < 640) {
    maxCols = 1;
  } else if (windowWidth < 768) {
    maxCols -= 1;
  }

  const gridBox = gridContainer.getBoundingClientRect();
  const elemWidth = Math.ceil(gridBox.width / maxCols) - gap;

  const rows = Array.from(gridContainer.children).reduce((arr, item, idx) => {
    return idx % maxCols === 0
      ? [...arr, [item]]
      : [...arr.slice(0, -1), [...arr.slice(-1)[0], item]];
  }, []);

  let expectedPositions = [];

  for (let rowIndex in rows) {
    expectedPositions[rowIndex] = [];
    const cols = rows[rowIndex];
    for (let colIndex in cols) {
      if (!expectedPositions[rowIndex][colIndex]) {
        expectedPositions[rowIndex][colIndex] = {};
      }
      const col = cols[colIndex];
      const img = col.querySelector("img");
      const dimensions = getImageNaturalDimensions(img);
      const expectedWidth = elemWidth;
      const expectedHeight = elemWidth * dimensions.ratio;

      let prevLeft = expectedPositions[rowIndex][colIndex - 1];
      let prevTop;
      if (rowIndex > 0) {
        prevTop = expectedPositions[rowIndex - 1][colIndex];
      } else {
        prevTop = {
          top: -expectedHeight,
          height: expectedHeight,
        };
      }

      if (!prevLeft) {
        prevLeft = {
          left: -(expectedWidth + gap / 2),
        };
      }

      expectedPositions[rowIndex][colIndex] = {
        elem: col,
        left: prevLeft.left + gap + expectedWidth,
        top: prevTop.top + gap + prevTop.height,
        height: expectedHeight,
        width: expectedWidth,
      };
    }
  }

  let lastElem;
  expectedPositions.forEach((rows) => {
    rows.forEach((vDom) => {
      Object.assign(vDom.elem.style, {
        position: "absolute",
        top: vDom.top + "px",
        left: vDom.left + "px",
        width: vDom.width + "px",
        height: vDom.height + "px",
      });

      if (!lastElem) {
        lastElem = vDom;
      }
      if (vDom.top + vDom.height > lastElem.top + lastElem.height) {
        lastElem = vDom;
      }
    });
  });

  Object.assign(gridContainer.style, {
    height: lastElem.top + lastElem.height + "px",
  });
  gridContainer.classList.remove("grid");
  gridContainer.classList.add("relative");

  gridContainer.style.opacity = 1;
}

/**
 * @param {HTMLImageElement} img
 * @returns
 */
function getImageNaturalDimensions(img) {
  const height = img.naturalHeight || 0;
  const width = img.naturalWidth || 0;
  const ratio = height / width;
  return {
    height,
    width,
    ratio: isNaN(ratio) ? 0 : ratio,
  };
}

function removeLoader() {
  const loader = document.getElementById("loading-text");
  if (loader) {
    loader.parentNode.removeChild(loader);
  }
}

function getFallbackURL(title) {
  return (
    "https://og.barelyhuman.xyz/generate?fontSize=14&backgroundColor=%23121212&title=" +
    title +
    "&fontSizeTwo=8&color=%23efefef"
  );
}