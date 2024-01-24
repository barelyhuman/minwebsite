import { html } from "@arrow-js/core";
import { marked } from "marked";
import { BaseLayout } from "../layouts/base.js";

const content = marked(
  `[minweb.site](https://minweb.site) is a simple curation platform for minimally aesthetic websites. Currently curated by [reaper](https://reaper.is) and [Arne Wiese](https://www.wiesson.dev).`
);

export default function Page() {
  return BaseLayout({
    children: html` <article class="p-10 prose prose-invert my-xl">${content}</article> `,
  });
}
