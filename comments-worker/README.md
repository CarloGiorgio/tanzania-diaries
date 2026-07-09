# Comments backend — one-time deploy

Reader comments run on a free Cloudflare Worker + a D1 database. Anyone can
leave a comment (name or "Anonymous", no login). Comments stay hidden until you
or Andrea approve them at `https://carlogiorgio.github.io/moderate/`.

You already have Cloudflare + `wrangler` from the CMS setup. ~10 minutes.

## 1. Create the database

```bash
cd comments-worker
wrangler d1 create tanzania-comments
```

It prints a `database_id`. Paste it into `wrangler.toml` (replace
`PASTE_DATABASE_ID_HERE`).

## 2. Create the table

```bash
wrangler d1 execute tanzania-comments --remote --file=./schema.sql
```

## 3. Deploy the Worker

```bash
wrangler deploy
```

It prints a URL, e.g. `https://carlo-comments.yourname.workers.dev`.

## 4. Point the site at it

If that URL's subdomain differs from `carlogiorgio`, edit `_config.yml`:

```yaml
comments_api: https://carlo-comments.yourname.workers.dev
```

Commit + push. Done.

## Who can moderate

`wrangler.toml` → `[vars] MODERATORS` lists the GitHub logins allowed to
approve/delete. It's set to `CarloGiorgio,kingsanchilling` (Carlo + Andrea).
Add/remove handles there, comma-separated, and re-run `wrangler deploy`.

## How it works

- `POST /api/comments` — anyone submits `{post_id, name, body}` → saved as `pending`.
- `GET  /api/comments?post_id=…` — public list of **approved** comments only.
- `GET  /api/pending` — moderators only (GitHub token) → all pending.
- `POST /api/moderate` — moderators only → `{id, action: "approve"|"reject"}`.

The moderation page (`/moderate/`) logs in through the **same** GitHub OAuth
Worker the CMS uses, so no new login setup.

## Peek at the data

```bash
wrangler d1 execute tanzania-comments --remote --command "SELECT * FROM comments ORDER BY created_at DESC LIMIT 20;"
```
