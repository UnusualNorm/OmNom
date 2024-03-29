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

export const uwu: Filter = {
  id: "uwu",
  name: "UwU",
  description: "OWO What's this?",

  run: (message) => ({
    ...message,
    username: message.username
      ? uwuifier.uwuifyWords(message.username)
      : message.username,
    content: message.content
      ? uwuifier.uwuifySentence(message.content).replaceAll("*", "\\*")
      : message.content,
  }),

  preview: (text) => uwuifier.uwuifySentence(text).replaceAll("*", "\\*"),
};
