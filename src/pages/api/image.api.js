import { unfurl } from "unfurl.js";

export const get = async ({ req, res }) => {
  const link = req.query.link;
  const title = req.query.title;
  const fallbackImage =
    "https://og.barelyhuman.xyz/generate?fontSize=14&backgroundColor=%23121212&title=" +
    title +
    "&fontSizeTwo=8&color=%23efefef";
  try {
    const result = await unfurl(link);
    const imageLink =
      result.open_graph.images.length > 0
        ? result.open_graph.images[0].secure_url ||
          result.open_graph.images[0].url
        : fallbackImage;
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
