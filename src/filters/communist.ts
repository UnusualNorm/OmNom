// TODO: Clean this up
const rules: [RegExp, string][] = [
  [/(?<=(^|[.!?'"“”‘’„”«»]\s*))i+\s+a+m+(?![a-z]|[0-9])/gim, "We are"],
  [/(?<![A-z]|[0-9])i+\s+a+m+(?![A-z]|[0-9])/gim, "we are"],
  [/(?<=(^|[.!?'"“”‘’„”«»]\s*))i+'*m+a*(?![a-z]|[0-9])/gim, "We're"],
  [/(?<![A-z]|[0-9])i+'*m+a*(?![A-z]|[0-9])/gim, "we're"],
  [/(?<=(^|[.!?'"“”‘’„”«»]\s*))i+(?![a-z]|[0-9])/gim, "We"],
  [/(?<![A-z]|[0-9])i+(?![A-z]|[0-9])/gim, "we"],
  [/(?<=(^|[.!?'"“”‘’„”«»]\s*))m+e+(?![a-z]|[0-9])/gim, "Us"],
  [/(?<![A-z]|[0-9])m+e+(?![A-z]|[0-9])/gim, "us"],
  [/(?<=(^|[.!?'"“”‘’„”«»]\s*))m+y+(?![a-z]|[0-9])/gim, "Our"],
  [/(?<![A-z]|[0-9])m+y+(?![A-z]|[0-9])/gim, "our"],
  [/(?<=(^|[.!?'"“”‘’„”«»]\s*))m+i+n+e+(?![a-z]|[0-9])/gim, "Ours"],
  [/(?<![A-z]|[0-9])m+i+n+e+(?![A-z]|[0-9])/gim, "ours"],
  [/(?<=(^|[.!?'"“”‘’„”«»]\s*))m+y+s+e+l+f+(?![a-z]|[0-9])/gim, "Ourselves"],
  [/(?<![A-z]|[0-9])m+y+s+e+l+f+(?![A-z]|[0-9])/gim, "ourselves"],
];

const filter = (text: string): string => {
  rules.forEach((rule) => (text = text.replace(...rule)));
  return text;
};

import type { Filter } from "../types/filter.js";

export const communist: Filter = {
  id: "communist",
  name: "Communist",
  description: "This is our filter, comrade!",
  partial: true,

  // test if message needs to be altered
  test: (message) => {
    if (filter(message.content) != message.content) return true
  },
  
  run: (message) => ({ 
    ...message, 
    content: message.content ? filter(message.content) : message.content,
  }),

  preview: (text) => filter(text),
};
