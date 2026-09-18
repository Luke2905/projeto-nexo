# Aplicar o NexoMap no banco

Use **ATUALIZAR_NEXOMAP.sql** para atualizar o banco existente. O arquivo adiciona três tabelas e três colunas, preservando usuários, partidas e amizades.

## Aplicação manual pelo editor SQL

1. Faça um backup e selecione o banco usado pelo Nexo. O arquivo não fixa um nome de banco.
2. Confira que existem as tabelas `users`, `game_sessions` e `friendships`. A estrutura anterior de `game_sessions` deve incluir `lost`, `retryCount` e `progressJson` (versão 0004).
3. Execute [ATUALIZAR_NEXOMAP.sql](ATUALIZAR_NEXOMAP.sql) **uma única vez**, na ordem. Se houver erro, pare antes de registrar a migração e verifique o comando que falhou; não continue ignorando erros.
4. As consultas finais devem listar três tabelas novas, três colunas novas e o registro da migração.
5. Publique o código atualizado somente depois de concluir o SQL.

O script registra a versão 0005 em `__drizzle_migrations`, usando o hash da migração do repositório. Isso evita repetição pelo Drizzle no próximo deploy. Esse registro pressupõe que as migrações anteriores já estão representadas na estrutura atual. Em MySQL, comandos DDL podem efetivar alterações imediatamente; um erro no meio exige conferir o que já foi aplicado antes de retomar.

## Alternativa: banco já gerenciado pelas migrações Drizzle

Com `DATABASE_URL` configurada, execute:

```bash
npx drizzle-kit migrate
```

Esse comando aplica [drizzle/0005_nexomap.sql](drizzle/0005_nexomap.sql) e registra a migração automaticamente. Escolha uma das formas: não execute o SQL manual depois de aplicar pelo Drizzle.

`database.sql` foi atualizado para instalações novas. Ele não é o script de atualização de um banco já existente.

## O que muda

- `nexo_profiles`: bio, título, emblemas destacados, cor, visibilidade, publicação de atividades e participação em ranking.
- `nexo_achievements`: conquistas persistentes, únicas por jogador e emblema.
- `nexo_blocks`: bloqueios entre contas.
- `game_sessions.verified`: identifica partidas registradas integralmente pelo novo fluxo do servidor.
- `game_sessions.totalGuesses`: mantém a contagem entre recomeços.
- `game_sessions.completedAt`: registra a data real de conclusão de novas partidas.

As partidas antigas recebem `verified = 0` e permanecem no histórico e na contagem de descobertas. Não se inventam datas, sequências ou marcas de precisão para essas partidas. Conquistas reconhecidas do histórico ficam com `unlockedAt = NULL`; novas conquistas têm a data real.

Perfis sem configuração começam visíveis apenas para amigos. Para aparecer no ranking geral, o jogador escolhe mapa público e mantém a participação em rankings ativada. Amizades antigas aceitas são preservadas; novos vínculos passam por solicitação.

## Publicação

A migração é aditiva e pode ser aplicada antes da troca do código. A nova versão passa a salvar cada palpite via `games.guess`; clientes antigos que chamam `games.saveProgress` recebem uma orientação para recarregar a página. A atualização não depende de cron, APIs externas ou um serviço novo de imagens: as fotos são reduzidas a miniaturas JPEG antes de salvar.

O SQL foi gerado a partir do schema Drizzle e conferido localmente. Em 18/09/2026, o usuário informou que já atualizou o SQL. Essa aplicação não foi verificada diretamente: este ambiente não possui `DATABASE_URL` configurada. O próximo passo é publicar o código atualizado; não repita a migração já aplicada.
