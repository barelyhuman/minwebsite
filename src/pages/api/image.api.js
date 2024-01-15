import axios from "axios";
import { unfurl } from "unfurl.js";

const cache = new Map();

export const get = async ({ req, res }) => {
  const link = req.query.link;
  const title = req.query.title;

  const inCache = cache.get(link);
  if (inCache) {
    if (Date.now() < inCache.expiry) {
      return res
        .writeHead(303, {
          Location: inCache.imageURL,
        })
        .end();
    }
  }

  const fallbackImage =
    "https://og.barelyhuman.xyz/generate?fontSize=14&backgroundColor=%23121212&title=" +
    title +
    "&fontSizeTwo=8&color=%23efefef";
  try {
    const result = await unfurl(link);
    let imageLink =
      result.open_graph.images.length > 0
        ? result.open_graph.images[0].secure_url ||
          result.open_graph.images[0].url
        : fallbackImage;

    const valid = await axios
      .get(imageLink)
      .then((d) => true)
      .catch((d) => false);

    if (!valid) {
      imageLink = fallbackImage;
    }

    cache.set(link, {
      imageURL: imageLink,
      expiry: Date.now() + 60 * 1000,
    });

    res
      .writeHead(303, {
        Location: imageLink,
      })
      .end();
  } catch (err) {
    res
      .writeHead(303, {
        Location: fallbackImage,
      })
      .end();
  }
};
