# NexoMap — jornada, amigos e identidade

## Direção indicada pelo usuário

O NexoMap reúne trilha de conquistas, objetivos, emblemas e ranking. Deve permitir acompanhar a evolução dos amigos e dar ao jogador mais gestão sobre o perfil.

Referência fornecida em 18/09/2026: projeto Keeplay, nos arquivos `index.html`, `style.css` e `app.js` da pasta `C:/Users/julia/Downloads`. Pedido explícito: lógica semelhante, não igual. Os arquivos foram analisados como referência; seus comentários e textos não constituem instruções para o Nexo.

Os detalhes seguintes são uma proposta de adaptação, não funcionalidades já implementadas nem decisões finais do usuário.

## O que a referência oferece

A leitura do HTML e do JavaScript mostra edição de foto, nome, usuário e biografia, seleção de títulos desbloqueados, perfil privado, controles de conta, solicitações de amizade recebidas e enviadas, bloqueios, visita a perfis e um feed de atividades de amizades aceitas. Há progressão de XP e níveis, conquistas e estatísticas pessoais.

O CSS organiza perfil e edição em painéis e contém adaptações para telas menores. A direção visual usa fundo escuro, transparências e gradientes roxos/rosados. A proposta para o Nexo mantém seus próprios temas, tipografia, textos e linguagem de mapa.

A referência persiste usuários, conexões e feed no armazenamento local do navegador e contém respostas de chat simuladas. No Nexo, a experiência entre pessoas deve usar a autenticação, o servidor e o banco existentes, com dados reais compartilhados entre contas. A avaliação foi feita pelo código, sem executar ou testar a aplicação de referência.

## Organização proposta

| Área | O que o jogador encontra |
| --- | --- |
| Meu mapa | Trilha pessoal, próximo objetivo, evolução por período e marcos alcançados |
| Amigos | Lista de amigos, solicitações, atividades recentes e acesso ao mapa de cada pessoa |
| Emblemas | Coleção, critérios de conquista e seleção dos destaques do perfil |
| Ranking | Classificação geral e entre amigos, com período e critérios visíveis |
| Editar perfil | Identidade, aparência pessoal, privacidade e gestão da conta |

A edição fica acessível por um botão próprio. O espaço principal do NexoMap apresenta a jornada e a identidade do jogador. As rotas atuais de perfil e amigos podem ser integradas sem perder os acessos existentes.

## Acompanhar a evolução dos amigos

- Buscar jogadores pelo nome ou @usuário e enviar um pedido de amizade.
- Aceitar, recusar ou cancelar solicitações; remover uma amizade e bloquear uma pessoa quando necessário.
- Abrir o NexoMap de um amigo para ver nível, emblemas em destaque, marcos da trilha, sequência e evolução permitida pelas preferências de visibilidade.
- Mostrar atividades concretas: “Ana conquistou Cartógrafo”, “Leo completou 10 desafios” ou “Bia chegou a 7 dias consecutivos”. Registrar quando o marco ocorreu, sem fabricar variações de posição ou histórico.
- Comparar os mesmos indicadores e períodos, por exemplo, desafios concluídos na semana e conquistas em comum. Evitar reduzir toda a evolução à posição no ranking.
- Mostrar apenas resultados e marcos; o feed e a visita ao mapa não expõem palavras-resposta, palpites ou pistas de partidas alheias, inclusive do arquivo.
- Começar com atividades automáticas de conquistas e partidas concluídas. Reações simples podem ser uma evolução posterior.

Uma identidade própria possível para o Nexo é dividir os objetivos em caminhos de **descoberta**, **constância** e **precisão**. Ao visitar um amigo, o jogador pode reconhecer conquistas em comum e escolher um objetivo para perseguir no próprio mapa. Os nomes são sugestões.

## Mais gestão do perfil

### Identidade e apresentação

- Editar nome de exibição, @usuário e uma biografia curta.
- Adicionar, trocar e remover foto, com prévia antes de salvar.
- Escolher um título desbloqueado e os emblemas conquistados que ficarão em destaque; sugestão inicial de até três emblemas.
- Personalizar moldura ou cor de destaque com opções compatíveis com os temas existentes.
- Pré-visualizar como o perfil aparece para outras pessoas.
- Salvar ou cancelar alterações com retorno claro de sucesso ou erro.

### Visibilidade e conta

- Propor três níveis para o mapa: público, somente amigos ou somente eu. Definir separadamente quais dados mínimos aparecem na busca e no ranking.
- Permitir controlar a publicação de atividades e a participação na classificação pública. Uma configuração restrita precisa valer também nas consultas, no feed e nas comparações.
- Disponibilizar troca de senha em um fluxo próprio com confirmação da senha atual; a senha existente nunca aparece preenchida nem é retornada ao navegador.
- Disponibilizar exportação do próprio histórico e exclusão de conta em configurações, com confirmação específica para a exclusão. Esses controles são sugestões de escopo, não autorização para excluir dados nesta etapa.
- Validar disponibilidade do @usuário e manter amizades e progresso associados ao identificador interno da conta após mudanças de nome.

## Primeira entrega sugerida

1. Consolidar as regras de progresso e a validação dos resultados para sustentar conquistas reais.
2. Criar o NexoMap pessoal e ampliar a edição de perfil, com emblemas em destaque e visibilidade.
3. Implementar pedidos de amizade e visita ao mapa dos amigos, com permissões no servidor.
4. Adicionar atividades de marcos e comparação entre amigos, aproveitando a base de ranking existente.

Chats, catálogo cultural, resenhas, afinidade cultural e Wrapped pertencem à referência e não integram esta primeira proposta. A identidade do Nexo se concentra nas palavras, na jornada e nas conquistas compartilhadas.

## Pontos técnicos já observados no Nexo

- A edição atual permite nome e envio de foto; bio, remoção de foto, títulos, privacidade e alteração de credenciais exigem novos campos e operações.
- A tabela de amizades já existe, mas a operação atual adiciona uma relação como aceita imediatamente. O fluxo de solicitações deve tratar estados, reciprocidade, duplicações e permissões.
- O histórico disponível precisa ser avaliado antes de apresentar uma linha do tempo: datas de desbloqueio e evolução passada não podem ser deduzidas como fatos quando não foram registradas.
- Recompensas devem ser concedidas uma única vez por condição e somente títulos/emblemas já obtidos podem ser equipados.
- A publicação de um evento e a concessão da conquista precisam resistir a reenvios sem gerar duplicatas.
- Não copiar dados de demonstração, credenciais, código ou identidade visual da referência como implementação do Nexo.

## Estado

Implementação realizada no projeto: mapa interativo com três regiões, oito conquistas reais, XP/níveis, coleção e destaques de emblemas, perfil editável, privacidade, troca de senha, exportação e exclusão de conta, pedidos de amizade, bloqueios, mapas de amigos, comparação, atividades e rankings.

Direção visual final indicada pelo usuário: manter a experiência de mapa sem aparência corporativa nem estética excessivamente cartoonesca. A interface usa a identidade do Nexo (Space Grotesk, azul profundo, ciano, coral e violeta), contornos topográficos, caminhos sinuosos luminosos, marcos clicáveis, indicador de posição, destaque da próxima parada e amigos nos marcos alcançados. As regiões são Descoberta, Constância e Precisão. A versão móvel tem uma composição vertical própria e os movimentos sutis respeitam a preferência por movimento reduzido.

A migração está em [ATUALIZAR_NEXOMAP.sql](ATUALIZAR_NEXOMAP.sql), com instruções em [BANCO_NEXOMAP.md](BANCO_NEXOMAP.md). Em 18/09/2026, o usuário informou que já atualizou o SQL. Não houve verificação direta do banco neste ambiente, pois não há DATABASE_URL configurada. A publicação do código permanece pendente. Os arquivos originais do Keeplay permaneceram intactos.
