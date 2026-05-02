import { isStopword } from "./stopwords.js";

const MIN_TOKEN_LENGTH = 4;

export function tokenize(text: string): Set<string> {
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ");

  const tokens = new Set<string>();
  for (const word of normalized.split(/\s+/)) {
    if (word.length >= MIN_TOKEN_LENGTH && !isStopword(word)) {
      tokens.add(word);
    }
  }
  return tokens;
}

export function jaccardSimilarity(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);

  if (tokensA.size === 0 && tokensB.size === 0) return 0;

  let intersectSize = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersectSize++;
  }

  const unionSize = tokensA.size + tokensB.size - intersectSize;
  return unionSize === 0 ? 0 : intersectSize / unionSize;
}
