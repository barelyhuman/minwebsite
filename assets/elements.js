const isElemDefined = (name) => (customElements.get(name) ? true : false);

init();

const SINGLE_ROW_HEIGHT = 200;

function init() {
  const hideProgressLoader = attachLoader();
  const styleWatcher = setInterval(() => {
    const unoStyle = document.getElementById("uno");
    const gridContainer = document.getElementById("bento-grid");
    if (unoStyle.innerText.includes("--un-rotate") && gridContainer) {
      createBento();
      clearInterval(styleWatcher);
      hideProgressLoader();
    }
  }, 500);
}

function attachLoader() {
  const loader = document.getElementById("page-loader");
  const progress = loader.querySelector(".loader-progress");
  const progressInterval = setInterval(() => {
    const increments = 1;
    let curr = parseInt(progress.style.left, 10);
    if (isNaN(curr)) {
      curr = 0;
    }
    if (curr + increments >= 100) {
      curr = -increments;
    } else {
      curr += increments;
    }
    progress.style.left = curr + "%";
  }, 30);

  const hideProgressLoader = () => {
    clearInterval(progressInterval);
    loader.classList.add("hidden");
  };
  return hideProgressLoader;
}

function createBento() {
  const gridContainer = document.getElementById("bento-grid");
  if (!gridContainer) return;

  const totalItems = gridContainer.children.length;
  const totalRows = Math.ceil(totalItems / 3);

  gridContainer.style.gridTemplateRows = `repeat(${totalRows}, minmax(0, 1fr))`;

  for (let i = 0; i < gridContainer.children.length; i += 1) {
    const childNode = gridContainer.children[i];
    // childNode.style.width = elemWidth + "px";

    const img = childNode.querySelector("img");

    if (img.complete || img.naturalWidth > 0) {
      const imgSizeRatio = img.naturalHeight / img.naturalWidth;
      const targetWidth = childNode.getBoundingClientRect().width;
      const targetHeight = targetWidth * imgSizeRatio;
      childNode.style.height = targetHeight + "px";
      if (targetHeight > SINGLE_ROW_HEIGHT) {
        childNode.classList.add("row-span-2");
      } else {
        childNode.classList.add("row-span-1");
      }
      img.width = targetWidth;
      img.height = targetHeight;
    } else {
      const onload = (evt) => {
        const target = evt.target;
        const imgSizeRatio = target.height / target.width;
        const targetWidth = childNode.getBoundingClientRect().width;
        const targetHeight = targetWidth * imgSizeRatio;
        target.width = targetWidth;
        target.height = targetHeight;

        if (targetHeight > SINGLE_ROW_HEIGHT) {
          childNode.classList.add("row-span-2");
        } else {
          childNode.classList.add("row-span-1");
        }

        childNode.style.height = targetWidth * imgSizeRatio + "px";
      };

      img.addEventListener("load", onload);
    }

    img.addEventListener("error", (evt) => {
      evt.target.src = `https://og.barelyhuman.xyz/generate?fontSize=14&title=${evt.target.alt}&fontSizeTwo=8&color=%23000`;
    });
  }

  gridContainer.classList.remove("opacity-0");
}
