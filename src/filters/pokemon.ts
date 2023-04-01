import type { Filter } from "../types/filter.js";

export const pokemon: Filter = {
  name: "pokemon",
  friendlyName: "Pokemon",
  description: "Who's that pokemon? It's- Your moderator!",

  run: (message) => ({
    ...message,
    content: message.username,
  }),

  preview: (text) => "*Insert your username here :)*",
};
