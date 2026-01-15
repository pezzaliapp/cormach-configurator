/* CORMACH Configuratore — v2 (No Prezzi)
   - Data-driven: data/products.json + data/accessori.json
   - Output: modello + codice (articolo)
*/

const state = {
  limit: 7,                 // ✅ default 7 risultati
  family: "equilibratrici_auto",
  selected: new Set(),
  q: "",
  uso: "auto",
  products: [],
  accessori: [],
  showAccessori: true       // ✅ toggle accessori
};

// Mutua esclusione tra alcuni flag (selezioni uno -> l'altro si disattiva)
const EXCLUSIVE_FLAGS = {
  smontagomme_auto: [
    ["platorello", "piatto"],
    ["motoinverter", "doppia_velocita"] // ✅ MI vs doppia velocità
  ]
};

const FLAG_DEFS = {
  equilibratrici_auto: [
    { id:"monitor", label:"Monitor", hint:"Interfaccia evoluta (VD / VDL / VDBL…)" },
    { id:"touch", label:"Touch", hint:"Touchscreen (es. Touch MEC 1000)" },
    { id:"laser", label:"Laser", hint:"Guida applicazione pesi (VDL / VDLL…)" },
    { id:"sonar", label:"Sonar", hint:"Misurazione/diagnosi con sonar" },

    // ✅ NLS / Versioni P
    { id:"nls", label:"Bloccaggio pneumatico (NLS – Versioni P)", hint:"Centraggio automatico pneumatico. Disponibile sulle versioni P" },

    { id:"sollevatore", label:"Sollevatore ruota", hint:"Ergonomia: sollevatore ruota (integrato o accessorio)" },
    { id:"rlc", label:"RLC", hint:"Analisi eccentricità (quando previsto)" },
    { id:"mobile_service", label:"Mobile service", hint:"Modelli portatili / alimentazione dedicata" }
  ],

  smontagomme_auto: [
    // ✅ tipo serraggio
    { id:"platorello", label:"A platorello", hint:"Bloccaggio con platorelli (PUMA, CM 1200 BB…)" },
    { id:"piatto", label:"A piatto", hint:"Bloccaggio a piatto / autocentrante" },

    // ✅ MI e 2 Vel sono incompatibili (gestito da EXCLUSIVE_FLAGS)
    { id:"motoinverter", label:"Motoinverter (MI)", hint:"Controllo elettronico coppia e velocità" },
    { id:"doppia_velocita", label:"Doppia velocità", hint:"Mandrino con 2 velocità (non compatibile con MI e 1PH)" },

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
  // Tabs
  document.querySelectorAll(".tabbtn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".tabbtn").forEach(b=>b.setAttribute("aria-selected","false"));
      btn.setAttribute("aria-selected","true");

      state.family = btn.dataset.family;
      state.selected.clear();
      state.limit = 7;

      renderFlags();
      render();
    });
  });

  // Ricerca
  $("#q").addEventListener("input", (e)=>{
    state.q = e.target.value.trim();
    state.limit = 7;
    render();
  });

  // Uso
  $("#uso").addEventListener("change", (e)=>{
    state.uso = e.target.value;
    state.limit = 7;
    render();
  });

  // Reset
  $("#clearBtn").addEventListener("click", ()=>{
    state.selected.clear();
    state.q = ""; $("#q").value = "";
    $("#uso").value = "auto"; state.uso = "auto";
    state.limit = 7;
    renderFlags();
    render();
  });

  // Preset
  $("#applyPresetBtn").addEventListener("click", ()=>{
    applyPreset();
    state.limit = 7;
    renderFlags();
    render();
  });

  // ✅ Toggle accessori
  const tbtn = $("#toggleAccBtn");
  if(tbtn){
    // init label
    tbtn.textContent = `Accessori: ${state.showAccessori ? "ON" : "OFF"}`;
    if(!state.showAccessori) tbtn.classList.add("off");

    tbtn.addEventListener("click", ()=>{
      state.showAccessori = !state.showAccessori;
      tbtn.textContent = `Accessori: ${state.showAccessori ? "ON" : "OFF"}`;
      tbtn.classList.toggle("off", !state.showAccessori);
      render();
    });
  }
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
    if(state.uso === "auto") ["motoinverter"].forEach(t=>state.selected.add(t));
    if(state.uso === "suv") ["motoinverter","tubeless_gt"].forEach(t=>state.selected.add(t));
    if(state.uso === "furgoni") ["motoinverter"].forEach(t=>state.selected.add(t));
    if(state.uso === "truck") ["runflat"].forEach(t=>state.selected.add(t));
    if(state.uso === "moto") ["piatto"].forEach(t=>state.selected.add(t));
  }

  // Applica mutue esclusioni (es: MI vs doppia_velocita)
  // (se preset impostasse cose incompatibili, qui le normalizza)
  for(const t of [...state.selected]) applyExclusives(t);
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
        // refresh per aggiornare i check esclusivi
        renderFlags();
      }else{
        state.selected.delete(def.id);
      }
      state.limit = 7;
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

  // Tab Smontagomme: includi AUTO + MOTO, TRUCK se richiesto
  if(fam === "smontagomme_auto"){
    let fams = ["smontagomme_auto","smontagomme_moto"];
    if(state.uso === "truck" || state.uso === "furgoni") fams = ["smontagomme_auto","smontagomme_truck","smontagomme_moto"];
    if(state.uso === "moto") fams = ["smontagomme_moto","smontagomme_auto"];
    return state.products.filter(p => fams.includes(p.family));
  }

  return state.products.filter(p => p.family === fam);
}

// Uso -> boost di scoring per far comparire a destra i prodotti “giusti”
function usageBoost(p){
  const tags = new Set(p.tags || []);
  let b = 0;

  // Smontagomme
  if(state.family === "smontagomme_auto"){
    if(state.uso === "moto"){
      if(p.family === "smontagomme_moto") b += 6;
      if(tags.has("moto")) b += 3;
    }
    if(state.uso === "truck"){
      if(p.family === "smontagomme_truck") b += 6;
      if(tags.has("truck")) b += 3;
    }
    if(state.uso === "furgoni"){
      if(p.family === "smontagomme_truck") b += 3;
      if(tags.has("furgoni")) b += 3;
    }
  }

  // Equilibratrici
  if(state.family === "equilibratrici_auto"){
    if(state.uso === "truck"){
      if(p.family === "equilibratrici_truck") b += 6;
      if(tags.has("truck")) b += 3;
    }
    if(state.uso === "furgoni"){
      if(p.family === "equilibratrici_truck") b += 3;
      if(tags.has("furgoni")) b += 3;
    }
  }

  return b;
}

function matchScore(p){
  const tags = new Set(p.tags || []);
  const sel = [...state.selected];
  let score = 0;

  // base: match con flag
  for(const t of sel){
    if(tags.has(t)) score += 2;
    else score -= 3;
  }

  // boost per "Uso"
  score += usageBoost(p);

  // ricerca testo
  if(state.q){
    const q = state.q.toUpperCase();
    const hay = (p.name + " " + p.code).toUpperCase();
    if(hay.includes(q)) score += 2;
  }

  return score;
}

function applyLogicalConstraints(list){
  // ✅ Vincoli logici Smontagomme:
  // - MI ↔ Doppia velocità (già gestito da EXCLUSIVE in UI)
  // - Doppia velocità NON compatibile con 1PH
  if(state.family !== "smontagomme_auto") return list;

  const wantMI = state.selected.has("motoinverter");
  const want2V = state.selected.has("doppia_velocita");

  let out = list;

  if(want2V){
    out = out.filter(p => {
      const tags = p.tags || [];
      // se il modello è MI -> fuori
      if(tags.includes("motoinverter")) return false;
      // se il modello è 1PH -> fuori
      if(tags.includes("alimentazione_1ph")) return false;
      return true;
    });
  }

  if(wantMI){
    out = out.filter(p => {
      const tags = p.tags || [];
      // se il modello è doppia velocità -> fuori
      if(tags.includes("doppia_velocita")) return false;
      return true;
    });
  }

  return out;
}

function filterAndRank(){
  const list = familyProducts();
  const q = state.q.toUpperCase();

  let filtered = list;
  if(state.q){
    filtered = list.filter(p => (p.name + " " + p.code).toUpperCase().includes(q));
  }

  // vincoli logici prima del match perfetto
  filtered = applyLogicalConstraints(filtered);

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
      const tags = (p.tags || []).slice(0, 12).map(t => `<span class="tag">${t}</span>`).join("");
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

  // ✅ Load more +10
  if(ranked.length > state.limit){
    const moreBtn = el("button", { class:"primary", style:"width:100%;margin-top:10px;padding:12px;border-radius:12px;" });
    moreBtn.textContent = `Mostra altri (${Math.min(10, ranked.length - state.limit)})`;
    moreBtn.addEventListener("click", ()=>{
      state.limit = Math.min(ranked.length, state.limit + 10);
      render();
    });
    res.appendChild(moreBtn);
  }

  // Accessori (toggle)
  const accBox = $("#accessoriBox");
  accBox.innerHTML = "";

  if(state.showAccessori){
    const acc = accessoriSuggeriti();
    if(acc.length){
      const html = acc.map(a=>`<div>• <b>${a.name}</b> — <span class="r-code">cod. ${a.code}</span></div>`).join("");
      accBox.appendChild(el("div", { class:"acc", html:`<b>Optional consigliati</b><div class="tagline">In base a uso e flag selezionati.</div><div style="margin-top:8px">${html}</div>` }));
    }
  }
}

loadData().catch(err=>{
  console.error(err);
  alert("Errore nel caricamento dati. Controlla che data/products.json sia presente.");
});
