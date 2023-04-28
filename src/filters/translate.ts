import type { Filter } from "../types/filter.js";
import { translate } from "@vitalets/google-translate-api";
import { isUrl } from "../utils/url.js";

const spanishify = async (message: string): Promise<string> => {
  const { text } = await translate(message, { to: "es" });

  const split = text.split(" ");
  for (let i = 0; i < split.length; i++) {
    const word = split[i] as string;
    if (isUrl(word))
      split[
        i
      ] = `https://translate.google.com/translate?sl=auto&tl=es&u=${encodeURIComponent(
        word
      )}`;
  }

  const newText = split.join(" ");
  return newText;
};

export const spanish: Filter = {
  name: "spanish",
  friendlyName: "Spanish",
  description: "*Nobody ever expects the spanish inquisition!*",

  run: async (message) => ({
    ...message,
    content: message.content ? await spanishify(message.content) : "",
  }),
  preview: (text: string) => spanishify(text),
};
