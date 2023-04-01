import type { Filter } from "../types/filter.js";
import env from "../env/bot.js";
const apiKey = env.TENOR_KEY || "LIVDSRZULELA";

type TenorSearchOutput = {
  results: {
    id: string;
    title: string;
    content_description: string;
    content_rating: string;
    h1_title: string;
    media: {
      nanowebm: {
        url: string;
        preview: string;
        dims: [number, number];
        size: number;
      };
      loopedmp4: {
        duration: number;
        dims: [number, number];
        preview: string;
        size: number;
        url: string;
      };
      mediumgif: {
        dims: [number, number];
        url: string;
        preview: string;
        size: number;
      };
      nanomp4: {
        url: string;
        size: number;
        dims: [number, number];
        preview: string;
        duration: number;
      };
      gif: {
        dims: [number, number];
        size: number;
        preview: string;
        url: string;
      };
      mp4: {
        preview: string;
        size: number;
        duration: number;
        url: string;
        dims: [number, number];
      };
      webm: {
        size: number;
        preview: string;
        dims: [number, number];
        url: string;
      };
      tinymp4: {
        preview: string;
        dims: [number, number];
        duration: number;
        size: number;
        url: string;
      };
      tinygif: {
        dims: [number, number];
        url: string;
        size: number;
        preview: string;
      };
      nanogif: {
        size: number;
        url: string;
        dims: [number, number];
        preview: string;
      };
      tinywebm: {
        url: string;
        preview: string;
        size: number;
        dims: [number, number];
      };
    }[];
    bg_color: string;
    created: number;
    itemurl: string;
    url: string;
    tags: string[];
    flags: string[];
    shares: number;
    hasaudio: boolean;
    hascaption: boolean;
    source_id: string;
    composite: unknown;
  }[];
  next: string;
};

async function getGif(query: string): Promise<string | undefined> {
  const res = await fetch(
    `https://g.tenor.com/v1/search?key=${apiKey}&limit=1&contentfilter=high&q=${encodeURIComponent(
      query
    )}`
  );
  const json: TenorSearchOutput = await res.json();

  return json.results[0]?.media[0]?.tinygif.url;
}

export const GifFilter: Filter = {
  name: "gif",
  friendlyName: "GIF",
  description: "L + Ratio",

  run: async (message) => ({
    ...message,
    content: message.content
      ? (await getGif(message.content)) || "https://tenor.com/bV6ei.gif"
      : "",
  }),

  preview: async (text) =>
    (await getGif(text)) || "https://tenor.com/bV6ei.gif",
};
