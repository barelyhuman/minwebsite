
import { html } from "@arrow-js/core";
import "../index.css"

export const BaseLayout = ({ children } = {}) => {
  return html`<div class="rounded-sm sm:m-1 md:m-10 p-2 border border-white/50">
    ${children}
  </div>`;
};
