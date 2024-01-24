export function initLazyLoader() {
  if (typeof window === "undefined") {
    return;
  }

  function lazyLoad() {
    const toLoad = document.querySelectorAll("[data-src]");
    for (const elm of toLoad) {
      if (elm.lazyLoaded == true) continue;

      const box = elm.getBoundingClientRect();
      if (box.top <= window.screenTop + window.innerHeight) {
        elm.src = elm.dataset.src;
        elm.lazyLoaded = true;
      }
    }
  }

  window.addEventListener("scroll", () => {
    lazyLoad();
  });

  lazyLoad();
}
