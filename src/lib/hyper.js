const ELEMENT_ID = Symbol("isElm");

export function h(tag, props, ...children) {
  let elm;
  props = props || {};
  if (tag instanceof HTMLElement && ELEMENT_ID in tag) {
    elm = tag;
  } else {
    const docElem = document.createElement(tag);
    elm = docElem;
  }

  Object.keys(props).forEach((key) => {
    if (key in elm) {
      if (key === "style") {
        let styles = props[key];
        if (Array.isArray(styles)) {
          styles = props[key].reduce((acc, i) => {
            return Object.assign(acc, i);
          }, {});
        }
        Object.assign(elm[key], styles);
      }
    } else {
      elm.setAttribute(key, props[key]);
    }
  });

  children.forEach((child) => {
    if (typeof child === "string") {
      const node = document.createTextNode(child);
      elm.appendChild(node);
      return;
    }
    if (child instanceof HTMLElement) {
      elm.appendChild(child);
    }
  });

  elm[ELEMENT_ID] = true;

  return elm;
}
