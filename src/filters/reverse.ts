import type { Filter } from "../types/filter.js";

const reverseText = (text: string) => text.split("").reverse().join("");
export const reverse: Filter = {
  id: "reverse",
  name: "Reverse",
  description: "!em pleh ,on hO",

  run: (message) => ({
    ...message,
    username: message.username
      ? reverseText(message.username)
      : message.username,
    content: message.content ? reverseText(message.content) : message.content,
  }),

  preview: (text) => reverseText(text),
};
