# Audio Paper Library

MVP locale costruito con Next.js App Router, TypeScript, Tailwind CSS, Prisma e SQLite.

## Requisiti

- Node.js 18+ oppure 20+
- npm

## Avvio

```bash
npm install
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

## API disponibili

- `POST /api/audio/upload`
- `GET /api/audio`
- `GET /api/audio/:id`
- `POST /api/audio/progress`

## Note MVP

- I file audio vengono salvati in `public/uploads`
- I metadata vengono salvati in SQLite tramite Prisma
- Il progresso di ascolto viene aggiornato periodicamente e in pausa
