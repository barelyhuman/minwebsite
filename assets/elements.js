import { getLinkPreview } from "https://esm.sh/link-preview-js@3.0.5";
import DOMpurify from "https://esm.sh/dompurify@3.0.6";

const isElemDefined = (name) => (customElements.get(name) ? true : false);

init();

const OPEN_GRAPH_HEIGHT = 630;
const OPEN_GRAPH_WIDTH = 1200;
const OPEN_GRAPH_RATIO = OPEN_GRAPH_HEIGHT / OPEN_GRAPH_WIDTH;
const PREFERRED_WIDTH = 350;

function init() {
  if (!isElemDefined(getPreviewElemName())) {
    definePreviewElement();
  }
}

function getPreviewElemName() {
  return `preview-link`;
}

function definePreviewElement() {
  customElements.define(
    "preview-link",
    class PreviewLink extends HTMLElement {
      constructor() {
        super();
      }

      async getLinkPreview() {
        const link = this.getAttribute("href");
        try {
          const urlParams = new URLSearchParams();
          urlParams.append("link", link);
          const pageData = await fetch(`/?${urlParams.toString()}`, {
            method: "GET",
            referrerPolicy: "no-referrer",
            redirect: "follow",
          }).then((x) => x.text());
          const pageSplits = pageData.split("</head>");
          const head = pageSplits[0] + "</head></html>";
          const fromRange = document
            .createRange()
            .createContextualFragment(head);
          const imageMeta = fromRange.querySelector(
            'meta[property~="og:image"]'
          );

          let ogImage = this.getPlaceholderURL();
          if (imageMeta) {
            const ogLink = imageMeta.getAttribute("content");
            if (ogLink) {
              ogImage = new URL(ogLink, new URL(link).origin).href;
            }
          }

          return ogImage;
        } catch (err) {
          console.log({ err });
          return this.getPlaceholderURL();
        }
      }

      getPlaceholderURL() {
        const title = this.getAttribute("title");
        return new URL(
          `https://og.barelyhuman.xyz/generate?fontSize=14&title=${title}&fontSizeTwo=8&color=%23000`
        ).toString();
      }

      async connectedCallback() {
        const title = this.getAttribute("title");
        const href = this.getAttribute("href");
        const containerLink = document.createElement("a");
        containerLink.classList.add("p-1");
        containerLink.href = href;
        const img = document.createElement("img");
        img.alt = title;
        img.src = await this.getLinkPreview();
        img.addEventListener("error", () => {
          img.src = this.getPlaceholderURL();
        });

        const width = this.getBoundingClientRect().width;
        img.width = width;
        img.height = OPEN_GRAPH_RATIO * width;
        img.style.objectFit = "cover";

        Object.assign(containerLink.style, {
          width: width + "px",
          height: OPEN_GRAPH_RATIO * width + "px",
        });

        containerLink.appendChild(img);

        this.appendChild(containerLink);
      }
    }
  );
}
