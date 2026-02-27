# Cloudflare Setup (D1 + R2 + Cron + Email)

## 1) Crear base de datos D1

```bash
npx wrangler d1 create diario-db
```

Copia el `database_id` y reemplaza `REPLACE_WITH_YOUR_D1_DATABASE_ID` en `wrangler.jsonc`.

Aplicar migración:

```bash
npx wrangler d1 execute diario-db --remote --file=./migrations/0001_init.sql
```

## 2) Crear bucket R2 para audio

```bash
npx wrangler r2 bucket create diario-audio
```

## 3) Configurar secretos de email y cron

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put CRON_SECRET
```

En `wrangler.jsonc`:
- `RESEND_FROM_EMAIL`: remitente validado en Resend.
- `DEADMAN_NOTIFY_EMAILS`: correos fallback separados por coma.
- `APP_URL`: URL publica de tu diario.
- `CF_WHISPER_MODEL`: modelo de Workers AI (recomendado `@cf/openai/whisper-large-v3-turbo`).

El binding `AI` de Cloudflare se configura en `wrangler.jsonc` y no necesita API key adicional.

## 4) Deploy

```bash
npm run deploy
```

## 5) Cron para enviar correos

Este proyecto expone `POST /api/cron/deadman` y requiere:

- Header: `Authorization: Bearer <CRON_SECRET>`

Opciones:
- Cloudflare Worker cron secundario (recomendado) que haga `fetch()` a esa ruta.
- O un scheduler externo (EasyCron, cron-job.org, GitHub Actions).

Frecuencia sugerida: cada 24h (la logica escala por meses).

Politica implementada:
- Mes 1 a 5 sin actividad: envia recordatorio a `owner_email` (configurable desde ajustes).
- Mes 6 sin actividad: envia el enlace de la web a los correos configurados.
