import { CATEGORY_HINTS, type WordEntry } from "./dictionary";

export type Difficulty = "easy" | "medium" | "hard";
export type DifficultyWordEntry = WordEntry & { difficulty: Difficulty };

type Seed = readonly [
  word: string,
  category: keyof typeof CATEGORY_HINTS,
  difficulty: Difficulty,
  related: readonly [string, string, string, string],
];

function fromSeed([word, category, difficulty, related]: Seed): DifficultyWordEntry {
  return {
    word,
    category,
    difficulty,
    prompt: `A resposta se aproxima de ${related[0]}, ${related[1]} e ${related[2]}.`,
    aliases: Object.fromEntries([
      [word, 1],
      ...related.map((term, index) => [term, [5, 10, 16, 22][index]]),
    ]),
  };
}

const seeds: Seed[] = [
  ["porta", "casa", "easy", ["entrada", "chave", "fechadura", "cômodo"]],
  ["papel", "objetos", "easy", ["folha", "escrita", "caderno", "impressão"]],
  ["fogo", "natureza", "easy", ["chama", "calor", "brasa", "incêndio"]],
  ["água", "natureza", "easy", ["líquido", "sede", "rio", "chuva"]],
  ["peixe", "natureza", "easy", ["aquático", "nadadeira", "rio", "oceano"]],
  ["pássaro", "natureza", "easy", ["ave", "asa", "ninho", "voo"]],
  ["casa", "casa", "easy", ["moradia", "lar", "quarto", "família"]],
  ["roupa", "objetos", "easy", ["tecido", "vestir", "camisa", "armário"]],
  ["camisa", "objetos", "easy", ["roupa", "manga", "botão", "tecido"]],
  ["ovo", "comidas", "easy", ["galinha", "casca", "gema", "cozinha"]],
  ["leite", "comidas", "easy", ["bebida", "vaca", "queijo", "cálcio"]],
  ["sal", "comidas", "easy", ["tempero", "salgado", "cozinha", "mar"]],
  ["açúcar", "comidas", "easy", ["doce", "cristal", "sobremesa", "cana"]],
  ["carne", "comidas", "easy", ["alimento", "proteína", "churrasco", "refeição"]],
  ["pizza", "comidas", "easy", ["massa", "queijo", "forno", "fatia"]],
  ["boneca", "objetos", "easy", ["brinquedo", "criança", "vestido", "brincadeira"]],
  ["criança", "ideias", "easy", ["infância", "brincadeira", "escola", "família"]],
  ["família", "ideias", "easy", ["parentes", "casa", "união", "afeto"]],
  ["trabalho", "ideias", "easy", ["emprego", "profissão", "esforço", "salário"]],
  ["dinheiro", "objetos", "easy", ["moeda", "valor", "compra", "banco"]],

  ["engenheiro", "ideias", "medium", ["projeto", "cálculo", "construção", "profissão"]],
  ["arquitetura", "arte", "medium", ["projeto", "edifício", "desenho", "construção"]],
  ["democracia", "ideias", "medium", ["voto", "cidadania", "governo", "liberdade"]],
  ["ciência", "ideias", "medium", ["pesquisa", "experimento", "conhecimento", "método"]],
  ["energia", "ideias", "medium", ["força", "eletricidade", "movimento", "potência"]],
  ["linguagem", "cultura", "medium", ["comunicação", "idioma", "palavra", "expressão"]],
  ["viagem", "aventura", "medium", ["destino", "caminho", "bagagem", "turismo"]],
  ["outono", "natureza", "medium", ["folha", "estação", "frio", "vento"]],
  ["primavera", "natureza", "medium", ["flor", "estação", "jardim", "renovação"]],
  ["orquestra", "arte", "medium", ["música", "maestro", "instrumento", "concerto"]],
  ["jornalismo", "cultura", "medium", ["notícia", "imprensa", "reportagem", "informação"]],
  ["ecossistema", "natureza", "medium", ["ambiente", "espécie", "equilíbrio", "natureza"]],
  ["algoritmo", "ideias", "medium", ["código", "sequência", "computador", "lógica"]],
  ["patrimônio", "cultura", "medium", ["herança", "história", "cultura", "preservação"]],
  ["cerâmica", "arte", "medium", ["argila", "forno", "vaso", "artesanato"]],
  ["agricultura", "natureza", "medium", ["plantio", "colheita", "campo", "alimento"]],
  ["medicina", "ideias", "medium", ["saúde", "médico", "tratamento", "ciência"]],
  ["geografia", "cultura", "medium", ["mapa", "território", "paisagem", "mundo"]],
  ["engenho", "objetos", "medium", ["máquina", "invenção", "mecanismo", "produção"]],
  ["narrativa", "arte", "medium", ["história", "personagem", "enredo", "literatura"]],

  ["efêmero", "ideias", "hard", ["breve", "passageiro", "instante", "transitório"]],
  ["âmago", "ideias", "hard", ["essência", "interior", "núcleo", "profundo"]],
  ["alento", "ideias", "hard", ["ânimo", "consolo", "esperança", "fôlego"]],
  ["devaneio", "ideias", "hard", ["fantasia", "sonho", "imaginação", "distração"]],
  ["recôndito", "lugares", "hard", ["oculto", "remoto", "escondido", "íntimo"]],
  ["inexorável", "ideias", "hard", ["implacável", "inevitável", "rigor", "destino"]],
  ["parcimônia", "ideias", "hard", ["moderação", "economia", "prudência", "contenção"]],
  ["perspicácia", "ideias", "hard", ["percepção", "astúcia", "clareza", "inteligência"]],
  ["altruísmo", "ideias", "hard", ["generosidade", "solidariedade", "ajuda", "desapego"]],
  ["resiliência", "ideias", "hard", ["superação", "adaptação", "força", "resistência"]],
  ["ambíguo", "ideias", "hard", ["duplo", "incerto", "interpretação", "dúvida"]],
  ["eloquência", "cultura", "hard", ["oratória", "expressão", "discurso", "persuasão"]],
  ["melancolia", "ideias", "hard", ["tristeza", "saudade", "silêncio", "nostalgia"]],
  ["sinestesia", "arte", "hard", ["sentido", "cor", "som", "percepção"]],
  ["entropia", "ideias", "hard", ["desordem", "energia", "sistema", "caos"]],
  ["quimera", "fantasia", "hard", ["ilusão", "criatura", "sonho", "mito"]],
  ["paradoxo", "ideias", "hard", ["contradição", "lógica", "enigma", "verdade"]],
  ["utopia", "ideias", "hard", ["ideal", "sociedade", "sonho", "futuro"]],
  ["epifania", "ideias", "hard", ["revelação", "descoberta", "clareza", "instante"]],
  ["catarse", "arte", "hard", ["emoção", "libertação", "teatro", "alívio"]],
];

export const EXPANDED_WORDS: readonly DifficultyWordEntry[] = seeds.map(fromSeed);

