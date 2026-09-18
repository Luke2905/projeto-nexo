# Game Plan: Contexto Temas

## Prioridade atual — 18/09/2026

**NexoMap:** tela pessoal com trilha de conquistas, objetivos, emblemas e ranking, conforme direção indicada pelo usuário. Ver [ROADMAP.md](ROADMAP.md) para o escopo proposto, regras a definir e backlog completo. A primeira implementação do NexoMap está concluída no código. Em 18/09/2026, o usuário informou que já atualizou o SQL; a publicação do código permanece pendente. As seções abaixo preservam o plano histórico da primeira versão.

O escopo de produto inclui acompanhar a evolução dos amigos e ampliar a gestão do perfil. Ver [NEXOMAP.md](NEXOMAP.md) para a adaptação da referência Keeplay, com identidade própria do Nexo.

## Risk Tasks

### 1. Proximidade semântica simulada no cliente
- **Why isolated:** a primeira versão precisa comunicar a sensação de ranking sem uma API semântica externa nem banco de palavras.
- **Approach:** usar um dicionário pequeno e determinístico por modo/desafio, com fallback heurístico para entradas novas; ordenar palpites por ranking e representar o resultado por uma escala visual de proximidade.
- **Verify:** enviar uma palavra conhecida move o ranking, palavras repetidas são rejeitadas e acertar a solução muda o estado para resolvido sem perder o histórico.

## Main Build

Construir um jogo de palavras em português, inspirado no fluxo de Contexto: escolher entre o desafio diário ou um tema, digitar palpites, receber ranking de proximidade, acompanhar tentativas e trocar de desafio sem recarregar a página.

- **Assets needed:** textura editorial de fundo com constelações e curvas topográficas, usada como ambientação visual sem competir com a área central de leitura.
- **Verify:**
  - A interface deixa claro qual modo está ativo e qual tema está selecionado.
  - O campo aceita foco por teclado, Enter envia o palpite e a lista é atualizada em ordem de proximidade.
  - Ranking, barra de calor, tentativa e mensagem de estado permanecem legíveis em desktop e mobile.
  - Palavras repetidas recebem feedback; solução mostra estado concluído e botão de próximo desafio.
  - Não há overflow, clipping, assets ausentes ou console errors durante o uso.
  - A textura de fundo e a paleta navy/parchment/coral mantêm coerência com a direção visual.
  - O modo diário e pelo menos quatro desafios temáticos funcionam no mesmo shell.
