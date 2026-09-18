/** Accent-insensitive comparison used by guesses, ranking and the lexicon. */
export function normalizeWord(value: string): string {
  return value.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
