# Game Plan: Contexto Temas

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
