import type { Filter } from "../types/filter.js";

export const reddit: Filter = {
  name: "reddit",
  friendlyName: "Reddit",
  description: "[removed]",

  run: () => ({
    avatarURL:
      "https://www.redditstatic.com/avatars/avatar_default_16_545452.png",
    username: "u/[deleted]",
    content: "[removed]",
  }),

  preview: () => "[removed]",
};
