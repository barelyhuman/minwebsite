export function initLazyLoader() {
  if (typeof window === "undefined") {
    return;
  }

  function lazyLoad() {
    const toLoad = document.querySelectorAll("[data-src]");
    for (const elm of toLoad) {
      if (elm.lazyLoaded === true) continue;

      const box = elm.getBoundingClientRect();
      if (box.top <= window.screenTop + window.innerHeight) {
        const img = new Image();
        img.addEventListener("load", () => {
          elm.src = elm.dataset.src;
          elm.lazyLoaded = true;
        });
        img.src = elm.dataset.src;
      }
    }
  }

  window.addEventListener("scroll", () => {
    lazyLoad();
  });

  lazyLoad();
}
