/* CORMACH Configuratore — v2 (No Prezzi)
   - Data-driven: data/products.json + data/accessori.json
   - Output: modello + codice (articolo)
*/

const state = {
  limit: 20,
  family: "equilibratrici_auto",
  selected: new Set(),
  q: "",
  uso: "auto",
  products: [],
  accessori: []
};

const FLAG_DEFS = {
  equilibratrici_auto: [
    { id:"monitor", label:"Monitor", hint:"Interfaccia evoluta (VD / VDL / VDBL…)" },
    { id:"touch", label:"Touch", hint:"Touchscreen (es. Touch MEC 1000)" },
    { id:"laser", label:"Laser", hint:"Guida applicazione pesi (VDL / VDLL…)" },
    { id:"sonar", label:"Sonar", hint:"Misurazione/diagnosi con sonar" },
    { id:"nls", label:"Bloccaggio NLS", hint:"Centraggio più ripetibile (opzione premium)" },
    { id:"sollevatore", label:"Sollevatore ruota", hint:"Ergonomia: sollevatore ruota (integrato o accessorio)" },
    { id:"rlc", label:"RLC", hint:"Analisi eccentricità (quando previsto)" },
    { id:"mobile_service", label:"Mobile service", hint:"Modelli portatili / alimentazione dedicata" }
  ],
  smontagomme_auto: [
    { id:"motoinverter", label:"Motoinverter (MI)", hint:"Più controllo e coppia gestita" },
    { id:"tubeless_gt", label:"Tubeless (GT)", hint:"Gruppo gonfiaggio / funzioni tubeless" },
    { id:"bb_doppio_disco", label:"BB doppio disco", hint:"Stallonatore evoluto (BB)" },
    { id:"runflat", label:"RunFlat", hint:"Lavoro su runflat (se presente)" },
    { id:"ribassati", label:"Ribassati", hint:"Supporto pneumatici ribassati" },
    { id:"racing", label:"Racing", hint:"Allestimento racing (se presente)" }
  ]
};

function $(sel){ return document.querySelector(sel); }
function el(tag, attrs={}, children=[]){
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{
    if(k==="class") n.className=v;
    else if(k==="html") n.innerHTML=v;
    else n.setAttribute(k,v);
  });
  children.forEach(c=> n.appendChild(c));
  return n;
}

async function loadData(){
  const [p, a] = await Promise.all([
    fetch("./data/products.json").then(r=>r.json()),
    fetch("./data/accessori.json").then(r=>r.json())
  ]);
  state.products = p;
  state.accessori = a;
  renderTabs();
  renderFlags();
  render();
}

function renderTabs(){
  document.querySelectorAll(".tabbtn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".tabbtn").forEach(b=>b.setAttribute("aria-selected","false"));
      btn.setAttribute("aria-selected","true");
      state.family = btn.dataset.family;
      state.selected.clear();
      state.limit = 20;
      renderFlags();
      render();
    });
  });

  $("#q").addEventListener("input", (e)=>{ state.q = e.target.value.trim(); state.limit = 20; render(); });
  $("#uso").addEventListener("change", (e)=>{ state.uso = e.target.value; state.limit = 20; render(); });

  $("#clearBtn").addEventListener("click", ()=>{
    state.selected.clear();
    state.q = ""; $("#q").value = "";
    $("#uso").value = "auto"; state.uso = "auto";
    renderFlags(); state.limit = 20; render(); });

  $("#applyPresetBtn").addEventListener("click", ()=>{
    applyPreset(); renderFlags(); state.limit = 20; render();
  });
}

function applyPreset(){
  state.selected.clear();

  if(state.family === "equilibratrici_auto"){
    if(state.uso === "auto") ["monitor","laser"].forEach(t=>state.selected.add(t));
    if(state.uso === "suv") ["monitor","laser","sonar"].forEach(t=>state.selected.add(t));
    if(state.uso === "furgoni") ["monitor","laser","sonar","nls","sollevatore"].forEach(t=>state.selected.add(t));
    if(state.uso === "truck") ["monitor","laser","sonar","nls","sollevatore"].forEach(t=>state.selected.add(t));
  }

  if(state.family === "smontagomme_auto"){
    if(state.uso === "auto") ["motoinverter"].forEach(t=>state.selected.add(t));
    if(state.uso === "suv") ["motoinverter","tubeless_gt"].forEach(t=>state.selected.add(t));
    if(state.uso === "furgoni") ["motoinverter"].forEach(t=>state.selected.add(t));
    if(state.uso === "truck") ["motoinverter","runflat"].forEach(t=>state.selected.add(t));
    if(state.uso === "moto") ["motoinverter"].forEach(t=>state.selected.add(t));
  }
}

function renderFlags(){
  const box = $("#flags");
  box.innerHTML = "";
  const defs = FLAG_DEFS[state.family] || [];

  defs.forEach(def=>{
    const id = `flag_${def.id}`;
    const wrap = el("label", { class:"chk", for:id });
    const cb = el("input", { type:"checkbox", id });
    cb.checked = state.selected.has(def.id);
    cb.addEventListener("change", ()=>{
      if(cb.checked) state.selected.add(def.id);
      else state.selected.delete(def.id);
      render();
    });
    const txt = el("div", { html:`<b>${def.label}</b><span>${def.hint}</span>` });
    wrap.appendChild(cb); wrap.appendChild(txt); box.appendChild(wrap);
  });
}

function familyProducts(){
  const fam = state.family;

  // Tab Equilibratrici: includi auto (+ truck se uso richiede)
  if(fam === "equilibratrici_auto"){
    let fams = ["equilibratrici_auto"];
    if(state.uso === "truck" || state.uso === "furgoni") fams = ["equilibratrici_auto","equilibratrici_truck"];
    return state.products.filter(p => fams.includes(p.family));
  }

  // Tab Smontagomme: per default includi AUTO + MOTO (e TRUCK se uso richiede)
  if(fam === "smontagomme_auto"){
    let fams = ["smontagomme_auto","smontagomme_moto"];
    if(state.uso === "truck" || state.uso === "furgoni") fams = ["smontagomme_auto","smontagomme_truck","smontagomme_moto"];
    if(state.uso === "moto") fams = ["smontagomme_moto","smontagomme_auto"]; // moto in priorità
    return state.products.filter(p => fams.includes(p.family));
  }

  // fallback
  return state.products.filter(p => p.family === fam);
}

function matchScore(p){
  const tags = new Set(p.tags || []);
  const sel = [...state.selected];
  let score = 0;
  for(const t of sel){
    if(tags.has(t)) score += 2;
    else score -= 3;
  }
  if(state.q){
    const q = state.q.toUpperCase();
    const hay = (p.name + " " + p.code).toUpperCase();
    if(hay.includes(q)) score += 2;
  }
  return score;
}

function filterAndRank(){
  const list = familyProducts();
  const q = state.q.toUpperCase();

  let filtered = list;
  if(state.q){
    filtered = list.filter(p => (p.name + " " + p.code).toUpperCase().includes(q));
  }

  const sel = [...state.selected];
  let strict = filtered;
  if(sel.length){
    strict = filtered.filter(p => sel.every(t => (p.tags || []).includes(t)));
  }

  let ranked = strict.length ? strict : filtered;
  ranked = ranked.map(p => ({...p, _score: matchScore(p)}))
                 .sort((a,b)=> b._score - a._score);

  return { ranked, strictCount: strict.length, total: filtered.length };
}

function accessoriSuggeriti(){
  const fam = state.family.startsWith("equilibratrici")
    ? ["equilibratrici_auto","equilibratrici_truck"]
    : ["smontagomme_auto","smontagomme_truck","smontagomme_moto"];

  const out = [];
  const sel = state.selected;

  for(const a of state.accessori){
    const applies = (a.applies_to || []).some(x => fam.includes(x));
    if(!applies) continue;

    // EQUILIBRATRICI
    if(a.code === "21100303" && (state.uso === "furgoni" || state.uso === "truck")) out.push(a);
    if(a.code === "21100304" && (state.uso === "furgoni" || state.uso === "truck")) out.push(a);
    if((a.code === "21100397" || a.code === "21100399") && (sel.has("sollevatore") || state.uso === "furgoni" || state.uso === "truck")) out.push(a);
    if((a.code === "21100345" || a.code === "21100349") && !sel.has("nls")) out.push(a);

    // SMONTAGOMME
    if(a.code === "20100164" && sel.has("tubeless_gt")) out.push(a);
    if(a.code === "20100165" && (state.uso === "furgoni" || state.uso === "truck")) out.push(a);
    if((a.code === "20100161" || a.code === "20100367" || a.code === "20100387") && (sel.has("runflat") || sel.has("ribassati"))) out.push(a);
    if((a.code === "20100368" || a.code === "20100369") && sel.has("runflat")) out.push(a);
  }

  const seen = new Set();
  return out.filter(a => (seen.has(a.code) ? false : (seen.add(a.code), true)));
}

function render(){
  const { ranked, strictCount, total } = filterAndRank();

  $("#countPill").textContent = `${familyProducts().length} modelli`;
  $("#matchPill").textContent = state.selected.size
    ? (strictCount ? `${strictCount} match perfetti` : `0 match perfetti (mostro alternative)`)
    : `${total} risultati`;

  const res = $("#results");
  res.innerHTML = "";

  const top = ranked.slice(0, state.limit);
  if(!top.length){
    res.appendChild(el("div", { class:"note", html:"Nessun risultato. Prova a rimuovere qualche flag o cambia ricerca." }));
  } else {
    top.forEach((p, idx)=>{
      const tags = (p.tags || []).slice(0, 10).map(t => `<span class="tag">${t}</span>`).join("");
      const box = el("div", { class:"result" });

      const topRow = el("div", { class:"r-top" }, [
        el("div", { html:`<div class="r-name">${idx===0 ? "✅ Consigliato: " : ""}${p.name}</div><div class="tagline">Famiglia: ${p.family.replaceAll("_"," ")}</div>` }),
        el("div", { class:"r-code", html:`Codice: ${p.code}` })
      ]);

      box.appendChild(topRow);
      box.appendChild(el("div", { html: tags }));
      res.appendChild(box);
    });
  }


  // Load more
  if(ranked.length > state.limit){
    const moreBtn = el("button", { class:"primary", style:"width:100%;margin-top:10px;padding:12px;border-radius:12px;" });
    moreBtn.textContent = `Mostra altri (${Math.min(20, ranked.length - state.limit)} )`;
    moreBtn.addEventListener("click", ()=>{
      state.limit = Math.min(ranked.length, state.limit + 20);
      render();
    });
    res.appendChild(moreBtn);
  }

  const accBox = $("#accessoriBox");
  accBox.innerHTML = "";
  const acc = accessoriSuggeriti();
  if(acc.length){
    const html = acc.map(a=>`<div>• <b>${a.name}</b> — <span class="r-code">cod. ${a.code}</span></div>`).join("");
    accBox.appendChild(el("div", { class:"acc", html:`<b>Optional consigliati</b><div class="tagline">In base a uso e flag selezionati.</div><div style="margin-top:8px">${html}</div>` }));
  }
}

loadData().catch(err=>{
  console.error(err);
  alert("Errore nel caricamento dati. Controlla che data/products.json sia presente.");
});
