import type { Filter } from "../types/filter";
import Uwuifier from "uwuifier";
const uwuifier = new Uwuifier();
uwuifier.actions = [
  "*blushes*",
  "*whispers to self*",
  "*cries*",
  "*screams*",
  "*sweats*",
  "*runs away*",
  "*screeches*",
  "*walks away*",
  "*looks at you*",
  "*huggles tightly*",
  "*boops your nose*",
];

export const uwu = {
  name: "uwu",
  friendlyName: "UwU",
  description:
    "Become a mirror-dweller today for low-low price of your sanity!",

  run: (message) => ({
    ...message,
    content: uwuifier.uwuifySentence(message.content || ""),
  }),

  preview: (text) => uwuifier.uwuifySentence(text),
} as Filter;
