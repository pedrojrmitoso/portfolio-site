# Portfólio

Portfólio pessoal em três idiomas (PT · EN · FR) com painel administrativo próprio para gerenciar perfil, projetos, tecnologias, links, experiência e currículo, sem tocar no código.

**Stack:** Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, Storage) · Vercel

## Destaques

- **Internacionalização nativa** com rotas `/pt`, `/en`, `/fr`, detecção pelo `Accept-Language` e conteúdo traduzível salvo em `jsonb`.
- **Tema claro, escuro e sistema** sem flash na carga (script inline antes da pintura).
- **Páginas estáticas com revalidação sob demanda**: o site é servido do cache e o painel invalida com `updateTag` a cada alteração.
- **Painel admin** com login, recuperação de senha, upload direto para o Storage e edição em três idiomas.
- **Segurança em camadas**: RLS no banco, autorização em toda Server Action, validação de URLs no servidor e no banco, headers de segurança.
- **SEO**: metadados por idioma, `hreflang`, Open Graph gerado dinamicamente, JSON-LD `Person`, sitemap e robots.
- **Acessibilidade**: HTML semântico, navegação por teclado, `prefers-reduced-motion`.

## Estrutura

```
src/
├── app/
│   ├── (site)/[lang]/      # site público (layout raiz por idioma)
│   ├── (admin)/admin/      # painel: login, perfil, projetos, tecnologias, links…
│   ├── robots.ts · sitemap.ts
├── components/
│   ├── site/               # seções do site
│   ├── admin/              # formulários, upload, galeria
│   └── theme/              # tema claro/escuro/sistema
├── i18n/                   # locales e dicionários de interface
├── lib/
│   ├── data.ts             # leitura pública (cacheada)
│   ├── admin/auth.ts       # camada de autorização do painel
│   ├── supabase/           # clientes (público, sessão, navegador) e tipos
│   └── tech-icons.tsx      # catálogo de logos de tecnologias
└── proxy.ts                # idioma + sessão do painel
supabase/migrations/        # schema, RLS e storage
```

## Rodando localmente

Pré-requisitos: Node.js 20+ e um projeto no [Supabase](https://supabase.com).

```bash
npm install
cp .env.example .env.local   # preencha com os dados do seu projeto
npm run dev
```

Aplique as migrations de `supabase/migrations/` (SQL Editor ou Supabase CLI) e, opcionalmente, os dados de exemplo em `supabase/seed.sql`.

Para liberar o painel, crie um usuário em **Authentication → Users** e adicione-o como administrador:

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'voce@exemplo.com';
```

## Scripts

| Comando             | Descrição                   |
| ------------------- | --------------------------- |
| `npm run dev`       | servidor de desenvolvimento |
| `npm run build`     | build de produção           |
| `npm run lint`      | ESLint                      |
| `npm run typecheck` | checagem de tipos           |
| `npm run format`    | formata o código (Prettier) |

## Deploy

Pensado para a Vercel: conecte o repositório, defina as variáveis de `.env.example` e adicione a URL de produção em **Supabase → Authentication → URL Configuration**.
