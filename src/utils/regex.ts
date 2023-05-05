export function wcMatch(rule: string, text: string) {
  return new RegExp(
    "^" +
      rule
        .replaceAll(/([.+?^=!:${}()|[\]/\\])/g, "\\$1")
        .replaceAll("*", "(.*)") +
      "$"
  ).test(text);
}
