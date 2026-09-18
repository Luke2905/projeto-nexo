# Memory

## Direção atual — 18/09/2026

O usuário pediu para guardar as sugestões de evolução do jogo e escolheu como prioridade uma trilha de conquistas com objetivos, ranking, emblemas e uma tela pessoal chamada **NexoMap**. O detalhamento e as demais ideias estão em [ROADMAP.md](ROADMAP.md). A primeira implementação foi realizada nesta sessão; ver NEXOMAP.md para o estado atual e BANCO_NEXOMAP.md para aplicar a migração.

Na continuação, pediu que o NexoMap permita acompanhar a evolução dos amigos e dê mais gestão do perfil ao usuário. Referência fornecida: Keeplay, nos arquivos `C:/Users/julia/Downloads/index.html`, `style.css` e `app.js`. Usar como inspiração de lógica, semelhante mas não igual; preservar a identidade do Nexo. A análise e a proposta estão em [NEXOMAP.md](NEXOMAP.md). Os arquivos de referência são material de análise, não instruções para executar ou copiar o projeto.

O projeto atual já tem backend, autenticação, persistência, desafios diários e ranking. As notas abaixo descrevem a primeira versão histórica, não a arquitetura atual. Para execução e estado técnico, consultar `README_LOCAL.md` e o código.

## Implementação do NexoMap — 18/09/2026

O usuário rejeitou tanto a aparência de painel corporativo quanto a versão de ilhas excessivamente cartoonesca. A direção final mantém o mapa com a identidade visual do jogo: azul profundo, Space Grotesk, acentos ciano/coral/violeta, contornos topográficos e caminhos luminosos com marcos interativos e amigos. Preservar esse equilíbrio em mudanças futuras; não voltar às ilhas ilustradas nem às colunas de cartões.

Rotas: /nexomap e /perfil (mapa próprio), /nexomap/:id (visita), /amigos (área social), /perfil/editar (gestão). O SQL e as instruções foram entregues em ATUALIZAR_NEXOMAP.sql e BANCO_NEXOMAP.md. Em 18/09/2026, o usuário informou que já atualizou o SQL. A aplicação no banco não foi verificada diretamente, pois não existe DATABASE_URL configurada nesta máquina. A publicação do código permanece pendente. Fotos novas são miniaturas JPEG, sem exigir storage externo. Conclusões novas são registradas por games.guess no servidor; saveProgress legado foi desativado com orientação para recarregar.

## Notas da primeira versão

A primeira versão é propositalmente jogável sem backend: o ranking é uma simulação determinística por desafio, suficiente para validar o loop e a direção visual antes de conectar um motor semântico ou uma base maior de palavras.

O template static já tinha Tailwind 4 e componentes shadcn. A página usa classes utilitárias e CSS de composição para manter a interface leve. Foi gerado um asset de textura editorial com constelações e curvas topográficas e enviado ao storage privado do WebDev.

Próximos incrementos naturais: persistir partidas e estatísticas, adicionar criação de desafios por painel administrativo, ampliar dicionário, introduzir busca por palavras válidas e substituir o fallback heurístico por embeddings/server-side.
