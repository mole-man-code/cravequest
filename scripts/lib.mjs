// Shared by build.mjs and fetch-images.mjs.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

export const ROOT = process.cwd();
export const LOCAL = process.argv.includes("--local");
export const slugify = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function readLocal() {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "recipes.js"), "utf8"), ctx);
  return ctx.window.RECIPES.map(r => ({
    id: r.id, name: r.n, cuisine: r.c, protein: r.p, minutes: r.t, effort: r.e, vibes: r.v,
    vegetarian: !!r.veg, why: r.w, ingredients: r.i, steps: r.s
  }));
}

async function readSupabase() {
  const cfg = fs.readFileSync(path.join(ROOT, "config.js"), "utf8");
  const url = (cfg.match(/SUPABASE_URL:\s*"([^"]+)"/) || [])[1];
  const key = (cfg.match(/SUPABASE_ANON_KEY:\s*"([^"]+)"/) || [])[1];
  if (!url || !key || /YOUR-/.test(url)) throw new Error("config.js does not contain Supabase settings");
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${url}/rest/v1/recipes?select=*&order=id.asc`, {
      headers: { apikey: key, Range: `${from}-${from + 999}` }
    });
    if (!res.ok) throw new Error(`Supabase returned ${res.status}: ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) break;
  }
  if (!rows.length) throw new Error("Supabase returned 0 recipes");
  return rows;
}

export async function loadRecipes() {
  if (LOCAL) return readLocal();
  try {
    return await readSupabase();
  } catch (e) {
    // Keep the site deployable: fall back to the recipes bundled in recipes.js and flag it in the run log.
    console.log(`::warning::Could not read recipes from Supabase (${e.message}). Using recipes.js instead, so recipes added only in Supabase will be missing until this is fixed.`);
    return readLocal();
  }
}


export function makeSlugs(all) {
  const slugs = {}, used = new Set();
  for (const r of all) {
    let s = slugify(r.name) || `recipe-${r.id}`;
    if (used.has(s)) s = `${s}-${r.id}`;
    used.add(s); slugs[r.id] = s;
  }
  return slugs;
}

// Public rating totals per recipe id. Returns {} if the ratings view is not set up yet.
export async function loadRatings() {
  if (LOCAL) return {};
  try {
    const cfg = fs.readFileSync(path.join(ROOT, "config.js"), "utf8");
    const url = (cfg.match(/SUPABASE_URL:\s*"([^"]+)"/) || [])[1];
    const key = (cfg.match(/SUPABASE_ANON_KEY:\s*"([^"]+)"/) || [])[1];
    const res = await fetch(`${url}/rest/v1/recipe_ratings?select=*`, { headers: { apikey: key } });
    if (!res.ok) return {};
    const out = {};
    for (const x of await res.json()) out[x.recipe_id] = { avg: x.avg, count: x.count };
    return out;
  } catch (e) { return {}; }
}
