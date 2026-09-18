# Contexto Temas — Structure

A aplicação é uma experiência frontend-first, com um shell React em `client/src/pages/Home.tsx` e uma camada de dados determinística local para a primeira entrega. A UI mantém o estado de modo, desafio ativo, input, palpites e status de conclusão. A lógica de proximidade é encapsulada em funções puras na própria página por ser um jogo pequeno; uma futura evolução pode mover o motor para `client/src/game/semanticEngine.ts` e trocar o dicionário local por uma API protegida.

O catálogo é orientado a dados: cada desafio tem `id`, `kind`, `label`, `prompt`, `answer`, `accent`, `description` e um mapa de proximidade. O menu lateral troca o desafio sem mudar de rota. O diário usa a data visível como identidade e fica separado dos temas para permitir no futuro uma rotação real por data.

A apresentação usa três camadas: `app-shell` para a textura e navegação, `game-card` para o foco de jogo e uma coluna secundária para calor semântico, dicas e histórico. O visual privilegia navy profundo, papel envelhecido, coral para ações e amarelo açafrão para sinais de proximidade. O fundo gerado fica em `/manus-storage/contexto-desk-texture_76fdaec5.png`.

Acessibilidade básica: labels visíveis, foco no campo, botão de enviar com `aria-label`, feedback de estado com `aria-live`, navegação de desafios em botões e layout que colapsa para uma coluna em telas estreitas.
