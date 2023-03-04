import type { Filter } from "../types/filter.js";
import zalgo from "zalgo-js";

const ZalgoFilter: Filter = {
  name: "zalgo",
  friendlyName: "Zalgo",
  description: "Am hacker man! 😎",

  run: (message) => ({
    ...message,
    username: message.username ? zalgo(message.username) : "",
    content: message.content ? zalgo(message.content) : "",
  }),

  preview: zalgo,
};

export { ZalgoFilter };
