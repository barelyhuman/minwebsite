import { html } from "@arrow-js/core";

export function OGImage({ title, link } = {}) {
  const sp = new URLSearchParams();
  sp.append("title", title);
  sp.append("link", link);
  const url = `/api/image?${sp}`;
  return html`<img class="og-image" data-masonry src="${url}" alt="${title}" />`;
}
