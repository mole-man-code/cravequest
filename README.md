# FaceOffFood

A gamified recipe site: spin a cuisine wheel, run a food face-off, take a mood quiz or roll dinner dice, then cook the recipe you land on. Playing and cooking earns XP, ranks and badges.

It is a static site (plain HTML, CSS and JavaScript, no build step) with an optional Supabase backend for recipes and saved progress.

## What is in this folder

| Path | Purpose |
| --- | --- |
| `index.html`, `styles.css`, `app.js` | The site |
| `recipes.js` | Built-in recipes, used when Supabase is not set up |
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

## Deploy

Any static host works. For GitHub Pages: push this folder to a repository, then **Settings > Pages**, set the source to the main branch and the root folder.

## How it works

- `recipes` is a public, read-only table. Add or edit recipes in the Table Editor and they appear on the site.
- `player_state` holds one private row per user (XP, cooked recipes, play counts, badges). Row Level Security means a signed-in user can only read and write their own row.
- When a signed-in user has progress both locally and in the cloud, the two are merged: highest XP, union of cooked recipes and badges.
- The anon key in `config.js` is safe to publish. Access is enforced by the policies in the migration.

## Adding recipes

There are 48 starter recipes, four for each of 12 cuisines. Add a row in the Table Editor, or append to `supabase/seed.sql` and re-run it (it updates existing ids in place). Keep `recipes.js` in step if you want the offline fallback to match. `protein` must be one of `chicken`, `veg`, `seafood`, `egg`, `tofu`, `beef`. `vibes` can include `cozy`, `fresh`, `spicy`, `comfort`, `quick`.
