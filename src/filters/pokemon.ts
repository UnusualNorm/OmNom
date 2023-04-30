import type { Filter } from "../types/filter.js";

export const pokemon: Filter = {
  id: "pokemon",
  name: "Pokemon",
  description: "Who's that pokemon? It's- Your moderator!",

  run: (message) => ({
    ...message,
    content: message.username,
  }),

  preview: (_, username) => username,
};
