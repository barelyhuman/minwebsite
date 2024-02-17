import { effect, signal } from "@preact/signals";
import fetch from "@webreflection/fetch";
import { Link, useLocation, useSearch } from "wouter-preact";
import { Layout } from "../components/layout";
import { relocate as alignBento, createBento, resetBento } from "../lib/bento";

const data = signal([]);
const total = signal(0);
const categories = signal([]);

if (typeof window !== "undefined") {
  fetchLinks();
}

async function fetchLinks() {
  const sp = new URLSearchParams(window.location.search);
  try {
    const response = await fetch("/api/links?" + sp.toString()).json();
    categories.value = response.categories;
    data.value = response.data;
    total.value = response.total;
  } catch (err) {
    console.error(err);
  }
}

effect(() => {
  if (data.value.length > 0) {
    const bentoContainer = document.querySelector(".bento");
    resetBento(bentoContainer);
  }
});

export default function HomePage() {
  const rawParams = useSearch();
  const sp = new URLSearchParams(rawParams);
  const [location, setLocation] = useLocation();

  const query = sp.get("q");
  const selectedCategories = sp.getAll("category");

  return (
    <Layout>
      <div class="flex w-full">
        <div
          class="bento min-h-[90vh] grid w-full sm:grid-cols-1 md:grid-cols-3 lg:grid-cols-4"
          ref={(node) => {
            if (!node) return;
            createBento(node, 4, 0);
          }}
        >
          <div class="p-5 h-auto overflow-hidden">
            <nav class="text-zinc-400">
              <h1 class="text-zinc-600 text-xl mb-5">MW</h1>
              <form>
                <div class="mb-3">
                  <input
                    type="text"
                    class="px-2 py-1 m-0 focus:outline-none ring-0 text-xs border bg-transparent rounded-[6px] border-zinc-700"
                    placeholder="search"
                    value={query}
                    onKeyUp={(e) => {
                      if (e.code === "Enter") {
                        sp.set("q", e.target.value);
                        setLocation(location + `?${sp}`);
                      }
                    }}
                    name="q"
                  />
                </div>
                <ul class="text-sm flex flex-col gap-[8px]">
                  <Link href="/about" class="text-zinc-400 hover:text-zinc-100">
                    <li>About</li>
                  </Link>
                  <a
                    href="https://github.com/barelyhuman/minweb-public-data#add-another-site"
                    class="text-zinc-400 hover:text-zinc-100"
                  >
                    <li>Submit a site?</li>
                  </a>
                  <li class="pt-2 border-t border-zinc-500">Total: {total}</li>
                  <li>
                    <div class="flex flex-col gap-2">
                      <p>Categories</p>
                      <div class="ml-3">
                        {categories.value.map((x) => (
                          <label class="my-3 flex gap-2 items-center" key={x}>
                            <input
                              type="checkbox"
                              class="rounded-sm h-3 w-3 bg-base checked:bg-lime-400 hover:checked:bg-lime-400 focus:bg-lime-400"
                              onChange={(e) => {
                                const fd = new FormData(
                                  e.target.closest("form")
                                );
                                const categories = fd.getAll("category");
                                sp.delete("category");
                                categories.forEach((c) => {
                                  sp.append("category", c);
                                });
                                setLocation(location + `?${sp}`);
                                fetchLinks();
                              }}
                              checked={selectedCategories.includes(x)}
                              value={x}
                              name="category"
                            />
                            <div>
                              <span>{x}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </li>
                </ul>
              </form>
            </nav>
          </div>
          {data.value
            .sort((x, y) => x.title.toLowerCase() > y.title.toLowerCase())
            .map((tile, index) => {
              return (
                <a
                  key={tile.link}
                  href={tile.link}
                  class="transition-all duration-300 min-h-[150px]"
                >
                  <div class="group hover:cursor-pointer relative w-full h-full">
                    <img
                      class="border-0 w-full h-full"
                      ref={(node) => {
                        if (!node) return;

                        // eslint-disable-next-line
                        const img = new Image();
                        img.onload = function () {
                          node.src = img.src;
                          node.loaded = true;
                          const bentoGrid = node.closest(".bento");
                          if (bentoGrid) {
                            alignBento(node.closest(".bento"), 4, 0);
                          }
                        };
                        img.src = node.dataset.src;
                      }}
                      style={`background:${tile.backgroundColor}`}
                      data-src={tile.imageURL}
                    />
                    <div class="group-hover:block hidden absolute bottom-2 left-2 px-3 py-1 text-xs rounded-sm bg-black text-white">
                      <p>{tile.title}</p>
                    </div>
                  </div>
                </a>
              );
            })}
        </div>
      </div>
    </Layout>
  );
}
