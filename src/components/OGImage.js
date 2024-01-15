import { html } from "@arrow-js/core";

export function OGImage({ title, imageURL } = {}) {
  if (!imageURL) {
    const fallbackImage =
      "https://og.barelyhuman.xyz/generate?fontSize=14&backgroundColor=%23121212&title=" +
      title +
      "&fontSizeTwo=8&color=%23efefef";

    return html`<img class="og-image" src="${fallbackImage}" alt="${title}" />`;
  }
  return html`<img class="og-image" src="${imageURL}" alt="${title}" />`;
}
