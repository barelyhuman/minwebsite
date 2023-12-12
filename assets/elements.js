init();

function init() {
  window.addEventListener("DOMContentLoaded", () => {
    createBento();
  });
}

async function createBento(maxCols = 3, gap = 16) {
  const gridContainer = document.getElementById("bento-grid");

  const gridBox = gridContainer.getBoundingClientRect();
  const elemWidth = Math.ceil(gridBox.width / maxCols);

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
      const dimensions = await getImageNaturalDimensions(img);
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
          left: -expectedWidth,
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

  removeLoader();
}

/**
 * @param {HTMLImageElement} img
 * @returns
 */
async function getImageNaturalDimensions(img) {
  if (img.naturalHeight > 0) {
    return {
      height: img.naturalHeight,
      width: img.naturalWidth,
      ratio: img.naturalHeight / img.naturalWidth,
    };
  }

  let promise, resolve;

  promise = new Promise((_resolve) => {
    resolve = _resolve;
  });

  img.addEventListener("load", (evt) => {
    resolve({
      height: evt.target.naturalHeight,
      width: evt.target.naturalWidth,
      ratio: evt.target.naturalHeight / evt.target.naturalWidth,
    });
  });

  return promise;
}

function removeLoader() {
  const loader = document.getElementById("loading-text");
  loader.parentNode.removeChild(loader);
}
