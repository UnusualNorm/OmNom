import type { Filter } from "../types/filter.js";
import BadWordsFilter from "bad-words";
const filter = new BadWordsFilter();

export const badWords: Filter = {
  name: "badWords",
  friendlyName: "Bad Words",
  description: "Please, no swearing on my minecraft server.",

  run: (message) => ({
    ...message,
    username: message.username ? filter.clean(message.username) : "",
    content: message.content ? filter.clean(message.content) : "",
  }),

  preview: (text) => filter.clean(text),
};
