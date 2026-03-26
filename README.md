# PsicoMed — Avaliação de Riscos Psicossociais

Plataforma de avaliação de fatores de riscos psicossociais no ambiente de trabalho, desenvolvida para a **Med Work**.

## Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- Supabase (Auth, Database, Edge Functions)
- React Router (SPA)

## Setup

```bash
npm install
cp .env.example .env  # configure suas variáveis do Supabase
npm run dev
```

## Deploy

Hospedado na Vercel com build automático via `npm run build`.
