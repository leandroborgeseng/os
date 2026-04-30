# Sistema de Vistorias e Chamados

Aplicacao fullstack com React, Vite, Express, Prisma e PostgreSQL.

## Desenvolvimento local

1. Instale as dependencias:

```bash
npm install
```

2. Configure o banco em `.env`:

```bash
DATABASE_URL="postgresql://usuario:senha@localhost:5432/os?schema=public"
```

3. Aplique as migrations:

```bash
npm run prisma:migrate:deploy
```

4. Inicie a aplicacao:

```bash
npm run dev
```

O Vite abre o front-end e encaminha chamadas `/api` para o servidor Express.

## Deploy no Railway

1. Suba este projeto para um repositorio no GitHub.
2. No Railway, crie um novo projeto a partir do repositorio.
3. Adicione um banco PostgreSQL ao projeto.
4. Configure a variavel `DATABASE_URL` usando a URL do PostgreSQL do Railway.
5. O Railway usara `railway.json` para executar:
   - build: `npm run build`
   - start: `npm run railway:start`

Na primeira inicializacao, o comando de start aplica as migrations e inicia o servidor.

## Documentacao do produto

| Recurso | Descricao |
|---------|-----------|
| [**CHANGELOG.md**](CHANGELOG.md) | Notas de versao (historico de entregas). |
| [**docs/MANUAL.md**](docs/MANUAL.md) | Manual das funcionalidades para gestores, fiscais, equipes e uso do portal cidadao. |
| [**docs/ITERACOES.md**](docs/ITERACOES.md) | Checklist para atualizar changelog e manual a cada iteracao. |

Versao atual do pacote: ver campo `version` em `package.json` (alinhar com o CHANGELOG ao fechar releases).

### Endpoints utilitarios da API

- `GET /api/health` — verificacao de disponibilidade.
- `GET /api/app-data` — estado completo da aplicacao (autenticacao nao implementada no MVP).
- `PUT /api/app-data` — gravacao do estado (usado pelo front com debounce).
- `POST /api/app-data/reset` — restaura dados para o seed inicial do servidor (use com cuidado em producao).

O projeto partiu do template oficial React + TypeScript + Vite; detalhes genericos de ESLint e plugins estao na [documentacao do Vite](https://vite.dev/).
