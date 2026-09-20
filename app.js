let R=[],RB={},CU=[],DL=[];
function setRecipes(rows){R=rows;RB={};R.forEach(r=>RB[r.id]=r);CU=[...new Set(R.map(r=>r.c))];DL=[["Cuisine",CU],["Main",Object.keys(PROT)],["Time",["15 min","30 min","Any time"]]]}

const PROT={chicken:"Chicken",veg:"Vegetables",seafood:"Seafood",egg:"Egg",tofu:"Tofu",beef:"Beef / Pork"};
const TITLES=["Home Cook","Prep Cook","Line Cook","Test Cook","Sous Chef","Head Chef"];
const BADGES=[
 ["First Spin","Spin the wheel",s=>s.plays.wheel>0],
 ["Face-off Finalist","Crown a dish",s=>s.plays.duel>0],
 ["Mood Reader","Finish the quiz",s=>s.plays.quiz>0],
 ["Dice Roller","Roll dinner",s=>s.plays.dice>0],
 ["First Cook","Cook any recipe",s=>Object.keys(s.cooked).length>0],
 ["Globe Trotter","Cook 3 cuisines",s=>new Set(Object.keys(s.cooked).map(i=>RB[i]&&RB[i].c).filter(Boolean)).size>=3],
 ["Kitchen Regular","Cook 5 recipes",s=>Object.keys(s.cooked).length>=5]
];
let S={xp:0,cooked:{},plays:{wheel:0,duel:0,quiz:0,dice:0},badges:{}};
try{const x=JSON.parse(localStorage.getItem("cq1")||"null");if(x)S={...S,...x,plays:{...S.plays,...x.plays}}}catch(e){}
const saveLocal=()=>{try{localStorage.setItem("cq1",JSON.stringify(S))}catch(e){}};
const save=()=>{saveLocal();pushState()};
const $=id=>document.getElementById(id);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
let toastT;
function toast(m){const t=$("toast");t.textContent=m;t.classList.add("show");clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("show"),2400)}
function award(xp,why){
  const before=Math.floor(S.xp/100);S.xp+=xp;
  let m="+"+xp+" XP  "+why;
  if(Math.floor(S.xp/100)>before)m="Rank up! You are now a "+TITLES[Math.min(Math.floor(S.xp/100),5)];
  BADGES.forEach(b=>{if(!S.badges[b[0]]&&b[2](S)){S.badges[b[0]]=1;m="Badge unlocked: "+b[0]}});
  save();toast(m);renderHud();
}
function renderHud(){
  const lvl=Math.floor(S.xp/100);
  $("lv").textContent="Lv "+(lvl+1)+" · "+TITLES[Math.min(lvl,5)];
  $("xpbar").style.width=(S.xp%100)+"%";
  $("xptxt").textContent=S.xp+" XP";
  $("badges").innerHTML=BADGES.map(b=>`<div class="badge ${S.badges[b[0]]?"on":""}"><b>${b[0]}</b>${b[1]}</div>`).join("");
  renderGrid();
}
function showResult(r,kick){
  const el=$("result");el.hidden=false;
  el.innerHTML=`<div class="rcard"><div><div class="rk">${kick}</div><h2>${r.n}</h2><div class="meta">${r.c} · ${r.t} min · effort ${r.e} of 3</div></div><button class="btn" id="rview">See the recipe</button></div>`;
  $("rview").onclick=()=>openRecipe(r);
  el.scrollIntoView({behavior:"smooth",block:"nearest"});
}
function openRecipe(r){
  const done=S.cooked[r.id];
  $("dbody").innerHTML=`<div class="dhead"><span class="kick">${r.c}</span><button class="btn ghost" id="dx">Close</button></div>
  <h2>${r.n}</h2>
  <div class="dmeta"><span>${r.t} min</span><span>${PROT[r.p]}</span><span>${r.veg?"Vegetarian":"Contains meat or fish"}</span><span>Effort ${r.e} of 3</span></div>
  <h3>Why this recipe works</h3><p class="why">${r.w}</p>
  <h3>Ingredients</h3><ul class="ing">${r.i.map((x,k)=>`<li><label><input type="checkbox" id="ing${k}"><span>${x}</span></label></li>`).join("")}</ul>
  <h3>Method</h3><ol class="steps">${r.s.map(x=>`<li><span>${x}</span></li>`).join("")}</ol>
  <button class="btn" id="dcook" ${done?"disabled":""}>${done?"Cooked. Nice work":"I cooked this (+50 XP)"}</button>`;
  $("dx").onclick=()=>$("dlg").close();
  $("dcook").onclick=()=>{S.cooked[r.id]=1;$("dlg").close();award(50,"for cooking "+r.n)};
  $("dlg").showModal();
}
$("dlg").addEventListener("click",e=>{if(e.target===$("dlg"))$("dlg").close()});

const stage=$("stage");
function setGame(g){
  document.querySelectorAll(".tab").forEach(t=>t.setAttribute("aria-selected",t.dataset.g===g));
  ({wheel:gWheel,duel:gDuel,quiz:gQuiz,dice:gDice})[g]();
}
$("tabs").onclick=e=>{const b=e.target.closest(".tab");if(b)setGame(b.dataset.g)};

/* Wheel */
const WC=["#B3121D","#2B2B2B","#B8770B","#2F6B3F","#7A2E2E","#1F4E6B","#8A5A12","#4A4A4A"];
let rot=0,spinning=false;
function gWheel(){
  stage.innerHTML=`<h2>Spin for a cuisine</h2><div class="wheelbox"><div class="pin"></div><canvas id="cv" width="680" height="680" aria-label="Cuisine wheel"></canvas></div><button class="btn" id="spin">Spin</button><p class="hint">Land on a cuisine, get a dish from it. +10 XP.</p>`;
  drawWheel();$("spin").onclick=spin;
}
function drawWheel(){
  const cv=$("cv");if(!cv)return;const x=cv.getContext("2d"),W=cv.width,c=W/2,n=CU.length,sg=2*Math.PI/n;
  x.clearRect(0,0,W,W);
  for(let i=0;i<n;i++){
    x.beginPath();x.moveTo(c,c);x.arc(c,c,c-6,rot+i*sg,rot+(i+1)*sg);x.closePath();
    x.fillStyle=WC[i];x.fill();x.lineWidth=4;x.strokeStyle="#fff";x.stroke();
    x.save();x.translate(c,c);x.rotate(rot+(i+.5)*sg);x.fillStyle="#fff";x.font="700 34px 'Source Sans 3',sans-serif";x.textAlign="right";x.textBaseline="middle";x.fillText(CU[i],c-40,0);x.restore();
  }
  x.beginPath();x.arc(c,c,30,0,7);x.fillStyle="#1B1B1B";x.fill();
}
function spin(){
  if(spinning)return;spinning=true;$("spin").disabled=true;
  const start=rot,delta=Math.PI*2*(5+Math.random()*2),dur=3800,t0=performance.now();
  (function f(t){
    const p=Math.min((t-t0)/dur,1),e=1-Math.pow(1-p,4);
    rot=start+delta*e;drawWheel();
    if(p<1)return requestAnimationFrame(f);
    spinning=false;$("spin").disabled=false;
    const sg=2*Math.PI/CU.length,rel=((-Math.PI/2-rot)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);
    const cu=CU[Math.floor(rel/sg)],r=pick(R.filter(r=>r.c===cu));
    S.plays.wheel++;showResult(r,"The wheel says "+cu);award(10,"for spinning");
  })(t0);
}

/* Face-off */
let duel;
function gDuel(){duel={pool:shuffle(R).slice(0,8),next:[],i:0};duelRender()}
function duelRender(){
  const d=duel,names=["Quarterfinal","Semifinal","Final"];
  if(d.pool.length===1){
    const w=d.pool[0];S.plays.duel++;
    stage.innerHTML=`<div class="round">Champion</div><h2>${w.n}</h2><p class="hint">It beat seven other dishes. That is dinner.</p><button class="btn" id="dw">See the recipe</button><button class="btn ghost" id="da">Play again</button>`;
    $("dw").onclick=()=>openRecipe(w);$("da").onclick=gDuel;
    showResult(w,"Face-off champion");award(20,"for crowning a dish");return;
  }
  const a=d.pool[d.i],b=d.pool[d.i+1],rn=d.pool.length===8?0:d.pool.length===4?1:2;
  stage.innerHTML=`<div class="round">${names[rn]} · match ${d.i/2+1} of ${d.pool.length/2}</div><h2>Which would you rather eat?</h2>
  <div class="duel">${[a,b].map((r,k)=>`<button class="opt" data-k="${k}"><b>${r.n}</b><span>${r.c} · ${r.t} min</span></button>`).join("")}</div><p class="hint">Pick a winner each round until one dish is left.</p>`;
  stage.querySelectorAll(".opt").forEach(o=>o.onclick=()=>{
    d.next.push(o.dataset.k==="0"?a:b);d.i+=2;
    if(d.i>=d.pool.length){d.pool=d.next;d.next=[];d.i=0}
    duelRender();
  });
}

/* Quiz */
const QZ=[
 {q:"How much energy do you have for cooking?",o:[["Running on fumes",1],["Decent",2],["Fired up",3]]},
 {q:"What are you craving?",o:[["Something cozy","cozy"],["Fresh and bright","fresh"],["Heat and spice","spicy"],["Pure comfort","comfort"]]},
 {q:"Any dietary limits tonight?",o:[["Bring on the meat and fish",0],["Vegetarian only",1]]}
];
let qa;
function gQuiz(){qa=[];quizRender()}
function quizRender(){
  const k=qa.length;
  if(k===3){
    const [eff,vibe,veg]=qa;
    const sc=R.filter(r=>!veg||r.veg).map(r=>({r,s:(r.v.includes(vibe)?3:0)+(r.e<=eff?2:0)+(r.e===eff?1:0)+Math.random()*.5})).sort((a,b)=>b.s-a.s);
    const top=sc[0].r;S.plays.quiz++;
    stage.innerHTML=`<div class="round">Your match</div><h2>${top.n}</h2><p class="hint">Also good tonight: ${sc.slice(1,3).map(x=>x.r.n).join(", ")}.</p><button class="btn" id="qv">See the recipe</button><button class="btn ghost" id="qa">Retake</button>`;
    $("qv").onclick=()=>openRecipe(top);$("qa").onclick=gQuiz;
    showResult(top,"Mood Quiz match");award(15,"for finishing the quiz");return;
  }
  const q=QZ[k];
  stage.innerHTML=`<div class="round">Question ${k+1} of 3</div><h2>${q.q}</h2><div class="choices">${q.o.map((o,j)=>`<button class="choice" data-j="${j}">${o[0]}</button>`).join("")}</div>`;
  stage.querySelectorAll(".choice").forEach(b=>b.onclick=()=>{qa.push(q.o[b.dataset.j][1]);quizRender()});
}

/* Dice */
let dv=[null,null,null],lock=[false,false,false];
function gDice(){dv=DL.map(d=>pick(d[1]));lock=[false,false,false];diceRender()}
function diceRender(rolling){
  stage.innerHTML=`<h2>Roll your dinner</h2><div class="dice">${DL.map((d,i)=>`<button class="die ${rolling&&!lock[i]?"rolling":""}" data-i="${i}" aria-pressed="${lock[i]}"><small>${d[0]}</small>${d[0]==="Main"?PROT[dv[i]]:dv[i]}</button>`).join("")}</div>
  <p class="hint">Tap a die to lock it, then roll the rest. +10 XP.</p><button class="btn" id="roll">Roll</button>`;
  stage.querySelectorAll(".die").forEach(b=>b.onclick=()=>{lock[b.dataset.i]=!lock[b.dataset.i];b.setAttribute("aria-pressed",lock[b.dataset.i])});
  $("roll").onclick=roll;
}
function roll(){
  $("roll").disabled=true;let n=0;
  const iv=setInterval(()=>{
    DL.forEach((d,i)=>{if(!lock[i])dv[i]=pick(d[1])});diceRender(true);$("roll").disabled=true;
    if(++n>9){
      clearInterval(iv);diceRender();
      const lim=dv[2]==="15 min"?15:dv[2]==="30 min"?30:999;
      const sc=R.map(r=>({r,s:(r.c===dv[0])+(r.p===dv[1])+(r.t<=lim)+Math.random()*.4})).sort((a,b)=>b.s-a.s);
      const best=sc[0],hit=Math.floor(best.s);
      S.plays.dice++;showResult(best.r,hit===3?"Perfect roll":"Closest dish to your roll ("+hit+" of 3 matched)");award(10,"for rolling");
    }
  },90);
}

/* Library */
let fc=null;
function renderGrid(){
  const q=$("q").value.trim().toLowerCase();
  $("chips").innerHTML=CU.map(c=>`<button class="chip" aria-pressed="${fc===c}" data-c="${c}">${c}</button>`).join("");
  const list=R.filter(r=>(!fc||r.c===fc)&&(!q||(r.n+" "+r.i.join(" ")+" "+r.c).toLowerCase().includes(q)));
  $("grid").innerHTML=list.length?list.map(r=>`<button class="rc" data-id="${r.id}"><span class="cu">${r.c}</span><h3>${r.n}</h3><span class="m"><span>${r.t} min</span><span>${PROT[r.p]}</span>${S.cooked[r.id]?'<span class="done">Cooked</span>':""}</span></button>`).join(""):`<p class="hint">No dishes match. Try a different word.</p>`;
}
$("chips").onclick=e=>{const b=e.target.closest(".chip");if(!b)return;fc=fc===b.dataset.c?null:b.dataset.c;renderGrid()};
$("grid").onclick=e=>{const b=e.target.closest(".rc");if(b)openRecipe(RB[b.dataset.id])};
$("q").oninput=renderGrid;

/* ---------- Supabase (optional) ----------
   With no keys in config.js the site runs entirely in the browser using recipes.js. */
const CFG=window.CQ_CONFIG||{};
const sb=(CFG.SUPABASE_URL&&CFG.SUPABASE_ANON_KEY&&!/YOUR-/.test(CFG.SUPABASE_URL)&&window.supabase)
  ?window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY):null;
let user=null,pushT;
const FRESH=()=>({xp:0,cooked:{},plays:{wheel:0,duel:0,quiz:0,dice:0},badges:{}});
const rowToRecipe=d=>({id:d.id,n:d.name,c:d.cuisine,p:d.protein,t:d.minutes,e:d.effort,v:d.vibes||[],veg:d.vegetarian,w:d.why||"",i:d.ingredients,s:d.steps});

async function loadRecipes(){
  if(sb){
    try{
      const {data,error}=await sb.from("recipes").select("*").order("id");
      if(!error&&data&&data.length){setRecipes(data.map(rowToRecipe));return}
    }catch(e){}
  }
  setRecipes(window.RECIPES);
}
function pushState(){
  clearTimeout(pushT);
  if(!sb||!user)return;
  pushT=setTimeout(async()=>{
    const {error}=await sb.from("player_state").upsert({user_id:user.id,xp:S.xp,cooked:S.cooked,plays:S.plays,badges:S.badges});
    if(error)toast("Could not sync your progress");
  },600);
}
async function syncFromCloud(){
  const {data,error}=await sb.from("player_state").select("*").eq("user_id",user.id).maybeSingle();
  if(error){toast("Could not load your saved progress");return}
  if(data){
    const plays={};
    Object.keys(S.plays).forEach(k=>plays[k]=Math.max(S.plays[k]||0,(data.plays||{})[k]||0));
    S={...S,xp:Math.max(S.xp,data.xp||0),cooked:{...S.cooked,...data.cooked},plays,badges:{...S.badges,...data.badges}};
  }
  save();renderHud();
}
function renderAuth(){
  const b=$("auth");
  b.hidden=!sb;
  b.textContent=user?"Sign out":"Sign in";
  b.title=user?(user.email||""):"Save your progress across devices";
}
$("auth").onclick=()=>{
  if(user){sb.auth.signOut();return}
  $("amsg").textContent="";$("adlg").showModal();
};
$("aclose").onclick=()=>$("adlg").close();
$("adlg").addEventListener("click",e=>{if(e.target===$("adlg"))$("adlg").close()});
$("aform").onsubmit=async e=>{
  e.preventDefault();
  const email=$("email").value.trim();if(!email)return;
  $("asend").disabled=true;$("amsg").textContent="Sending...";
  const {error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:location.href.split("#")[0]}});
  $("asend").disabled=false;
  $("amsg").textContent=error?"That did not work: "+error.message:"Check your email for a sign-in link.";
};

(async()=>{
  await loadRecipes();
  renderHud();gWheel();renderAuth();
  if(sb){
    sb.auth.onAuthStateChange((ev,session)=>{
      user=session?session.user:null;renderAuth();
      if(ev==="SIGNED_OUT"){S=FRESH();saveLocal();renderHud()}
      else if(user){setTimeout(syncFromCloud,0)}
    });
  }
})();
