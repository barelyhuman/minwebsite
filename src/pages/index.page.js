import { html } from "@arrow-js/core";
import axios from "axios";
import { Header } from "../components/Header";

export const loader = async ({ req }) => {
  const fetchData = await axios.get(
    "https://ungh.cc/repos/barelyhuman/minweb-public-data/files/main/links.json"
  );

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
  const data = JSON.parse(fetchData.data.file.contents)
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

      <div>
        ${Object.keys(data).map((key) => {
          const items = data[key];

          return html`<div class="my-md">
            <a href="#${key}" class="my-sm block"
              ><h3 id="${key}">${key}</h3></a
            >
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
      </div>
    </div>
  `;
}
