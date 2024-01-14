import { html } from "@arrow-js/core";

export function Header() {
  return html` <a class="unstyled" href="/"><h2>mw</h2></a>
    <r-grid columns="3">
      <r-cell span="2"></r-cell>
      <r-cell span="1">
        <nav class="nav">
          <ul>
            <li class="align-right"><a href="/about">about</a></li>
          </ul>
        </nav>
      </r-cell>
      <r-cell span="row"></r-cell>
      <r-cell span="2"></r-cell>
      <r-cell span="1">
        <nav class="nav">
          <ul>
            <li class="align-right">
              <a
                class="btn"
                href="https://github.com/barelyhuman/minweb-public-data"
                >submit a site</a
              >
            </li>
          </ul>
        </nav>
      </r-cell>
    </r-grid>`;
}
