import type { Filter } from "../types/filter.js";

function typoify(text: string) {
  const words = text.split(" ");
  for (let i = 0; i < words.length; i++) {
    let word = words[i] as string;
    const typoChoice = Math.floor(
      Math.random() * (0 + (word.length > 1 ? 2 : 0))
    );

    switch (typoChoice) {
      case 0: {
        // Duplication of a letter
        const letterIndex = Math.floor(Math.random() * word.length);
        word = word.substring(0, letterIndex + 1) + word.substring(letterIndex);
        break;
      }

      case 1: {
        // Delete a random letter
        const missingLetterIndex = Math.floor(Math.random() * word.length);
        word =
          word.substring(0, missingLetterIndex) +
          word.substring(missingLetterIndex + 1);
        break;
      }

      case 2: {
        // Swap two letters
        const swapLetterIndex = Math.floor(Math.random() * (word.length - 1));
        const swapLetter2Index = swapLetterIndex + 1;
        const lastLetter = word[swapLetter2Index];
        word =
          word.substring(0, swapLetterIndex) +
          lastLetter +
          word[swapLetterIndex] +
          word.substring(swapLetter2Index + 1);

        break;
      }
    }

    words[i] = word;
  }
  return words.join(" ");
}

const TypoFilter: Filter = {
  name: "typo",
  friendlyName: "Typo",
  description: "Oh slly me, I madde a tpyo!",

  run: (message) => ({
    ...message,
    content: message.content ? typoify(message.content) : "",
  }),

  preview: (text) => typoify(text),
};

export { TypoFilter };
