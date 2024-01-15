import { html } from "@arrow-js/core";
import { marked } from "marked";
import { Header } from "../components/Header.js";

const content = marked(
  `[minweb.site](https://minweb.site) is a simple curation platform for minimally aesthetic websites. Currently curated by [reaper](https://reaper.is) and [Arne Wiese](https://www.wiesson.dev).`
);

export default function Page() {
  return html`
    ${Header()}
    <article class="prose my-xl">${content}</article>
  `;
}
