/* Star rating widget for the static recipe pages. Uses the same Supabase project and sign-in as the home page. */
(function () {
  var el = document.getElementById("rate"), C = window.CQ_CONFIG || {};
  if (!el || !window.supabase || !C.SUPABASE_URL || /YOUR-/.test(C.SUPABASE_URL)) return;
  var sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
  var id = +el.dataset.id, mine = 0, tot = null, user = null, note = "";

  function draw() {
    el.textContent = "";
    var row = document.createElement("div"); row.className = "stars"; row.setAttribute("role", "group"); row.setAttribute("aria-label", "Rate this recipe");
    for (var n = 1; n <= 5; n++) (function (n) {
      var b = document.createElement("button"); b.type = "button"; b.textContent = "★";
      b.className = n <= mine ? "on" : ""; b.setAttribute("aria-label", n + (n === 1 ? " star" : " stars"));
      b.onclick = function () { rate(n); };
      row.appendChild(b);
    })(n);
    var t = document.createElement("span"); t.className = "rtxt";
    t.textContent = tot && tot.count ? tot.avg.toFixed(1) + " average from " + tot.count + (tot.count === 1 ? " rating" : " ratings") : "No ratings yet";
    var lead = document.createElement("span"); lead.className = "rlead"; lead.textContent = mine ? "Your rating" : "Rate this recipe";
    el.appendChild(lead); el.appendChild(row); el.appendChild(t);
    if (note) { var m = document.createElement("span"); m.className = "rnote"; m.textContent = note + " "; if (note.indexOf("Sign in") === 0) { var a = document.createElement("a"); a.href = "/"; a.textContent = "Go to the home page"; m.appendChild(a); } el.appendChild(m); }
  }

  async function refreshTotal() {
    var r = await sb.from("recipe_ratings").select("avg,count").eq("recipe_id", id).maybeSingle();
    tot = r.data || null;
  }

  async function rate(n) {
    if (!user) { note = "Sign in on the home page to rate recipes."; draw(); return; }
    var first = !mine;
    var r = await sb.from("ratings").upsert({ recipe_id: id, user_id: user.id, stars: n }, { onConflict: "recipe_id,user_id" });
    if (r.error) { note = "Could not save your rating."; draw(); return; }
    mine = n; note = "Thanks for rating!";
    if (first) { try { var x = JSON.parse(localStorage.getItem("cq1") || "{}"); x.xp = (x.xp || 0) + 5; localStorage.setItem("cq1", JSON.stringify(x)); note += " +5 XP"; } catch (e) {} }
    await refreshTotal(); draw();
  }

  (async function () {
    draw();
    try {
      var s = await sb.auth.getSession(); user = s.data.session ? s.data.session.user : null;
      await refreshTotal();
      if (user) { var m = await sb.from("ratings").select("stars").eq("recipe_id", id).maybeSingle(); mine = m.data ? m.data.stars : 0; }
    } catch (e) {}
    draw();
  })();
})();
