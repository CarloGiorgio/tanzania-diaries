# Setup — one time only

Site code is ready. Two account steps remain so the phone editor (`/admin/`)
can log in and save posts. ~10 minutes, then you never do it again.

## 1. Create a GitHub OAuth App

1. Go to https://github.com/settings/developers → **OAuth Apps** → **New OAuth App**
2. Fill in:
   - **Application name:** `Carlo in Africa CMS`
   - **Homepage URL:** `https://carlogiorgio.github.io`
   - **Authorization callback URL:** `https://carlo-cms-oauth.<your-subdomain>.workers.dev/callback`
     (you get the real Worker URL in step 2 — come back and fix this after)
3. Click **Register**. Copy the **Client ID**. Click **Generate a new client secret**, copy it.

## 2. Deploy the OAuth Worker (Cloudflare, free)

Need a free Cloudflare account: https://dash.cloudflare.com/sign-up

In a terminal:

```bash
npm install -g wrangler
cd oauth-worker
wrangler login
wrangler secret put GITHUB_CLIENT_ID       # paste Client ID from step 1
wrangler secret put GITHUB_CLIENT_SECRET   # paste the secret from step 1
wrangler deploy
```

`wrangler deploy` prints your Worker URL, e.g.
`https://carlo-cms-oauth.yourname.workers.dev`.

- Go back to the GitHub OAuth App and set the **callback URL** to
  `https://carlo-cms-oauth.yourname.workers.dev/callback`.

## 3. Point the editor at your Worker

Edit `admin/config.yml`, line `base_url:` → your Worker URL (no `/callback`):

```yaml
base_url: https://carlo-cms-oauth.yourname.workers.dev
```

Commit + push.

## 4. Add your travel mate (so he can post too)

Your friend needs **no GitHub account**. You both share the same login to the
editor; who wrote what comes from the **"Who's writing?"** picker, not GitHub.

1. On his phone, open `carlogiorgio.github.io/admin/`.
2. Log in once with your GitHub (the same one from steps 1–2). Stays logged in.
3. He posts: **New Travel day** → picks his name in **Who's writing?** → Publish.

(Heads-up: on his phone he's signed into your GitHub. Fine for this repo. If you
prefer, make a separate throwaway GitHub account just for the blog and use that.)

Authors are already set to **Carlo** and **Andrea** (`admin/config.yml`,
`assets/css/style.css` → `.badge-andrea`).

## 5. Turn on GitHub Pages (if not already)

Repo → **Settings** → **Pages** → Source: **Deploy from a branch**,
Branch: `master`, folder `/ (root)`. Save.

## 6. Turn on reader comments (optional)

Readers can leave comments on any post — with a name or as "Anonymous", no
login. Nothing shows until you or Andrea approve it. Full steps in
`comments-worker/README.md`. Short version:

```bash
cd comments-worker
wrangler d1 create tanzania-comments          # paste the id into wrangler.toml
wrangler d1 execute tanzania-comments --remote --file=./schema.sql
wrangler deploy                               # note the URL it prints
```

If the printed URL's subdomain isn't `carlogiorgio`, update `comments_api` in
`_config.yml`. Commit + push.

**Approve comments:** open `https://carlogiorgio.github.io/moderate/`, log in
with GitHub, tap **Approve** or **Delete**. Both Carlo (`CarloGiorgio`) and
Andrea (`kingsanchilling`) can moderate with their own accounts — the allowlist
is `MODERATORS` in `comments-worker/wrangler.toml`. Bookmark it / Add to Home
Screen like the editor.

## Done. Daily use from your phone

1. Open `https://carlogiorgio.github.io/admin/`
2. **Login with GitHub** (first time only)
3. **New Travel day** → title, date, location, write, add cover + gallery photos
4. **Publish**

Site updates in ~1 minute. Photos auto-shrink in the background so pages stay
fast on mobile data.

> Tip: on iPhone, Safari → Share → **Add to Home Screen** the `/admin/` page.
> Then it's a one-tap app icon for posting.
