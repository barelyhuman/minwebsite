import { html } from "@arrow-js/core";
import axios from "axios";
import { Header } from "../components/Header.js";
import { reactive } from "@arrow-js/core";
import { OGImage } from "../components/OGImage.js";

import { createBento } from "../lib/masonry.js";

let cachedLinkData = [];
let lastFetched = null,
  cacheStaleTime = null;

const fetchData = async () => {
  const data = await axios
    .get(
      "https://ungh.cc/repos/barelyhuman/minweb-public-data/files/main/links.json"
    )
    .catch((err) => []);
  let result = [];
  try {
    result = JSON.parse(data.data.file.contents);
  } catch (err) {}
  cachedLinkData = result;
  cacheStaleTime = Date.now() + 60 * 1000;
  lastFetched = Date.now();
  return result;
};

export const loader = async ({ req }) => {
  let linkData = [];
  if (!lastFetched) {
    linkData = await fetchData();
  } else {
    if (Date.now() < cacheStaleTime) {
      linkData = cachedLinkData;
      console.log("using cache");
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
    .sort((x, y) => x.title.toLowerCase() < y.title.toLowerCase())
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
    })
    .reduce((acc, item) => {
      const key = item.title.toLowerCase().charAt(0);
      (acc[key] || (acc[key] = [])).push(item);
      return acc;
    }, {});

  const query = {};

  if (searchTerm) {
    query.searchTerm = searchTerm;
  }

  return {
    query,
    data,
    selectedCategories,
    categories: Array.from(categories),
  };
};

export default function Page({ query, data, categories, selectedCategories }) {
  const onChange = (e, category) => {
    const form = e.target.closest("form");
    form.submit();
  };

  const stateFromStorage = { showGrid: false };

  if (typeof window !== "undefined") {
    const itemState = localStorage.getItem("show_grid");

    Object.assign(stateFromStorage, {
      showGrid: itemState === "false" ? false : true,
    });
  }

  const state = reactive(stateFromStorage);

  state.$on("showGrid", () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("show_grid", state.showGrid);
    }
  });

  return html`
    <div>
      ${Header()}

      <form method="GET">
        <div>
          <input
            class="search-input"
            placeholder="search"
            type="text"
            name="q"
            value="${query.searchTerm}"
          />
        </div>
        <div>
          <r-grid columns="12" class="my-md">
            ${categories.map((x) => {
              const checked = selectedCategories.includes(x) ? "checked" : "";
              return html`
                <r-cell span="2">
                  <label class="form-control">
                    <input
                      type="checkbox"
                      name="category"
                      value="${x}"
                      class="mx-sm"
                      @change="${(e) => onChange(e, x)}"
                      ${checked}
                    />
                    ${x}
                  </label>
                </r-cell>
              `;
            })}
          </r-grid>
        </div>
      </form>

      <r-grid columns="12">
        <r-cell span="10"></r-cell>
        <r-cell span="2">
          <div class="flex items-center gap-sm">
            <div>List</div>
            <div
              class="toggle"
              @click="${(e) => {
                state.showGrid = !state.showGrid;
              }}"
            >
              <div class="line"></div>
              <div
                class="circle"
                style="${() => (state.showGrid ? "left:50%" : "left:0%")}"
              ></div>
            </div>
            <div>Grid</div>
          </div>
        </r-cell>
      </r-grid>
    </div>

    ${() => (!state.showGrid ? List({ data }) : Grid({ data }))}
  `;
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
            ${() => OGImage({ title: x.title, link: x.link })}
          </a>
        </div>
      `;
    })}
  </div>`;
}
