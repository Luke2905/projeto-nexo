/**
 * @file dictionary.ts
 * @description Complete word catalog and category hint map for the Nexo game.
 * All secrets (answers) live exclusively here on the server — never exposed to the client.
 */

/** Maps each game category to its corresponding subtle, poetic hint. */
export const CATEGORY_HINTS: Record<string, string> = {
  lugares: "Siga até onde o horizonte começa a ser interessante.",
  casa: "Está mais perto do cotidiano do que parece.",
  espaço: "Não procure no chão: esta resposta prefere distâncias maiores.",
  natureza: "Às vezes, a melhor pista está do lado de fora.",
  objetos: "Você provavelmente já viu isso antes de sair de casa.",
  aventura: "A pista parece pedir movimento — e um pouco de coragem.",
  cultura: "Há lugares em que o passado continua esperando para ser descoberto.",
  fantasia: "Só existe se você aceitar que o impossível também tem regras.",
  comidas: "Algumas respostas cabem numa pausa — e melhoram o humor.",
  filmes: "Antes da imagem ganhar vida, alguém organiza o caminho.",
  anime: "Todo herói percebe cedo que não basta querer.",
  ideias: "Não é algo para tocar, mas muda o que você sente.",
  arte: "Às vezes, guardar um instante também é criar.",
};

export type WordEntry = {
  word: string;
  prompt: string;
  category: keyof typeof CATEGORY_HINTS;
  /** Proximity aliases: words semantically close and their approximate rank position */
  aliases: Record<string, number>;
};

/**
 * The legacy daily challenge word catalog, frozen at 50 entries.
 * Order here defines the rotation — day 0 from EPOCH is index 0, day 1 is index 1, etc.
 * Never add, reorder or delete entries: even appending changes the modulo and
 * breaks historical answers. Expand through a new version in dailySchedule.ts.
 */
export const WORD_CATALOG: WordEntry[] = [
  {
    word: "farol",
    prompt: "Uma luz que guia quem navega durante a noite.",
    category: "lugares",
    aliases: { luz: 20, guia: 14, mar: 10, marinha: 8, torre: 6, sinaleiro: 4, farol: 1 },
  },
  {
    word: "janela",
    prompt: "Uma abertura que deixa o mundo entrar em casa.",
    category: "casa",
    aliases: { abertura: 18, vidro: 15, parede: 12, luz: 10, vista: 7, veneziana: 4, janela: 1 },
  },
  {
    word: "cometa",
    prompt: "Um viajante brilhante que cruza o espaço.",
    category: "espaço",
    aliases: { estrela: 22, céu: 18, brilho: 14, astro: 10, núcleo: 6, cauda: 4, cometa: 1 },
  },
  {
    word: "floresta",
    prompt: "Um lugar onde as árvores escondem muitos caminhos.",
    category: "natureza",
    aliases: { árvore: 20, mata: 16, selva: 12, sombra: 10, folhas: 8, tronco: 5, floresta: 1 },
  },
  {
    word: "relógio",
    prompt: "Algo que transforma o tempo em ponteiros.",
    category: "objetos",
    aliases: { tempo: 22, hora: 18, ponteiro: 12, pulso: 9, minuto: 7, mecanismo: 5, relógio: 1 },
  },
  {
    word: "oceano",
    prompt: "Uma imensidão azul que parece não terminar.",
    category: "natureza",
    aliases: { mar: 18, água: 15, profundidade: 12, onda: 9, horizonte: 7, marinho: 5, oceano: 1 },
  },
  {
    word: "tesouro",
    prompt: "Algo valioso que vale a pena procurar.",
    category: "aventura",
    aliases: { ouro: 20, valor: 16, riqueza: 12, cofre: 10, mapa: 8, joias: 5, tesouro: 1 },
  },
  {
    word: "montanha",
    prompt: "Um desafio alto que muda a paisagem.",
    category: "natureza",
    aliases: { pico: 18, altura: 15, pedra: 12, neve: 10, cume: 7, escalada: 5, montanha: 1 },
  },
  {
    word: "biblioteca",
    prompt: "Um lugar onde histórias ficam esperando por você.",
    category: "cultura",
    aliases: { livro: 20, leitura: 16, história: 12, conhecimento: 10, acervo: 7, estante: 5, biblioteca: 1 },
  },
  {
    word: "satélite",
    prompt: "Um objeto que observa a Terra de muito longe.",
    category: "espaço",
    aliases: { órbita: 20, espaço: 16, sinal: 12, comunicação: 10, telescópio: 7, espacial: 5, satélite: 1 },
  },
  {
    word: "labirinto",
    prompt: "Um caminho cheio de voltas e decisões.",
    category: "aventura",
    aliases: { caminho: 20, saída: 16, corredor: 12, mapa: 10, enigma: 8, passagem: 5, labirinto: 1 },
  },
  {
    word: "tempestade",
    prompt: "Quando o céu muda de humor e faz barulho.",
    category: "natureza",
    aliases: { chuva: 20, trovão: 16, relâmpago: 12, vento: 10, nuvem: 7, temporal: 5, tempestade: 1 },
  },
  {
    word: "pirata",
    prompt: "Um aventureiro dos mares em busca de mapas.",
    category: "aventura",
    aliases: { mar: 20, navio: 16, tesouro: 12, saque: 10, espada: 7, corsário: 5, pirata: 1 },
  },
  {
    word: "memória",
    prompt: "Uma lembrança que continua vivendo dentro da gente.",
    category: "ideias",
    aliases: { lembrança: 18, passado: 15, mente: 12, lembrar: 10, recordação: 7, nostalgia: 5, memória: 1 },
  },
  {
    word: "fotografia",
    prompt: "Um instante guardado para sempre em uma imagem.",
    category: "arte",
    aliases: { imagem: 20, foto: 14, câmera: 12, instante: 10, registro: 7, revelação: 5, fotografia: 1 },
  },
  {
    word: "vulcão",
    prompt: "Uma montanha que pode acordar em vermelho.",
    category: "natureza",
    aliases: { magma: 20, erupção: 16, lava: 12, fogo: 10, montanha: 8, cinzas: 5, vulcão: 1 },
  },
  {
    word: "museu",
    prompt: "Uma instituição que guarda histórias, objetos e memórias.",
    category: "cultura",
    aliases: { arte: 24, "obras de arte": 20, biblioteca: 16, passado: 15, história: 11, galeria: 8, exposição: 5, museu: 1 },
  },
  {
    word: "dragão",
    prompt: "Uma criatura lendária que protege ou ameaça reinos.",
    category: "fantasia",
    aliases: { fogo: 20, mito: 16, asas: 12, escamas: 10, lenda: 8, criatura: 5, dragão: 1 },
  },
  {
    word: "chocolate",
    prompt: "Um doce que melhora qualquer intervalo do dia.",
    category: "comidas",
    aliases: { sobremesa: 24, doce: 17, cacau: 9, barra: 6, chocolate: 1 },
  },
  {
    word: "roteiro",
    prompt: "O que dá forma à história antes da filmagem começar.",
    category: "filmes",
    aliases: { cinema: 22, diretor: 18, cena: 14, história: 12, personagem: 9, roteiro: 1 },
  },
  {
    word: "praia",
    prompt: "Um lugar onde o horizonte parece não ter fim.",
    category: "lugares",
    aliases: { férias: 30, viagem: 24, areia: 15, mar: 7, oceano: 5, praia: 1 },
  },
  {
    word: "poder",
    prompt: "Algo que todo protagonista tenta dominar em sua jornada.",
    category: "anime",
    aliases: { luta: 26, treino: 19, força: 14, energia: 11, chakra: 6, poder: 1 },
  },
  {
    word: "coração",
    prompt: "O centro invisível de toda coragem.",
    category: "ideias",
    aliases: { amor: 20, sentimento: 16, emoção: 12, alma: 10, pulsar: 8, coragem: 5, coração: 1 },
  },
  {
    word: "neblina",
    prompt: "Quando o caminho existe, mas prefere ficar escondido.",
    category: "natureza",
    aliases: { névoa: 16, nevoeiro: 12, bruma: 10, frio: 8, madrugada: 6, visibilidade: 4, neblina: 1 },
  },
  {
    word: "música",
    prompt: "Uma forma de contar algo sem usar frases.",
    category: "arte",
    aliases: { som: 20, melodia: 16, ritmo: 12, instrumento: 10, canção: 7, harmonia: 5, música: 1 },
  },
  {
    word: "aventura",
    prompt: "O começo de qualquer história que merece ser contada.",
    category: "aventura",
    aliases: { jornada: 18, desafio: 15, exploração: 12, risco: 10, herói: 7, descoberta: 5, aventura: 1 },
  },
  {
    word: "planeta",
    prompt: "Um mundo inteiro girando no escuro.",
    category: "espaço",
    aliases: { terra: 18, órbita: 15, sistema: 12, galáxia: 10, astro: 7, universo: 5, planeta: 1 },
  },
  {
    word: "espelho",
    prompt: "Algo que devolve seu olhar sem guardar segredo.",
    category: "objetos",
    aliases: { reflexo: 18, imagem: 14, vidro: 12, rosto: 10, vaidade: 7, cristal: 5, espelho: 1 },
  },
  {
    word: "segredo",
    prompt: "Uma informação que fica mais pesada quando escondida.",
    category: "ideias",
    aliases: { mistério: 18, silêncio: 15, oculto: 12, confidência: 10, sussurro: 7, revelação: 5, segredo: 1 },
  },
  {
    word: "horizonte",
    prompt: "A linha onde o longe parece tocar o céu.",
    category: "lugares",
    aliases: { distância: 18, linha: 15, céu: 12, mar: 10, infinito: 7, longe: 5, horizonte: 1 },
  },
  {
    word: "borboleta",
    prompt: "Uma transformação que aprende a voar.",
    category: "natureza",
    aliases: { lagarta: 20, metamorfose: 16, asas: 12, flor: 10, voo: 8, inseto: 5, borboleta: 1 },
  },
  {
    word: "caverna",
    prompt: "Um lugar escuro que guarda segredos antigos.",
    category: "aventura",
    aliases: { gruta: 16, escuridão: 14, pedra: 12, eco: 10, estalactite: 6, profundeza: 5, caverna: 1 },
  },
  {
    word: "cinema",
    prompt: "Um lugar onde histórias ganham luz e movimento.",
    category: "filmes",
    aliases: { filme: 18, tela: 14, pipoca: 12, sessão: 10, diretor: 8, projetor: 5, cinema: 1 },
  },
  {
    word: "estrela",
    prompt: "Um ponto de luz que nunca dorme.",
    category: "espaço",
    aliases: { brilho: 20, universo: 16, constelação: 12, luz: 10, noite: 8, astro: 5, estrela: 1 },
  },
  {
    word: "sonho",
    prompt: "O lugar onde a mente vai quando o corpo descansa.",
    category: "ideias",
    aliases: { sono: 20, mente: 16, imaginação: 12, noite: 10, inconsciente: 7, pesadelo: 5, sonho: 1 },
  },
  {
    word: "jardim",
    prompt: "Um espaço cultivado com cuidado e paciência.",
    category: "natureza",
    aliases: { flor: 20, planta: 16, terra: 12, cultivo: 10, paisagem: 7, horta: 5, jardim: 1 },
  },
  {
    word: "espada",
    prompt: "Uma lâmina que decide batalhas e histórias.",
    category: "aventura",
    aliases: { batalha: 20, lâmina: 16, guerreiro: 12, duelo: 10, cavalheiro: 8, metal: 5, espada: 1 },
  },
  {
    word: "trem",
    prompt: "Um viajante de trilhos que conecta cidades.",
    category: "lugares",
    aliases: { vagão: 20, trilho: 16, estação: 12, viagem: 10, locomotiva: 7, passageiro: 5, trem: 1 },
  },
  {
    word: "bússola",
    prompt: "Um instrumento que nunca perde o norte.",
    category: "objetos",
    aliases: { norte: 20, direção: 16, navegação: 12, orientação: 10, mapa: 8, explorador: 5, bússola: 1 },
  },
  {
    word: "poema",
    prompt: "Uma ideia que prefere contar menos para dizer mais.",
    category: "arte",
    aliases: { verso: 20, rima: 16, palavra: 12, lirismo: 10, literatura: 7, estrofe: 5, poema: 1 },
  },
  {
    word: "robô",
    prompt: "Uma criação que imita o que fazemos sem sentir o que sentimos.",
    category: "fantasia",
    aliases: { máquina: 20, inteligência: 16, autômato: 12, tecnologia: 10, androide: 7, mecânico: 5, robô: 1 },
  },
  {
    word: "chuva",
    prompt: "A forma da nuvem de devolver o que tomou emprestado.",
    category: "natureza",
    aliases: { água: 20, nuvem: 16, temporal: 12, pingo: 10, frio: 8, molhado: 5, chuva: 1 },
  },
  {
    word: "mapa",
    prompt: "Um desenho que ensina o caminho sem andar junto.",
    category: "aventura",
    aliases: { rota: 20, caminho: 16, território: 12, navegação: 10, cartografia: 7, bússola: 5, mapa: 1 },
  },
  {
    word: "castelo",
    prompt: "Uma fortaleza que conta histórias por seus muros.",
    category: "cultura",
    aliases: { rei: 20, torre: 16, medieval: 12, fortaleza: 10, muralha: 7, reino: 5, castelo: 1 },
  },
  {
    word: "silêncio",
    prompt: "A pausa que diz mais do que qualquer som.",
    category: "ideias",
    aliases: { quietude: 18, pausa: 15, paz: 12, calma: 10, vazio: 7, ausência: 5, silêncio: 1 },
  },
  {
    word: "tsunami",
    prompt: "Uma onda que carrega o peso de todo o oceano.",
    category: "natureza",
    aliases: { onda: 20, maremoto: 14, destruição: 12, oceano: 10, força: 8, inundação: 5, tsunami: 1 },
  },
  {
    word: "herói",
    prompt: "Alguém que escolhe o difícil quando ninguém pede.",
    category: "anime",
    aliases: { coragem: 20, protetor: 16, batalha: 12, sacrifício: 10, poder: 8, luta: 5, herói: 1 },
  },
  {
    word: "pintura",
    prompt: "Cores organizadas para contar o que as palavras não alcançam.",
    category: "arte",
    aliases: { tela: 20, pincel: 16, cor: 12, artista: 10, quadro: 7, retrato: 5, pintura: 1 },
  },
  {
    word: "deserto",
    prompt: "Um lugar onde o sol manda mais do que a água.",
    category: "natureza",
    aliases: { areia: 20, calor: 16, seco: 12, oásis: 10, duna: 7, saara: 5, deserto: 1 },
  },
  {
    word: "ilha",
    prompt: "Um pedaço de terra que aprendeu a se bastar.",
    category: "lugares",
    aliases: { mar: 20, isolamento: 16, paraíso: 12, costa: 10, areia: 7, arquipélago: 5, ilha: 1 },
  },
];

/** Static theme challenges that don't rotate — always available to play */
export const THEME_CATALOG: (WordEntry & { id: string; label: string; description: string; accent: string })[] = [
  {
    id: "theme-anime",
    label: "Anime",
    description: "Clássicos, shōnen e mundos fantásticos",
    accent: "lavender",
    word: "poder",
    prompt: "Algo que todo protagonista tenta dominar em sua jornada.",
    category: "anime",
    aliases: { luta: 26, treino: 19, força: 14, energia: 11, chakra: 6, poder: 1 },
  },
  {
    id: "theme-movies",
    label: "Filmes",
    description: "Do primeiro corte ao último frame",
    accent: "gold",
    word: "roteiro",
    prompt: "O que dá forma à história antes da filmagem começar.",
    category: "filmes",
    aliases: { cinema: 22, diretor: 18, cena: 14, história: 12, personagem: 9, roteiro: 1 },
  },
  {
    id: "theme-places",
    label: "Lugares",
    description: "Mapas para sair sem fazer as malas",
    accent: "blue",
    word: "praia",
    prompt: "Um lugar onde o horizonte parece não ter fim.",
    category: "lugares",
    aliases: { férias: 30, viagem: 24, areia: 15, mar: 7, oceano: 5, praia: 1 },
  },
  {
    id: "theme-food",
    label: "Comidas",
    description: "Pequenas pistas, grandes vontades",
    accent: "mint",
    word: "chocolate",
    prompt: "Um doce que melhora qualquer intervalo do dia.",
    category: "comidas",
    aliases: { sobremesa: 24, doce: 17, cacau: 9, barra: 6, chocolate: 1 },
  },
];
