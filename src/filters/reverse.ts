import type { Filter } from "../types/filter.js";

const reverseText = (text: string) => text.split("").reverse().join("");
export const reverse: Filter = {
  name: "reverse",
  friendlyName: "Reverse",
  description: "!em pleh ,on hO",

  run: (message) => ({
    ...message,
    username: message.username ? reverseText(message.username) : "",
    content: message.content ? reverseText(message.content) : "",
  }),

  preview: (text) => reverseText(text),
};
