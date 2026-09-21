// Builds the deployable site into ./_site.
//  - copies the static files
//  - reads every recipe from Supabase and writes /recipes/<slug>/index.html for each one
//  - writes /recipes/index.html, /recipes/manifest.json and /sitemap.xml
// Usage:  node scripts/build.mjs           (reads recipes from Supabase, using config.js)
//         node scripts/build.mjs --local   (reads recipes.js instead; for previewing without a network)
import fs from "node:fs";
import path from "node:path";
import { ROOT, LOCAL, slugify, loadRecipes, loadRatings, makeSlugs } from "./lib.mjs";

const OUT = path.join(ROOT, "_site");
const SITE = (process.env.SITE_URL || "https://faceofffood.com").replace(/\/$/, "");
const IMG_DIR = path.join(ROOT, "img");
const CREDITS = fs.existsSync(path.join(IMG_DIR, "credits.json")) ? JSON.parse(fs.readFileSync(path.join(IMG_DIR, "credits.json"), "utf8")) : {};
const hasImg = slug => fs.existsSync(path.join(IMG_DIR, `${slug}.jpg`));
const TODAY = new Date().toISOString().slice(0, 10);

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const jsonLd = o => JSON.stringify(o).replace(/</g, "\\u003c");

const FONTS = "https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,700;8..60,900&family=Source+Sans+3:wght@400;600;700&display=swap";
const PROT = { chicken: "Chicken", veg: "Vegetables", seafood: "Seafood", egg: "Egg", tofu: "Tofu", beef: "Beef / Pork" };

function shell({ title, desc, canonical, body, ld, image, scripts }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta name="theme-color" content="#C1121F">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:site_name" content="FaceOffFood">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${image || `${SITE}/og-image.png`}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="/styles.css">
${ld ? `<script type="application/ld+json">${jsonLd(ld)}</script>` : ""}
</head>
<body>
<div class="wrap">
  <header class="top">
    <a class="brand" href="/">FaceOff<i>Food</i></a>
    <nav class="topnav"><a href="/">Play the games</a><a href="/recipes/">All recipes</a></nav>
  </header>
${body}
  ${scripts || ""}
  <footer class="foot"><a href="/">FaceOffFood</a> · <a href="/recipes/">Browse all recipes</a></footer>
</div>
</body>
</html>
`;
}

function recipeCard(r, slugs) {
  const th = hasImg(slugs[r.id]) ? `<img class="th" loading="lazy" width="480" height="360" alt="" src="/img/${slugs[r.id]}-thumb.jpg">` : "";
  return `<a class="rc" href="/recipes/${slugs[r.id]}/">${th}<span class="cu">${esc(r.cuisine)}</span><h3>${esc(r.name)}</h3><span class="m"><span>${r.minutes} min</span><span>${esc(PROT[r.protein] || r.protein)}</span></span></a>`;
}

function recipePage(r, slugs, all) {
  const url = `${SITE}/recipes/${slugs[r.id]}/`;
  const why = (r.why || "").trim();
  let desc = `${r.name}: ${why || `a ${r.cuisine} recipe`} Ready in ${r.minutes} minutes.`;
  if (desc.length > 158) desc = desc.slice(0, 155).replace(/\s+\S*$/, "") + "...";
  const related = all.filter(x => x.id !== r.id && x.cuisine === r.cuisine).slice(0, 4);
  const ld = {
    "@context": "https://schema.org", "@type": "Recipe", name: r.name,
    description: why || undefined, recipeCuisine: r.cuisine, totalTime: `PT${r.minutes}M`,
    recipeIngredient: r.ingredients,
    recipeInstructions: r.steps.map(t => ({ "@type": "HowToStep", text: t })),
    keywords: [r.cuisine, ...(r.vibes || [])].join(", "),
    suitableForDiet: r.vegetarian ? "https://schema.org/VegetarianDiet" : undefined,
    author: { "@type": "Organization", name: "FaceOffFood", url: SITE },
    datePublished: r.created_at ? String(r.created_at).slice(0, 10) : undefined,
    mainEntityOfPage: url
  };
  const rt = RATINGS[r.id];
  if (rt && rt.count >= 3) ld.aggregateRating = { "@type": "AggregateRating", ratingValue: rt.avg, ratingCount: rt.count, bestRating: 5, worstRating: 1 };
  const slug = slugs[r.id], photo = hasImg(slug), cr = CREDITS[slug];
  if (photo) ld.image = ["", "-4x3", "-1x1"].map(x => `${SITE}/img/${slug}${x}.jpg`);
  const fig = photo ? `<figure class="hero"><img src="/img/${slug}.jpg" width="1200" height="675" alt="${esc(r.name)}">${cr ? `<figcaption>Photo by <a href="${esc(cr.photographer_url)}" rel="noopener nofollow">${esc(cr.photographer)}</a> on <a href="${esc(cr.url)}" rel="noopener nofollow">Pexels</a></figcaption>` : ""}</figure>` : "";
  const body = `<main class="rpage">
    <p class="crumbs"><a href="/">Home</a> / <a href="/recipes/">Recipes</a> / ${esc(r.name)}</p>
    <span class="kick">${esc(r.cuisine)}</span>
    <h1>${esc(r.name)}</h1>
    ${fig}
    <div class="rate" id="rate" data-id="${r.id}"></div>
    <div class="dmeta"><span>${r.minutes} min</span><span>${esc(PROT[r.protein] || r.protein)}</span><span>${r.vegetarian ? "Vegetarian" : "Contains meat or fish"}</span><span>Effort ${r.effort} of 3</span></div>
    ${why ? `<h2 class="rh">Why this recipe works</h2><p class="why">${esc(why)}</p>` : ""}
    <h2 class="rh">Ingredients</h2>
    <ul class="ing">${r.ingredients.map((x, k) => `<li><label><input type="checkbox" id="ing${k}"><span>${esc(x)}</span></label></li>`).join("")}</ul>
    <h2 class="rh">Method</h2>
    <ol class="steps">${r.steps.map(x => `<li><span>${esc(x)}</span></li>`).join("")}</ol>
    <section class="cta"><h2>Still deciding what to cook?</h2><p>Spin the wheel, play a face-off, take the mood quiz or search by what is in your fridge.</p><a class="btn" href="/">Play FaceOffFood</a></section>
    ${related.length ? `<h2 class="rh">More ${esc(r.cuisine)} recipes</h2><div class="grid">${related.map(x => recipeCard(x, slugs)).join("")}</div>` : ""}
  </main>`;
  return shell({ title: `${r.name} Recipe (${r.minutes} Minutes) | FaceOffFood`, desc, canonical: url, body, ld, image: photo ? `${SITE}/img/${slug}.jpg` : undefined,
    scripts: `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script><script src="/config.js"></script><script src="/rate.js"></script>` });
}

function indexPage(all, slugs) {
  const cuisines = [...new Set(all.map(r => r.cuisine))].sort();
  const body = `<main class="rpage wide">
    <p class="crumbs"><a href="/">Home</a> / Recipes</p>
    <span class="kick">${all.length} recipes</span>
    <h1>All recipes</h1>
    <p class="why">Browse by cuisine, or let the games pick for you on the <a href="/">home page</a>.</p>
    ${cuisines.map(c => `<h2 class="rh" id="${slugify(c)}">${esc(c)}</h2><div class="grid">${all.filter(r => r.cuisine === c).map(r => recipeCard(r, slugs)).join("")}</div>`).join("\n")}
  </main>`;
  return shell({
    title: "All Recipes by Cuisine | FaceOffFood",
    desc: `Browse ${all.length} recipes from ${cuisines.length} cuisines: ${cuisines.slice(0, 5).join(", ")} and more.`,
    canonical: `${SITE}/recipes/`, body
  });
}

const all = await loadRecipes();
const RATINGS = await loadRatings();
const slugs = makeSlugs(all);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "recipes"), { recursive: true });
for (const f of ["index.html", "app.js", "config.js", "recipes.js", "styles.css", "favicon.svg", "rate.js", "og-image.png", "robots.txt", "CNAME"]) {
  if (fs.existsSync(path.join(ROOT, f))) fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
}
for (const r of all) {
  const dir = path.join(OUT, "recipes", slugs[r.id]);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), recipePage(r, slugs, all));
}
if (fs.existsSync(IMG_DIR)) fs.cpSync(IMG_DIR, path.join(OUT, "img"), { recursive: true });
fs.writeFileSync(path.join(OUT, "recipes", "index.html"), indexPage(all, slugs));
fs.writeFileSync(path.join(OUT, "recipes", "manifest.json"), JSON.stringify(slugs));

const urls = [[`${SITE}/`, "1.0"], [`${SITE}/recipes/`, "0.8"], ...all.map(r => [`${SITE}/recipes/${slugs[r.id]}/`, "0.7"])];
fs.writeFileSync(path.join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, p]) => `  <url><loc>${u}</loc><lastmod>${TODAY}</lastmod><priority>${p}</priority></url>`).join("\n")}\n</urlset>\n`);
console.log(`Built ${all.length} recipe pages into ${path.relative(ROOT, OUT) || "_site"}`);
