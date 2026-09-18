# Memory

A primeira versão é propositalmente jogável sem backend: o ranking é uma simulação determinística por desafio, suficiente para validar o loop e a direção visual antes de conectar um motor semântico ou uma base maior de palavras.

O template static já tinha Tailwind 4 e componentes shadcn. A página usa classes utilitárias e CSS de composição para manter a interface leve. Foi gerado um asset de textura editorial com constelações e curvas topográficas e enviado ao storage privado do WebDev.

Próximos incrementos naturais: persistir partidas e estatísticas, adicionar criação de desafios por painel administrativo, ampliar dicionário, introduzir busca por palavras válidas e substituir o fallback heurístico por embeddings/server-side.
