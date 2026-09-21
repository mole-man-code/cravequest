# FaceOffFood

A gamified recipe site: spin a cuisine wheel, run a food face-off, take a mood quiz or roll dinner dice, then cook the recipe you land on. Playing and cooking earns XP, ranks and badges.

It is a static site (plain HTML, CSS and JavaScript, no build step) with an optional Supabase backend for recipes and saved progress.

## What is in this folder

| Path | Purpose |
| --- | --- |
| `index.html`, `styles.css`, `app.js` | The site |
| `recipes.js` | Built-in recipes, used when Supabase is not set up |
| `favicon.svg`, `og-image.png`, `robots.txt`, `sitemap.xml` | Search and social sharing assets. They assume the site lives at https://faceofffood.com/ |
| `scripts/build.mjs`, `.github/workflows/pages.yml` | Generates the recipe pages and deploys the site |
| `config.js` | Your Supabase URL and anon key |
| `supabase/migrations/` | Database schema and Row Level Security policies |
| `supabase/seed.sql` | The 16 starter recipes |

## Try it locally

Open `index.html` in a browser. With the placeholder `config.js` it runs entirely in your browser and saves progress to local storage.

## Connect Supabase

1. Create a project at supabase.com.
2. In the dashboard, open **SQL Editor**, paste in `supabase/migrations/20260920000000_init.sql`, and run it. Then do the same with `supabase/seed.sql`.
3. Open **Project Settings > API**. Copy the Project URL and the publishable (or anon) key into `config.js`. Never use a secret or `service_role` key in this repo.
4. Open **Authentication > URL Configuration**. Set **Site URL** to where the site will live (for example your GitHub Pages address), and add `http://localhost:3000` or wherever you test locally to **Redirect URLs**. Sign-in links only work for addresses listed here.
5. Reload the site. A **Sign in** button appears in the header. Visitors create an account with an email and password (8+ characters), and their XP, badges and cooked recipes are saved to it. **Forgot password?** sends a reset link.
6. Under **Authentication > Sign In / Providers > Email**, decide whether to keep **Confirm email** on. With it on, new accounts must click an emailed link, which needs a custom SMTP provider (Supabase's built-in sender only reaches your own team and is limited to about 2 emails per hour). With it off, accounts work immediately, but password reset emails still need SMTP.

To use the Supabase CLI instead of the SQL editor: `supabase init`, `supabase link --project-ref <ref>`, `supabase db push`, then run `supabase/seed.sql` in the SQL editor.

## Recipe pages

Every recipe has its own page at `/recipes/<name>/` with Google recipe markup, plus an index at `/recipes/` and a `sitemap.xml`. The `recipes/` folder in this repo already contains the 84 current pages, so `/recipes/` works as soon as the files are uploaded, with Pages set to **Deploy from a branch**.

### Optional: automatic pages for new recipes

`scripts/build.mjs` regenerates all pages from the Supabase `recipes` table, and `.github/workflows/pages.yml` runs it and deploys. To use it:

1. Confirm `/recipes/` already works (above).
2. **Settings > Pages > Build and deployment > Source** > **GitHub Actions**.
3. **Actions > Build and deploy site > Run workflow**. If it is green, you are done. If it fails or the site disappears, set Source back to **Deploy from a branch**; nothing is lost.

After that the site rebuilds on every push, daily at about 08:17 UTC, and on demand with Run workflow. If you stay on branch deploys, delete `.github/workflows/pages.yml` so it does not show failed runs, and regenerate pages yourself with `node scripts/build.mjs --local` (uses `recipes.js`), copying `_site/recipes` and `_site/sitemap.xml` over the repo copies.

Optional instant updates: in Supabase, **Integrations > Database Webhooks**, add a webhook on `recipes` (insert, update, delete) that POSTs to `https://api.github.com/repos/OWNER/REPO/dispatches` with headers `Authorization: Bearer <fine-grained token>`, `Accept: application/vnd.github+json` and body `{"event_type":"recipes-updated"}`. The token needs Contents: read and write on this repo only.

## Deploy

Any static host works. For GitHub Pages, upload everything (including the hidden `.github` folder and `recipes/`) and use **Deploy from a branch** until you choose the automation above.

## How it works

- **Fridge Raid** (fifth game tab) matches what you pick against each recipe's ingredient list. The ingredient names it recognizes live in the `FRIDGE` list in `app.js`; add a new pantry item there if you introduce an ingredient it does not know. Salt, pepper, oil, sugar, flour and common dried spices are assumed. The fridge selection is saved in the browser only.
- `recipes` is a public, read-only table. Add or edit recipes in the Table Editor and they appear on the site.
- `player_state` holds one private row per user (XP, cooked recipes, play counts, badges). Row Level Security means a signed-in user can only read and write their own row.
- When a signed-in user has progress both locally and in the cloud, the two are merged: highest XP, union of cooked recipes and badges.
- The anon key in `config.js` is safe to publish. Access is enforced by the policies in the migration.

## Adding recipes

There are 84 starter recipes, seven for each of 12 cuisines. Add a row in the Table Editor, or append to `supabase/seed.sql` and re-run it (it updates existing ids in place). Keep `recipes.js` in step if you want the offline fallback to match. `protein` must be one of `chicken`, `veg`, `seafood`, `egg`, `tofu`, `beef`. `vibes` can include `cozy`, `fresh`, `spicy`, `comfort`, `quick`.
