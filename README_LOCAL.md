# NEXO — execução local

Este projeto é uma aplicação React + Express + tRPC com banco MySQL/TiDB, autenticação local por usuário e senha, progresso persistente, ranking, upload de avatar e migrações Drizzle.

## Requisitos

- Node.js 20 ou superior (Node.js 22 recomendado)
- npm 10 ou superior
- MySQL 8+, MariaDB compatível ou TiDB
- Git, opcionalmente

## 1. Instalar dependências

Na pasta raiz do projeto:

```bash
npm install
```

## 2. Criar o banco

Crie um banco vazio e um usuário com permissão para criar e alterar tabelas. Exemplo no MySQL:

```sql
CREATE DATABASE nexo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'nexo_app'@'localhost' IDENTIFIED BY 'troque-esta-senha';
GRANT ALL PRIVILEGES ON nexo.* TO 'nexo_app'@'localhost';
FLUSH PRIVILEGES;
```

A string de conexão deve seguir este formato:

```text
mysql://nexo_app:troque-esta-senha@127.0.0.1:3306/nexo
```

## 3. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz. Nunca publique esse arquivo nem coloque suas chaves em um repositório.

```env
NODE_ENV=development
DATABASE_URL=mysql://nexo_app:troque-esta-senha@127.0.0.1:3306/nexo
JWT_SECRET=gere-uma-chave-aleatoria-com-pelo-menos-32-caracteres

# Necessário para upload de fotos no storage Manus.
# Sem essas variáveis, o jogo e o login local funcionam,
# mas o upload de avatar não terá onde salvar a imagem.
BUILT_IN_FORGE_API_URL=https://seu-endpoint-de-storage
BUILT_IN_FORGE_API_KEY=sua-chave-de-storage

# O login local não depende de OAuth. Estes campos só são necessários
# se você também quiser manter o fluxo OAuth do template.
VITE_APP_ID=
OAUTH_SERVER_URL=
OWNER_OPEN_ID=
```

Para gerar um segredo local:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 4. Criar as tabelas e aplicar migrações

Com `DATABASE_URL` configurado, execute:

```bash
npm run db:push
```

Esse comando gera uma nova migração Drizzle e aplica as migrações ao banco. As migrações já existentes ficam em `drizzle/*.sql` e incluem usuários, partidas, progresso em andamento, avatar, status perdido e contador de recomeços.

Se quiser aplicar uma migração já gerada manualmente:

```bash
npx drizzle-kit migrate
```

Não execute novamente no mesmo banco uma migração que já foi aplicada.

## 5. Iniciar em desenvolvimento

```bash
npm run dev
```

Abra `http://localhost:3000` no navegador. O servidor Express serve a API tRPC e o frontend Vite no mesmo endereço.

## 6. Criar uma conta

Abra `/cadastro`, escolha **criar conta** e informe:

- Nome de exibição com 2 a 80 caracteres.
- Usuário com 3 a 32 caracteres, usando letras, números, ponto, hífen ou sublinhado.
- Senha com 8 a 128 caracteres.

As senhas não são armazenadas em texto puro: o backend usa scrypt com salt aleatório. O login possui limite de tentativas para reduzir ataques de força bruta.

## 7. Testar e gerar produção

Verificação de tipos:

```bash
npm run check
```

Testes automatizados:

```bash
npm run test
```

Build de produção:

```bash
npm run build
```

Executar o build:

```bash
npm run start
```

## 8. Foto de perfil

A edição do perfil aceita JPG, PNG e WEBP de até 2 MB. Para salvar a foto localmente, as variáveis `BUILT_IN_FORGE_API_URL` e `BUILT_IN_FORGE_API_KEY` precisam apontar para um storage compatível com o helper `server/storage.ts`.

Se você não tiver um endpoint de storage Manus no ambiente local, a autenticação, o jogo e o banco continuarão funcionando; apenas o upload de avatar deverá ser desativado ou substituído por um storage S3 compatível.

## Estrutura principal

```text
client/src/              frontend React
server/                  API Express/tRPC e autenticação
server/localAuth.ts      hash e verificação scrypt
drizzle/schema.ts       schema do banco
drizzle/*.sql            migrações SQL
server/storage.ts        upload de arquivos
README_LOCAL.md          este guia
```

## Solução de problemas

### `DATABASE_URL is required`

O comando Drizzle não encontrou `DATABASE_URL`. Verifique se o arquivo `.env` está na raiz e se o processo foi iniciado a partir da raiz do projeto.

### Erro de conexão com MySQL

Confirme se o serviço está rodando, se a porta está correta e se o usuário tem permissão no banco `nexo`. Teste a conexão com:

```bash
mysql -h 127.0.0.1 -u nexo_app -p nexo
```

### `JWT_SECRET` vazio

Defina uma chave forte no `.env`. Não use a mesma chave em produção e desenvolvimento.

### Upload de foto falha

Verifique as duas variáveis `BUILT_IN_FORGE_API_*`, o tamanho máximo de 2 MB e o formato JPG, PNG ou WEBP. O helper de storage não grava bytes de imagem no banco; ele salva a imagem no storage e registra somente a URL no usuário.

### Porta 3000 ocupada

Encerre o processo que está usando a porta ou altere a configuração do servidor antes de iniciar. Evite executar dois servidores do projeto ao mesmo tempo.
