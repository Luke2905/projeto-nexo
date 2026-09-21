import { normalizeWord } from "../../shared/words";
import { DAILY_CATALOG_V2 } from "./dailyCatalogV2";
import { CATEGORY_HINTS, type WordEntry } from "./dictionary";
import { EXPANDED_WORDS, type Difficulty, type DifficultyWordEntry } from "./expandedCatalog";

const EASY_WORDS = new Set([
  "farol", "janela", "floresta", "relogio", "oceano", "montanha", "chocolate", "praia",
  "coracao", "musica", "planeta", "espelho", "borboleta", "cinema", "estrela", "jardim",
  "trem", "chuva", "mapa", "ilha", "cachorro", "gato", "cavalo", "coelho", "leao",
  "macaco", "sapo", "cobra", "arvore", "flor", "folha", "rio", "lago", "vento", "nuvem",
  "neve", "gelo", "areia", "pedra", "abelha", "formiga", "lobo", "banana", "laranja",
  "morango", "uva", "limao", "manga", "coco", "maca", "arroz", "feijao", "pao", "queijo",
  "cafe", "cha", "mel", "bolo", "sopa", "salada", "batata", "tomate", "cebola", "carro",
  "onibus", "aviao", "barco", "bola", "camera", "telefone", "chave", "cadeira", "mesa", "sofa",
  "cama", "lampada", "garrafa", "copo", "xicara", "prato", "colher", "garfo", "panela", "sapato",
  "oculos", "cidade", "rua", "ponte", "praca", "parque", "escola", "hospital", "mercado",
  "padaria", "fazenda", "livro", "caderno", "lapis", "caneta", "desenho", "danca", "teatro",
  "circo", "violao", "piano", "flauta", "tambor", "amizade", "alegria", "medo", "calma",
  "coragem", "escolha", "lua", "sol", "foguete",
]);

const HARD_WORDS = new Set([
  "constelacao", "gravidade", "nebulosa", "asteroide", "astronauta", "observatorio",
  "planetario", "solidariedade", "curiosidade", "independencia", "cartografia", "metamorfose",
  "arquipelago", "automato", "estalactite", "conservacao", "amplificacao", "germinacao",
]);

function specificPrompt(entry: WordEntry): string {
  if (entry.prompt !== CATEGORY_HINTS[entry.category]) return entry.prompt;
  const related = Object.entries(entry.aliases)
    .filter(([term]) => normalizeWord(term) !== normalizeWord(entry.word))
    .sort((a, b) => a[1] - b[1])
    .slice(0, 4)
    .map(([term]) => term);
  return `A resposta se aproxima de ${related[0]}, ${related[1]}, ${related[2]} e ${related[3]}.`;
}

export function difficultyForEntry(entry: WordEntry): Difficulty {
  const word = normalizeWord(entry.word);
  if (EASY_WORDS.has(word)) return "easy";
  if (HARD_WORDS.has(word) || word.length >= 11) return "hard";
  return "medium";
}

const upgradedV2: DifficultyWordEntry[] = DAILY_CATALOG_V2.map(entry => ({
  ...entry,
  prompt: specificPrompt(entry),
  difficulty: difficultyForEntry(entry),
}));

export const DAILY_CATALOG_V3: readonly DifficultyWordEntry[] = [
  ...upgradedV2,
  ...EXPANDED_WORDS,
];

export const FREE_CATALOGS: Readonly<Record<Difficulty, readonly DifficultyWordEntry[]>> = {
  easy: DAILY_CATALOG_V3.filter(entry => entry.difficulty === "easy"),
  medium: DAILY_CATALOG_V3.filter(entry => entry.difficulty === "medium"),
  hard: DAILY_CATALOG_V3.filter(entry => entry.difficulty === "hard"),
};
