// Picks a photo from Pexels for every recipe that does not have one yet and saves it into ./img.
//   img/<slug>.jpg         1200x675  (16:9, page hero and og:image)
//   img/<slug>-4x3.jpg      900x675  (structured data)
//   img/<slug>-1x1.jpg      800x800  (structured data)
//   img/<slug>-thumb.jpg    480x360  (library cards)
//   img/credits.json       photographer credit per slug
// Existing files are never overwritten, so you can replace any photo by dropping your own
// img/<slug>.jpg (plus the other sizes) into the repo and deleting its entry in credits.json.
// Needs the PEXELS_API_KEY environment variable (free key from pexels.com/api). Without it, this does nothing.
import fs from "node:fs";
import path from "node:path";
import { ROOT, loadRecipes, makeSlugs } from "./lib.mjs";

const KEY = process.env.PEXELS_API_KEY;
const API = process.env.PEXELS_API_BASE || "https://api.pexels.com/v1";
const DIR = path.join(ROOT, "img");
const CREDITS = path.join(DIR, "credits.json");
const SIZES = [["", 1200, 675], ["-4x3", 900, 675], ["-1x1", 800, 800], ["-thumb", 480, 360]];
const STOP = new Set("a an and with the of in on for to de la al".split(" "));

if (!KEY) { console.log("PEXELS_API_KEY is not set, skipping photo selection."); process.exit(0); }

const words = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w && !STOP.has(w));
const stem = w => w.replace(/(ies|es|s)$/, "");

async function search(q) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${API}/search?query=${encodeURIComponent(q)}&per_page=15&orientation=landscape`, { headers: { Authorization: KEY } });
    if (res.status === 429) { await new Promise(r => setTimeout(r, 4000 * (attempt + 1))); continue; }
    if (!res.ok) throw new Error(`Pexels returned ${res.status}`);
    return (await res.json()).photos || [];
  }
  throw new Error("Pexels rate limit");
}

// Higher score = the photo's description mentions more of the dish name's words.
function score(photo, name) {
  const alt = new Set(words(photo.alt || "").map(stem));
  const nw = words(name).map(stem);
  return nw.length ? nw.filter(w => alt.has(w)).length / nw.length : 0;
}

async function download(url, file) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

const all = await loadRecipes();
const slugs = makeSlugs(all);
fs.mkdirSync(DIR, { recursive: true });
const credits = fs.existsSync(CREDITS) ? JSON.parse(fs.readFileSync(CREDITS, "utf8")) : {};
const todo = all.filter(r => !fs.existsSync(path.join(DIR, `${slugs[r.id]}.jpg`)));
console.log(`${all.length - todo.length} recipes already have photos, ${todo.length} to fetch.`);

let ok = 0, loose = 0, failed = 0;
for (const r of todo) {
  const slug = slugs[r.id];
  try {
    let best = null;
    for (const q of [`${r.name} food`, `${r.name} ${r.cuisine} dish`]) {
      for (const p of await search(q)) {
        const sc = score(p, r.name);
        if (!best || sc > best.sc) best = { p, sc };
      }
      if (best && best.sc >= 0.5) break;
    }
    if (!best) { console.log(`::warning::No photo found for ${r.name}`); failed++; continue; }
    const base = best.p.src.original;
    for (const [suf, w, h] of [...SIZES].reverse()) { // main file last, so a half-finished set is retried
      await download(`${base}${base.includes("?") ? "&" : "?"}auto=compress&cs=tinysrgb&fit=crop&w=${w}&h=${h}`, path.join(DIR, `${slug}${suf}.jpg`));
    }
    credits[slug] = { photographer: best.p.photographer, photographer_url: best.p.photographer_url, url: best.p.url, alt: best.p.alt || "", match: best.sc >= 0.5 ? "good" : "loose" };
    if (best.sc < 0.5) { loose++; console.log(`::notice::Loose photo match for ${r.name}: "${best.p.alt}"`); }
    ok++;
    console.log(`${r.name} -> ${best.p.url}`);
  } catch (e) {
    failed++; console.log(`::warning::Photo for ${r.name} failed: ${e.message}`);
  }
}
fs.writeFileSync(CREDITS, JSON.stringify(credits, null, 1) + "\n");
console.log(`Done: ${ok} photos added (${loose} loose matches), ${failed} failed.`);
