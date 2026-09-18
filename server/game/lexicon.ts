import { gunzipSync } from "node:zlib";
import encodedWords from "./generated/pt-br";
import { normalizeWord } from "../../shared/words";

// Reviewed exceptions for theme vocabulary not covered by VERO. Add explicit
// spellings here, never guesses received from players or all aliases blindly.
const EXTRA_WORDS = new Set(["chakra"]);
let vocabulary: string | undefined;

/** Offline membership check, without building millions of objects on cold start. */
export function isRecognizedWord(value: string): boolean {
  const normalized = normalizeWord(value);
  if (!/^[a-z]{1,80}$/.test(normalized)) return false;
  if (EXTRA_WORDS.has(normalized)) return true;
  vocabulary ??= gunzipSync(Buffer.from(encodedWords, "base64")).toString("utf8");

  // The build sorts the ASCII words. Search by line boundaries in the cached
  // string so memory usage stays close to the size of the plain word list.
  let low = 0;
  let high = vocabulary.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    const start = middle === 0 ? 0 : vocabulary.lastIndexOf("\n", middle - 1) + 1;
    const newline = vocabulary.indexOf("\n", middle);
    const end = newline === -1 ? vocabulary.length : newline;
    const word = vocabulary.slice(start, end);
    if (word === normalized) return true;
    if (word < normalized) low = end + 1;
    else high = start;
  }
  return false;
}
