export const STOPWORDS_PT = new Set([
  "a", "o", "e", "de", "da", "do", "das", "dos", "para", "por", "com",
  "sem", "que", "qual", "quais", "como", "quando", "onde", "porque",
  "ja", "ainda", "nao", "sim", "mais", "menos", "muito", "pouco",
  "esse", "essa", "isso", "aquele", "aquela", "aquilo", "este", "esta",
  "isto", "ele", "ela", "eles", "elas", "eu", "tu", "voce", "voces",
  "nos", "lhe", "me", "te", "se", "um", "uma", "uns", "umas", "ou",
  "tambem", "entao", "agora", "ainda", "ate", "mas", "porem", "no",
  "na", "nos", "nas", "ao", "aos", "tem", "ter", "vai", "vao", "fazer",
]);

export const STOPWORDS_EN = new Set([
  "the", "a", "an", "and", "or", "but", "of", "in", "on", "at", "to",
  "for", "with", "by", "from", "up", "about", "into", "over", "after",
  "is", "are", "was", "were", "be", "been", "being", "have", "has",
  "had", "do", "does", "did", "will", "would", "could", "should",
  "may", "might", "must", "shall", "can", "need", "i", "you", "he",
  "she", "it", "we", "they", "this", "that", "these", "those", "what",
  "which", "who", "whom", "where", "when", "why", "how",
]);

export function isStopword(token: string): boolean {
  return STOPWORDS_PT.has(token) || STOPWORDS_EN.has(token);
}
