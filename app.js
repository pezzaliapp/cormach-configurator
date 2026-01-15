/* CORMACH Configuratore — v3 (No Prezzi)
   - Data-driven: data/products.json + data/accessori.json
   - Output: modello + codice (articolo)
   - Default risultati: 7, poi "Mostra altri" +10
   - Accessori: da matrice compatibilità (S/X) per product_code (come PDF)
*/

const DEFAULT_LIMIT = 7;
const MORE_STEP = 10;

const state = {
  limit: DEFAULT_LIMIT,
  family: "equilibratrici_auto",
  selected: new Set(),
  q: "",
  uso: "auto",
  products: [],
  accessori: []
};

// Mutua esclusione tra alcuni flag (selezioni uno -> l'altro si disattiva)
const EXCLUSIVE_FLAGS = {
  smontagomme_auto: [
    ["platorello", "piatto"],
    ["motoinverter", "doppia_velocita"] // vincolo: MI e 2 Vel non insieme
  ]
};

const FLAG_DEFS = {
  equilibratrici_auto: [
    { id:"monitor", label:"Monitor", hint:"Interfaccia evoluta (VD / VDL / VDBL…)" },
    { id:"touch", label:"Touch", hint:"Touchscreen (es. Touch MEC 1000)" },
    { id:"laser", label:"Laser", hint:"Guida applicazione pesi (VDL / VDLL…)" },
    { id:"sonar", label:"Sonar", hint:"Misurazione/diagnosi con sonar" },

    // NLS / Versioni P
    { id:"nls", label:"Bloccaggio pneumatico (NLS – Versioni P)", hint:"Centraggio automatico pneumatico. Disponibile sulle versioni P" },

    { id:"sollevatore", label:"Sollevatore ruota", hint:"Ergonomia: sollevatore ruota (integrato o accessorio)" },
    { id:"rlc", label:"RLC", hint:"Analisi eccentricità (quando previsto)" },
    { id:"mobile_service", label:"Mobile service", hint:"Modelli portatili / alimentazione dedicata" }
  ],

  smontagomme_auto: [
    { id:"platorello", label:"A platorello", hint:"Bloccaggio con platorelli (PUMA, CM 1200 BB…)" },
    { id:"piatto", label:"A piatto", hint:"Bloccaggio a piatto / autocentrante (molti modelli auto/moto)" },

    { id:"motoinverter", label:"Motoinverter (MI)", hint:"Controllo elettronico coppia e velocità (non è 2 velocità)" },
    { id:"doppia_velocita", label:"Doppia velocità", hint:"Mandrino con 2 velocità di rotazione (no MI, no 1ph)" },

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
  state.products = Array.isArray(p) ? p : [];
  state.accessori = Array.isArray(a) ? a : [];
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
      state.limit = DEFAULT_LIMIT;
      renderFlags();
      render();
    });
  });

  $("#q").addEventListener("input", (e)=>{
    state.q = e.target.value.trim();
    state.limit = DEFAULT_LIMIT;
    render();
  });

  $("#uso").addEventListener("change", (e)=>{
    state.uso = e.target.value;
    state.limit = DEFAULT_LIMIT;
    render();
  });

  $("#clearBtn").addEventListener("click", ()=>{
    state.selected.clear();
    state.q = ""; $("#q").value = "";
    $("#uso").value = "auto"; state.uso = "auto";
    state.limit = DEFAULT_LIMIT;
    renderFlags();
    render();
  });

  $("#applyPresetBtn").addEventListener("click", ()=>{
    applyPreset();
    state.limit = DEFAULT_LIMIT;
    renderFlags();
    render();
  });
}

function applyPreset(){
  state.selected.clear();

  if(state.family === "equilibratrici_auto"){
    if(state.uso === "auto") ["monitor","laser"].forEach(t=>state.selected.add(t));
    if(state.uso === "suv") ["monitor","laser","sonar"].forEach(t=>state.selected.add(t));
    if(state.uso === "furgoni") ["monitor","laser","sonar","nls","sollevatore"].forEach(t=>state.selected.add(t));
    if(state.uso === "truck") ["monitor","laser","sonar","nls","sollevatore"].forEach(t=>state.selected.add(t));
    if(state.uso === "moto") ["monitor"].forEach(t=>state.selected.add(t));
  }

  if(state.family === "smontagomme_auto"){
    // preset “ragionevole” — poi rifiniamo nel prossimo step se vuoi
    if(state.uso === "auto") ["piatto","motoinverter"].forEach(t=>state.selected.add(t));
    if(state.uso === "suv") ["piatto","tubeless_gt","motoinverter"].forEach(t=>state.selected.add(t));
    if(state.uso === "furgoni") ["piatto","motoinverter"].forEach(t=>state.selected.add(t));
    if(state.uso === "truck") ["runflat"].forEach(t=>state.selected.add(t));
    if(state.uso === "moto") ["piatto"].forEach(t=>state.selected.add(t));
  }

  normalizeConstraints();
}

function applyExclusives(defId){
  const groups = (EXCLUSIVE_FLAGS[state.family] || []);
  for(const g of groups){
    if(g.includes(defId)){
      for(const other of g){
        if(other !== defId) state.selected.delete(other);
      }
    }
  }
}

// regole globali: (MI non può essere 2Vel) + (2Vel non può essere 1ph a livello prodotto → gestito in score)
function normalizeConstraints(){
  if(state.family === "smontagomme_auto"){
    if(state.selected.has("doppia_velocita") && state.selected.has("motoinverter")){
      state.selected.delete("motoinverter");
    }
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
      if(cb.checked){
        state.selected.add(def.id);
        applyExclusives(def.id);
        normalizeConstraints();
        renderFlags(); // refresh per aggiornare check esclusivi
      }else{
        state.selected.delete(def.id);
        normalizeConstraints();
      }
      state.limit = DEFAULT_LIMIT;
      render();
    });

    const txt = el("div", { html:`<b>${def.label}</b><span>${def.hint}</span>` });
    wrap.appendChild(cb); wrap.appendChild(txt); box.appendChild(wrap);
  });
}

function familyProducts(){
  const fam = state.family;

  if(fam === "equilibratrici_auto"){
    let fams = ["equilibratrici_auto"];
    if(state.uso === "truck" || state.uso === "furgoni") fams = ["equilibratrici_auto","equilibratrici_truck"];
    return state.products.filter(p => fams.includes(p.family));
  }

  if(fam === "smontagomme_auto"){
    // base: auto + moto, truck se richiesto
    let fams = ["smontagomme_auto","smontagomme_moto"];
    if(state.uso === "truck" || state.uso === "furgoni") fams = ["smontagomme_auto","smontagomme_truck","smontagomme_moto"];

    // ✅ MOTO: include auto SOLO se marcati come adatti anche a moto → PUMA resta fuori
    if(state.uso === "moto") {
      fams = ["smontagomme_moto","smontagomme_auto"];
      const base = state.products.filter(p => fams.includes(p.family));
      return base.filter(p => {
        if(p.family === "smontagomme_moto") return true;
        const tags = new Set(p.tags || []);
        return tags.has("moto_ok") || tags.has("moto");
      });
    }

    return state.products.filter(p => fams.includes(p.family));
  }

  return state.products.filter(p => p.family === fam);
}

// boost per far emergere prodotti coerenti con “Uso”
function usageBoost(p){
  const tags = new Set(p.tags || []);
  let b = 0;

  if(state.family === "smontagomme_auto"){
    if(state.uso === "moto"){
      if(p.family === "smontagomme_moto") b += 8;
      if(tags.has("moto")) b += 3;
    }
    if(state.uso === "truck"){
      if(p.family === "smontagomme_truck") b += 8;
      if(tags.has("truck")) b += 3;
    }
    if(state.uso === "furgoni"){
      if(p.family === "smontagomme_truck") b += 3;
      if(tags.has("furgoni")) b += 3;
    }
  }

  if(state.family === "equilibratrici_auto"){
    if(state.uso === "truck"){
      if(p.family === "equilibratrici_truck") b += 8;
      if(tags.has("truck")) b += 3;
    }
    if(state.uso === "furgoni"){
      if(p.family === "equilibratrici_truck") b += 3;
      if(tags.has("furgoni")) b += 3;
    }
  }

  return b;
}

function constraintPenalty(p){
  const tags = new Set(p.tags || []);
  let pen = 0;

  // vincolo: se user vuole 2 velocità, un prodotto MI non va bene
  if(state.selected.has("doppia_velocita") && tags.has("motoinverter")) pen -= 12;

  // vincolo: se user vuole 2 velocità, un prodotto 1ph / 230V non va bene
  // (assumo tag standard: alimentazione_1ph oppure 230v)
  if(state.selected.has("doppia_velocita") && (tags.has("alimentazione_1ph") || tags.has("230v"))) pen -= 12;

  // inverso: se user vuole MI, e prodotto è 2 velocità (se esiste tag)
  if(state.selected.has("motoinverter") && tags.has("doppia_velocita")) pen -= 8;

  return pen;
}

function matchScore(p){
  const tags = new Set(p.tags || []);
  const sel = [...state.selected];
  let score = 0;

  for(const t of sel){
    if(tags.has(t)) score += 2;
    else score -= 3;
  }

  score += usageBoost(p);
  score += constraintPenalty(p);

  if(state.q){
    const q = state.q.toUpperCase();
    const hay = (p.name + " " + p.code).toUpperCase();
    if(hay.includes(q)) score += 3;
  }

  return score;
}

function filterAndRank(){
  const list = familyProducts();

  let filtered = list;
  if(state.q){
    const q = state.q.toUpperCase();
    filtered = list.filter(p => (p.name + " " + p.code).toUpperCase().includes(q));
  }

  const sel = [...state.selected];

  // strict: tutti i flag selezionati devono essere presenti
  let strict = filtered;
  if(sel.length){
    strict = filtered.filter(p => sel.every(t => (p.tags || []).includes(t)));
  }

  // se strict vuoto, mostro alternative ranked
  let ranked = strict.length ? strict : filtered;

  ranked = ranked.map(p => ({...p, _score: matchScore(p)}))
                 .sort((a,b)=> b._score - a._score);

  return { ranked, strictCount: strict.length, total: filtered.length };
}

/* Accessori da compatibilità stile PDF:
   accessorio.compat = [{ product_code:"00100208", type:"S"|"X" }, ...]
*/
function accessoriCompatibili(rankedProducts){
  const activeCodes = new Set(rankedProducts.map(p => p.code));
  const activeByCode = new Map(rankedProducts.map(p => [p.code, p.name]));

  const famAllowed = state.family.startsWith("equilibratrici")
    ? new Set(["equilibratrici_auto","equilibratrici_truck"])
    : new Set(["smontagomme_auto","smontagomme_truck","smontagomme_moto"]);

  const out = [];

  for(const a of state.accessori){
    const applies = (a.applies_to || []).some(x => famAllowed.has(x));
    if(!applies) continue;

    const compat = Array.isArray(a.compat) ? a.compat : [];
    const hits = compat.filter(c => activeCodes.has(String(c.product_code)));

    if(!hits.length) continue;

    const models = hits.map(h => ({
      code: String(h.product_code),
      name: activeByCode.get(String(h.product_code)) || String(h.product_code),
      type: (h.type || "X").toUpperCase() === "S" ? "S" : "X"
    }));

    // raggruppo per tipo, così è leggibile
    const sList = models.filter(m => m.type === "S");
    const xList = models.filter(m => m.type === "X");

    out.push({
      code: String(a.code || ""),
      name: a.name || a.descrizione || "Accessorio",
      _s: sList,
      _x: xList,
      _modelsCount: models.length
    });
  }

  // ordina per utilità (più modelli coperti)
  out.sort((a,b)=> b._modelsCount - a._modelsCount);
  return out;
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

  // ✅ Mostra altri: +10
  if(ranked.length > state.limit){
    const remaining = ranked.length - state.limit;
    const step = Math.min(MORE_STEP, remaining);

    const moreBtn = el("button", {
      class:"primary",
      style:"width:100%;margin-top:10px;padding:12px;border-radius:12px;"
    });

    moreBtn.textContent = `Mostra altri (${step})`;
    moreBtn.addEventListener("click", ()=>{
      state.limit = Math.min(ranked.length, state.limit + MORE_STEP);
      render();
    });

    res.appendChild(moreBtn);
  }

  // ✅ Accessori: calcolati su TUTTI i risultati filtrati (ranked)
  const accBox = $("#accessoriBox");
  accBox.innerHTML = "";

  const acc = accessoriCompatibili(ranked);
  if(acc.length){
    const html = acc.map(a=>{
      const sTags = a._s.length
        ? `<div class="tagline" style="margin-top:8px"><b>S (standard)</b></div>
           <div>${a._s.map(m=>`<span class="tag">S — ${m.name}</span>`).join("")}</div>`
        : "";

      const xTags = a._x.length
        ? `<div class="tagline" style="margin-top:8px"><b>X (optional)</b></div>
           <div>${a._x.map(m=>`<span class="tag">X — ${m.name}</span>`).join("")}</div>`
        : "";

      return `
        <div class="result" style="border-color: rgba(53,194,107,.18)">
          <div class="r-top">
            <div>
              <div class="r-name">${a.name}</div>
              <div class="tagline">Codice accessorio: <b>${a.code}</b></div>
            </div>
          </div>
          ${sTags}
          ${xTags}
        </div>
      `;
    }).join("");

    accBox.appendChild(el("div", {
      class:"acc",
      html:`<b>Accessori compatibili</b>
            <div class="tagline">Derivati dalla compatibilità (S / X) per i modelli filtrati (come matrice del PDF).</div>
            <div style="margin-top:10px">${html}</div>`
    }));
  } else {
    // se non escono accessori, probabile compat[] ancora non popolato: meglio farlo capire
    accBox.appendChild(el("div", {
      class:"note",
      html:"Accessori: nessuna compatibilità trovata. Verifica che data/accessori.json contenga <b>compat[]</b> con mappa S/X → product_code (come nel PDF)."
    }));
  }
}

loadData().catch(err=>{
  console.error(err);
  alert("Errore nel caricamento dati. Controlla che data/products.json e data/accessori.json siano presenti.");
});
