import { html } from "@arrow-js/core";
import axios from "axios";
import { OGImage } from "../components/OGImage.js";

import { BaseLayout } from "../layouts/base.js";
import { initLazyLoader } from "../lib/lazy-loader.js";
import { createBento } from "../lib/masonry.js";

let cachedLinkData = [];
let lastFetched = null,
  cacheStaleTime = null;

const fetchData = async () => {
  const data = await axios
    .get(
      "https://ungh.cc/repos/barelyhuman/minweb-public-data/files/main/data/links.json"
    )
    .catch((err) => []);
  let result = [];
  try {
    result = JSON.parse(data.data.file.contents);
    cachedLinkData = result;
    cacheStaleTime = Date.now() + 60 * 1000;
    lastFetched = Date.now();
  } catch (err) {}
  return result;
};

export const loader = async ({ req }) => {
  let linkData = [];
  if (!lastFetched) {
    linkData = await fetchData();
  } else {
    if (Date.now() < cacheStaleTime) {
      linkData = cachedLinkData;
    } else {
      linkData = await fetchData();
    }
  }

  const searchTerm = req.query.q;

  const cats = req.query.category;

  let selectedCategories = [];

  if (typeof cats === "string" && cats !== "undefined") {
    selectedCategories.push(cats);
  } else {
    selectedCategories = selectedCategories.concat(cats);
  }

  selectedCategories = selectedCategories.filter((x) => x);

  const categories = new Set();
  const normalisedST = (searchTerm && searchTerm.toLowerCase().trim()) || "";
  const data = linkData
    .map((d) => {
      categories.add(d.category);
      return d;
    })
    .sort((x, y) => x.title.toLowerCase() > y.title.toLowerCase())
    .filter((x) => {
      if (!searchTerm) return x;
      return (
        x.title.toLowerCase().trim().includes(normalisedST) ||
        x.link.toLowerCase().trim().includes(normalisedST)
      );
    })
    .filter((x) => {
      if (selectedCategories.length == 0) return true;
      return selectedCategories.includes(x.category);
    });

  const query = {};

  if (searchTerm) {
    query.searchTerm = searchTerm;
  }

  const count = linkData.length;

  return {
    query,
    data,
    count,
    selectedCategories,
    categories: Array.from(categories),
  };
};

export default function Page({
  query,
  data,
  count,
  categories,
  selectedCategories,
}) {
  const onChange = (e, category) => {
    const form = e.target.closest("form");
    form.submit();
  };

  let id = setInterval(async () => {
    if (typeof window === "undefined") return;
    const bentoGrid = document.querySelector(".bento");
    if (!bentoGrid) {
      return;
    }
    createBento(bentoGrid, 4, 0);
    initLazyLoader();
    clearInterval(id);
  }, 500);

  return BaseLayout({
    children: html`
      <div class="flex w-full">
        <div
          class="bento grid w-full sm:grid-cols-1 md:grid-cols-3 lg:grid-cols-4"
        >
          <div class="p-5 h-[320px] overflow-hidden">
            <nav class="text-zinc-400">
              <h1 class="text-zinc-600 text-xl mb-5">MW</h1>
              <form>
                <div class="mb-3">
                  <input
                    type="text"
                    class="px-2 py-1 m-0 focus:outline-none ring-0 text-xs border bg-transparent rounded-[6px] border-zinc-700"
                    placeholder="search"
                    value="${query.searchTerm}"
                    name="q"
                  />
                </div>
                <ul class="text-sm flex flex-col gap-[8px]">
                  <a href="/about" class="text-zinc-400 hover:text-zinc-100">
                    <li>About</li>
                  </a>
                  <a
                    href="https://github.com/barelyhuman/minweb-public-data#add-another-site"
                    class="text-zinc-400 hover:text-zinc-100"
                  >
                    <li>Submit a site?</li>
                  </a>
                  <li>
                    <div class="flex flex-col gap-2">
                      <p>Categories</p>
                      <div class="ml-3">
                        ${categories.map(
                          (x) => html`
                            <label class="my-3 flex gap-2 items-center">
                              <input
                                type="checkbox"
                                class="rounded-sm h-3 w-3 bg-base checked:bg-lime-400 hover:checked:bg-lime-400 focus:bg-lime-400"
                                @change="${onChange}"
                                checked="${() =>
                                  selectedCategories.includes(x)}"
                                value="${x}"
                                name="category"
                              />
                              <div>
                                <span>${x}</span>
                              </div>
                            </label>
                          `
                        )}
                      </div>
                    </div>
                  </li>
                </ul>
              </form>
            </nav>
          </div>
          ${data
            .sort((x, y) => x.title.toLowerCase() > y.title.toLowerCase())
            .map((tile) => {
              return html`<a href="${tile.link}" class="transition-all duration-300">
                <div class="group hover:cursor-pointer relative">
                  <img
                    src="/image-placeholder.svg"
                    data-src="${tile.imageURL}"
                  />
                  <div
                    class="group-hover:block hidden absolute bottom-2 left-2 px-3 py-1 text-xs rounded-sm bg-black text-white"
                  >
                    <p>${tile.title}</p>
                  </div>
                </div>
              </a>`;
            })}
        </div>
      </div>
    `,
  });
}

function List({ data }) {
  return html` <div>
    ${Object.keys(data)
      .sort()
      .map((key) => {
        const items = data[key];

        return html`<div class="my-md">
          <a href="#${key}" class="my-sm block"><h3 id="${key}">${key}</h3></a>
          ${items.map((x) => {
            return html`<r-grid columns="3">
              <r-cell span="1" span-s="row">
                <p>
                  <a class="no-underline" href="${x.link}">${x.title} </a>
                </p>
              </r-cell>
              <r-cell span="1" span-s="row"></r-cell>
              <r-cell span="1" span-s="1">
                <p class="align-right text-dull">${x.category}</p>
              </r-cell>
            </r-grid>`;
          })}
        </div>`;
      })}
  </div>`;
}

function Grid({ data }) {
  let id = setInterval(async () => {
    const bentoGrid = document.querySelector(".bento");
    if (!bentoGrid) {
      return;
    }
    createBento(bentoGrid);
    clearInterval(id);
  }, 500);

  const onlyData = Object.entries(data).reduce((acc, item) => {
    return acc.concat(item[1]);
  }, []);

  return html` <div class="my-md bento">
    ${onlyData.map((x) => {
      return html`
        <div class="bento-item">
          <a href="${x.link}" target="_blank">
            ${() => OGImage({ title: x.title, imageURL: x.imageURL })}
          </a>
        </div>
      `;
    })}
  </div>`;
}
