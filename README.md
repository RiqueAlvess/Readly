# Readly 📚

Readly é um PWA social de acompanhamento de leitura com gamificação — XP, ranks,
sequências (streaks), conquistas, loja gacha, marketplace e campeonatos.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** (tema escuro neumórfico — Verde Sálvia + Rose Gold)
- **Supabase** (Auth + Postgres + RLS)
- **PWA** (manifest + service worker com cache offline e Background Sync)
- **Docker** (app + Postgres + migrações)

## Começando (desenvolvimento)

```bash
cp .env.example .env.local   # preencha as chaves do Supabase
npm install
npm run dev
```

Abra http://localhost:3000.

- Fora do PWA (navegador) você vê o **guia de instalação** (Android/iPhone).
- Instalado (standalone) o app vai direto para login/dashboard.

## Banco de dados

O schema completo está em `supabase/migrations/001_initial_schema.sql`
(tabelas, RLS, triggers de signup/contadores e dados de seed).

Aplique no seu projeto Supabase via SQL Editor, ou rode contra um Postgres local:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/readly npm run migrate
```

> O trigger `handle_new_user` cria automaticamente um `profiles` + `streaks`
> quando um usuário se cadastra no Supabase Auth.

### Tornar-se admin

Defina `is_admin = true` no seu `profiles` (via Supabase) para acessar `/admin`.

## Docker

```bash
cp .env.example .env
docker compose up --build
```

Sobe três serviços: `db` (Postgres 16), `migrate` (aplica as migrações) e `app`
(Next.js em produção na porta 3000).

## PWA / Offline

- `public/manifest.json` — `display: standalone`, ícones, atalhos.
- `public/sw.js` — cache do app shell, network-first em navegação, cache-first
  em assets, e Background Sync (`readly-sync`) que avisa os clients para
  esvaziar a fila offline (`src/lib/utils/offline-queue.ts`).
- `public/offline.html` — página de fallback offline.

## Gamificação

- XP por ações (ler página, terminar livro, resenha, post, etc.) em
  `src/lib/constants.ts` (`XP_ACTIONS`) e `src/lib/gamification.ts` (`awardXP`).
- Ranks: Calouro → Leitor Comum → Devorador → Rato de Biblioteca → Erudito →
  Lendário (`RANKS`).
- Créditos, gacha (rollRarity / weightedBookPick) e marketplace.

## Estrutura

```
src/
  app/            # rotas (App Router)
  components/     # ui, layout, books, social, gamification, sharing
  lib/            # supabase, hooks, utils, constants, gamification
  types/          # tipos do domínio
```

## Variáveis de ambiente

Veja `.env.example`. Principais:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (admin/server)
- `NEXT_PUBLIC_KIWIFY_CHECKOUT_URL` (assinatura)
- `DATABASE_URL` (migrações)
