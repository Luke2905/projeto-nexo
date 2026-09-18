# Documentação: Projeto Nexo

Este documento detalha a estrutura interna do projeto, as alterações de arquitetura recentes e como inicializar os serviços, complementando o `README_LOCAL.md`.

## Estrutura de Diretórios Atualizada

A arquitetura do projeto segue o modelo Client/Server, mas com uma estrutura modular no backend.

```text
projeto_nexo/
├── client/                 # Frontend React (Vite)
├── server/                 # Backend Node.js com Express e tRPC
│   ├── _core/              # Funcionalidades base do sistema (trpc, cookies, sdk)
│   ├── db/                 # Camada de Acesso a Dados (Repositórios)
│   │   ├── connection.ts   # Conexão com o banco via Drizzle ORM
│   │   ├── users.ts        # Operações de usuários e perfis
│   │   ├── games.ts        # Operações de progresso em desafios
│   │   ├── social.ts       # Operações de leaderboard e amizades
│   │   └── index.ts        # Agregador de exportação
│   ├── localAuth.ts        # Utilitários de criptografia (scrypt) para login local
│   ├── routers.ts          # Definição das rotas e procedimentos tRPC da API
│   ├── storage.ts          # Lógica para upload de avatares
│   └── index.ts            # Ponto de entrada do servidor e inicialização
├── shared/                 # Tipos e utilitários compartilhados entre Client e Server
├── drizzle/                # Arquivos de migração gerados pelo Drizzle Kit
├── database.sql            # Script unificado para criação do banco de dados e tabelas
├── package.json            # Scripts de build e dependências
└── README_LOCAL.md         # Instruções de execução originais
```

## Separação do Banco de Dados

O banco de dados foi completamente desacoplado em duas frentes:
1. **Script Independente:** O arquivo raiz `database.sql` foi criado contendo os comandos SQL DDL de criação (Tabelas: `users`, `game_sessions` e `friendships`). Isso facilita inicializar o banco sem depender do Drizzle Kit diretamente, ideal para ambientes de homologação.
2. **Repositórios:** Toda a lógica de consultas e mutações (Queries/Mutations) que antes residia em um arquivo massivo (`server/db.ts`) foi fragmentada na pasta `server/db/` separada por domínio (usuários, jogos, social e conexão).

## Decisões de Autenticação e Segurança

A API faz uso do pacote nativo `node:crypto` com a função `scrypt` para garantir a segurança no hashing de senhas. Nenhuma senha trafega livre e são verificadas via "Timing Safe Equal" contra ataques de side-channel. O controle de tráfego (Rate Limiting) na rota de login também bloqueia excesso de requisições, preservando a disponibilidade do sistema.

## API / tRPC

A comunicação client-server é inteiramente tipada usando `tRPC`. Os métodos estão subdivididos nos seguintes routers:
- `auth`: Registro, login, logout, atualização de perfil (com avatar)
- `games`: Consulta de histórico, salvamento de sessões, reset de tentativas (retry), e abandono
- `leaderboard`: Rankeamento geral e gerenciamento de lista de amigos

## Execução Rápida do Banco

Para quem possui o MySQL/MariaDB configurado localmente:
1. Abra um terminal apontando para o seu banco;
2. Execute o script `database.sql`: `mysql -u root -p < database.sql`;
3. Configure a URL gerada no `.env`.
