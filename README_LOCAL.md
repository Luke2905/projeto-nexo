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

## Deploy na Vercel

A função `api/index.mjs` importa `dist/api.mjs`, gerado por `npm run build:api`
a partir de `server/vercel.ts`. O esbuild resolve os imports TypeScript e os
aliases internos antes da execução em Node ESM. Não aponte a função diretamente
para os fontes TypeScript com imports sem extensão.

O `buildCommand` gera o frontend e o backend; `vercel-build` também permite ao
builder da função gerar seu artefato. Os plugins Manus só executam no servidor
de desenvolvimento.

Configure `DATABASE_URL` (MySQL acessível pela Vercel) e `JWT_SECRET` (pelo menos
32 caracteres) no ambiente Production e aplique as migrações do banco antes de
usar o cadastro. As credenciais ficam nas variáveis da Vercel, fora do Git.
Após alterar essas variáveis, faça um novo deploy. A API retorna um erro JSON
quando a configuração de autenticação estiver ausente ou inválida.

Validação antes de publicar:

```bash
npm run check
npm test
npm run build
npm run test:production
```

O último comando carrega o entrypoint real com Node, testa respostas HTTP JSON
e verifica a ausência dos scripts Manus no HTML. Não cria contas nem acessa o
banco. A validação de cadastro persistente exige um banco configurado.

### Espera pela conexão do TiDB

A inicialização usa um único pool por instância da função. Requisições
simultâneas compartilham a mesma promessa de conexão. Cada tentativa permite
20 segundos para conectar e 5 segundos para confirmar a disponibilidade com
`SELECT 1`. Uma falha transitória de conexão permite uma segunda tentativa,
após 1,5 segundo; o orçamento inicial é de aproximadamente 52 segundos.
A função da Vercel tem `maxDuration: 60` para acomodar essa espera.

Credenciais inválidas e erros de certificado não são repetidos. Gravações e
mutações de cadastro também não são repetidas automaticamente. Se a conexão
continuar indisponível, a API retorna `SERVICE_UNAVAILABLE` (HTTP 503), fecha o
pool que falhou e permite uma nova inicialização na próxima requisição.
O pool conectado é reutilizado, com até três conexões por instância.

Cadastro e login mantêm o formulário ocupado durante a requisição e exibem um
aviso após cinco segundos. Os testes de conexão simulam latência e falhas com
relógio controlado; não precisam de acesso ao TiDB de produção.

### TLS obrigatório no TiDB Cloud

Conexões para hosts `*.tidbcloud.com` habilitam TLS automaticamente, com
`rejectUnauthorized: true` e `verifyIdentity: true`. Isso evita a recusa
`Connections using insecure transport are prohibited` quando `DATABASE_URL`
não inclui o parâmetro SSL. Uma CA personalizada no objeto JSON `ssl` da URL
é preservada; a validação de certificado e hostname permanece habilitada.
Conexões MySQL de outros provedores mantêm suas opções originais na URL.

Referência: https://docs.pingcap.com/tidbcloud/connect-to-tidb-cluster-serverless/

### Validação de palavras em português brasileiro

Os palpites são verificados no servidor antes do cálculo de proximidade. Uma
palavra ausente do vocabulário retorna BAD_REQUEST com uma mensagem em português;
o formulário preserva o texto e não adiciona tentativa nem salva progresso.
Acentos e maiúsculas não diferenciam palavras: água/agua e céu/ceu são aceitos
como a mesma entrada, inclusive na prevenção de palpites repetidos.

A base é o VERO do LibreOffice, distribuído por dictionary-pt 4.0.0. O nspell
2.1.5 expande as regras de flexão durante o build, em lotes para limitar memória.
A lista gerada contém apenas palavras simples, normalizadas e comprimidas;
fica embutida no servidor, nunca no JavaScript do navegador. A função carrega
o vocabulário na primeira consulta e o reutiliza em memória. Não há chamadas
a APIs de dicionários nem consultas ao TiDB para validar palavras.

npm run build:lexicon gera server/game/generated/pt-br.ts (ignorado pelo Git).
Os comandos dev, check, test, build e build:api geram o arquivo automaticamente;
execuções seguintes usam o cache quando a fonte e o gerador não mudaram.
As dependências de geração devem estar instaladas no ambiente de build.

Para vocabulário específico dos temas, adicione apenas termos revisados em
EXTRA_WORDS, em server/game/lexicon.ts. Não autorize automaticamente todos os
aliases: eles também podem conter erros de escrita. A base pode conter palavras
raras ou nomes próprios e pode não cobrir neologismos. A validação ortográfica
não modifica o algoritmo de proximidade. Créditos e licença: licenses/dictionary-pt.txt
(original do pacote) e THIRD_PARTY_NOTICES.md.
