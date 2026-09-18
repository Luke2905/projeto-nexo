# Nexo — evolução do jogo

Registro da conversa de 18/09/2026. As ideias abaixo estão guardadas para orientar o produto; este documento não significa que estejam implementadas.

## Prioridade escolhida pelo usuário: NexoMap

Criar uma tela pessoal em que o jogador acompanhe uma trilha de conquistas, seus objetivos, emblemas e ranking. O nome indicado pelo usuário é **NexoMap**.

O usuário acrescentou duas prioridades: acompanhar a evolução dos amigos e dar ao jogador mais gestão sobre o próprio perfil. Enviou o projeto Keeplay como referência de lógica, com a orientação explícita de criar algo semelhante, **não igual**. A adaptação está detalhada em [NEXOMAP.md](NEXOMAP.md).

A intenção é tornar visível a evolução do jogador e apresentar um próximo objetivo concreto. Esta prioridade vem antes das outras ideias do backlog; a ordem sugerida anteriormente pelo assistente não substitui a escolha do usuário.

### Proposta para a primeira versão

Os detalhes desta seção são sugestões de produto, ainda sujeitos a refinamento.

- **Identidade:** avatar, nome, título e emblema em destaque.
- **Trilha:** marcos conectados, com estados concluído, em andamento e bloqueado. No celular, usar uma trilha vertical legível.
- **Próximo objetivo:** destacar o que falta para a próxima conquista, por exemplo, “Resolva mais 2 desafios para conquistar Explorador”.
- **Detalhe da conquista:** mostrar descrição, regra, progresso numérico, recompensa e data de desbloqueio.
- **Coleção de emblemas:** exibir os conquistados e permitir escolher um para destacar no perfil.
- **Ranking:** mostrar a posição do jogador e o critério de classificação; começar aproveitando os desafios resolvidos, com desempate explícito. Competição semanal e entre amigos pode vir depois.
- **Entrada:** acesso pelo perfil e pela navegação do jogo; um jogador novo deve ver por onde começar.
- **Amigos:** visitar o NexoMap dos amigos e acompanhar seus marcos, conquistas e evolução ao longo do tempo, respeitando a visibilidade escolhida por cada jogador.
- **Gestão do perfil:** ampliar a edição de identidade, a escolha de emblemas e títulos, as preferências de visibilidade e os controles de conta.

### Exemplo de trilha inicial

| Marco | Objetivo proposto | Emblema proposto |
| --- | --- | --- |
| Primeiro nexo | Resolver o primeiro desafio | Faísca |
| Explorador | Resolver 5 desafios distintos | Bússola |
| No alvo | Resolver um desafio em até 5 palpites | Mira |
| Constância | Resolver o diário do dia em 3 dias consecutivos | Chama |
| Cartógrafo | Resolver 10 desafios distintos | Mapa |

Os nomes e números são exemplos, não definições finais. Conquistas de habilidade podem ser objetivos paralelos, evitando que um marco difícil bloqueie toda a evolução. Conquistas sem dicas dependem primeiro de registrar o uso de dicas.

### Regras para a progressão ter valor

- Cada conquista deve usar sua própria condição, com progresso real e desbloqueio persistente.
- Resolver novamente o mesmo desafio não deve gerar recompensas duplicadas.
- Recomeços não devem permitir apagar tentativas para obter artificialmente uma conquista de eficiência.
- Diferenciar a data em que o jogador jogou da data do desafio de arquivo; concluir vários dias antigos de uma vez não constitui sequência diária.
- Definir o fuso usado na sequência e explicar a virada do dia. Hoje o desafio muda à meia-noite UTC.
- Calcular conquistas e classificação a partir de resultados validados no servidor. A rota atual de salvamento recebe contadores e estado de conclusão do cliente; precisa ser revista antes de sustentar uma competição confiável.
- Recompensas iniciais são visuais: emblemas, títulos e apresentação do perfil. Não alteram as chances de resolver a palavra.
- Mostrar estados vazios, carregamento e erro sem preencher estatísticas com valores fictícios.

### Pontos existentes a aproveitar e corrigir

- `client/src/pages/Profile.tsx` já apresenta XP, nível e conquistas. A sequência está fixa em zero e os desbloqueios usam apenas a quantidade de partidas resolvidas, mesmo quando a descrição exige outra regra.
- `client/src/pages/Friends.tsx` e `server/db/social.ts` fornecem uma base de ranking por total de desafios resolvidos. A tela ainda contém indicadores estáticos, como sequência e código de convite.
- `server/db/games.ts` e `drizzle/schema.ts` são a base para avaliar histórico, persistência e dados adicionais necessários.
- Preservar o jogo diário, os desafios antigos e os temas visuais existentes.

## Ideias guardadas para próximas etapas

### 1. Proximidade coerente

Ampliar relações semânticas revisadas e substituir a aproximação por letras do fallback em `server/game/engine.ts`. Hoje, palpites sem relação cadastrada podem receber proximidade que não representa significado. A dificuldade deve permitir raciocínio consistente.

### 2. Modo desafio

Manter o modo livre e acrescentar um modo com tentativas limitadas. Hipótese inicial: 15 palpites e até 2 dicas, a calibrar com partidas reais. Pontuação por eficiência e uso de dicas, com classificação separada do modo livre.

### 3. Dicas progressivas

Trocar a única frase genérica de categoria por pistas específicas da resposta em três níveis: contexto amplo, associação próxima e característica reveladora. Pedir dicas reduz a pontuação no modo competitivo. A quantidade disponível depende das regras de cada modo.

### 4. Jornadas temáticas

Evoluir os temas, hoje com uma resposta fixa por tema, para sequências de palavras de dificuldade crescente. Exemplo: cinco etapas de Comidas com medalha de conclusão. Oferecer continuidade após o diário e integrar o avanço ao NexoMap.

### 5. Conquistas e sequência reais

Registrar objetivos de habilidade, constância e exploração com critérios próprios. Exemplos: resolver sem dicas, acertar em até cinco palpites e completar três diários consecutivos. Recompensar com títulos e molduras. Esta ideia passa a fazer parte da prioridade NexoMap.

### 6. Disputas e compartilhamento

Criar desafios por link com a mesma palavra e as mesmas regras para todos. Compartilhar o resultado sem revelar a resposta: identificador do desafio, tentativas, dicas e uma sequência visual de proximidade. Evoluir a competição entre amigos após a base de resultados confiáveis.

## Estado deste registro

A primeira versão do NexoMap foi implementada, incluindo mapa de aventura, conquistas, perfil, amigos e ranking. Veja NEXOMAP.md para detalhes e BANCO_NEXOMAP.md para as instruções da migração. Em 18/09/2026, o usuário informou que já atualizou o SQL; a publicação do código permanece pendente. As demais ideias deste backlog continuam planejadas.
