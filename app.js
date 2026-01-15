/* CORMACH Configuratore — v3 (No Prezzi)
   - Data-driven: data/products.json + data/accessori.json
   - Output: modello + codice (articolo)
   - UX: 7 risultati default + Mostra altri (10)
*/

const state = {
  limit: 7,                 // ✅ default 7
  step: 10,                 // ✅ load more +10
  family: "equilibratrici_auto",
  selected: new Set(),
  q: "",
  uso: "auto",
  showAccessori: true,      // ✅ toggle accessori
  products: [],
  accessori: []
};

// Mutua esclusione tra alcuni flag
const EXCLUSIVE_FLAGS = {
  smontagomme_auto: [
    ["platorello", "piatto"],
    ["motoinverter", "doppia_velocita"] // ✅ MI ≠ 2 Vel
  ]
};

const FLAG_DEFS = {
  equilibratrici_auto: [
    { id:"monitor", label:"Monitor", hint:"Interfaccia evoluta (VD / VDL / VDBL…)" },
    { id:"touch", label:"Touch", hint:"Touchscreen (es. Touch MEC 1000)" },
    { id:"laser", label:"Laser", hint:"Guida applicazione pesi (VDL / VDLL…)" },
    { id:"sonar", label:"Sonar", hint:"Misurazione/diagnosi con sonar" },
    { id:"nls", label:"Bloccaggio pneumatico (NLS – Versioni P)", hint:"Centraggio automatico pneumatico. Disponibile sulle versioni P" },
    { id:"sollevatore", label:"Sollevatore ruota", hint:"Ergonomia: sollevatore ruota (integrato o accessorio)" },
    { id:"rlc", label:"RLC", hint:"Analisi eccentricità (quando previsto)" },
    { id:"mobile_service", label:"Mobile service", hint:"Modelli portatili / alimentazione dedicata" }
  ],

  smontagomme_auto: [
    { id:"platorello", label:"A platorello", hint:"Bloccaggio con platorelli (PUMA, CM 1200 BB…)" },
    { id:"piatto", label:"A piatto", hint:"Bloccaggio a piatto / autocentrante" },

    { id:"motoinverter", label:"Motoinverter (MI)", hint:"Controllo elettronico coppia e velocità (non è 2 Vel)" },
    { id:"doppia_velocita", label:"Doppia velocità", hint:"Mandrino con 2 velocità (tipico 3ph; NON MI; NON 1ph)" },

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
  ensureAccessoriToggle();
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
      state.limit = 7;
      renderFlags();
      render();
    });
  });

  $("#q").addEventListener("input", (e)=>{
    state.q = e.target.value.trim();
    state.limit = 7;
    render();
  });

  // ✅ uso deve cambiare davvero i modelli
  $("#uso").addEventListener("change", (e)=>{
    state.uso = e.target.value;
    state.limit = 7;
    // opzionale: quando cambio uso, tolgo preset incongruenti
    sanitizeSelectedFlags();
    renderFlags();
    render();
  });

  $("#clearBtn").addEventListener("click", ()=>{
    state.selected.clear();
    state.q = ""; $("#q").value = "";
    $("#uso").value = "auto"; state.uso = "auto";
    state.limit = 7;
    renderFlags();
    render();
  });

  $("#applyPresetBtn").addEventListener("click", ()=>{
    applyPreset();
    sanitizeSelectedFlags();
    renderFlags();
    state.limit = 7;
    render();
  });
}

/* ✅ Crea pulsante Accessori (senza toccare index.html) */
function ensureAccessoriToggle(){
  const flagsBox = $("#flags");
  if(!flagsBox) return;

  // se già esiste, non duplicare
  if(document.getElementById("accessoriToggleRow")) return;

  const row = el("div", { id:"accessoriToggleRow", class:"row", style:"margin:10px 0 4px" });
  const lbl = el("span", { class:"pill", html:"Accessori:" });

  const btn = el("button", { class:"ghost", id:"toggleAccessoriBtn", type:"button" });
  btn.textContent = state.showAccessori ? "ON" : "OFF";
  btn.addEventListener("click", ()=>{
    state.showAccessori = !state.showAccessori;
    btn.textContent = state.showAccessori ? "ON" : "OFF";
    render();
  });

  row.appendChild(lbl);
  row.appendChild(btn);

  // inserisco il toggle sopra ai flag
  flagsBox.parentNode.insertBefore(row, flagsBox);
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
    // ✅ preset “sensati” (senza forzare truck su PUMA)
    if(state.uso === "auto") ["platorello","motoinverter"].forEach(t=>state.selected.add(t));
    if(state.uso === "suv") ["piatto","tubeless_gt"].forEach(t=>state.selected.add(t));
    if(state.uso === "furgoni") ["platorello","motoinverter"].forEach(t=>state.selected.add(t));
    if(state.uso === "truck") ["runflat"].forEach(t=>state.selected.add(t)); // truck: famiglia truck, niente PUMA
    if(state.uso === "moto") ["piatto"].forEach(t=>state.selected.add(t));
  }
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

/* ✅ regole logiche richieste dall’utente */
function sanitizeSelectedFlags(){
  // MI non può essere doppia velocità
  if(state.selected.has("motoinverter") && state.selected.has("doppia_velocita")){
    state.selected.delete("doppia_velocita");
  }
  // piatto / platorello esclusivi
  if(state.selected.has("piatto") && state.selected.has("platorello")){
    state.selected.delete("platorello");
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

    // ✅ disabilitazioni “smart”
    if(state.family === "smontagomme_auto"){
      // se MI selezionato, disabilita 2 Vel (e viceversa gestita da exclusives)
      if(def.id === "doppia_velocita" && state.selected.has("motoinverter")){
        cb.disabled = true;
        cb.checked = false;
      }
      if(def.id === "motoinverter" && state.selected.has("doppia_velocita")){
        cb.disabled = true;
        cb.checked = false;
      }
    }

    cb.addEventListener("change", ()=>{
      if(cb.checked){
        state.selected.add(def.id);
        applyExclusives(def.id);
        sanitizeSelectedFlags();
        renderFlags(); // refresh UI
      }else{
        state.selected.delete(def.id);
      }
      state.limit = 7;
      render();
    });

    const hint = cb.disabled
      ? `${def.hint} <span style="display:block;color:rgba(242,181,63,.9);font-size:12px;margin-top:3px">Non compatibile con i flag già selezionati.</span>`
      : def.hint;

    const txt = el("div", { html:`<b>${def.label}</b><span>${hint}</span>` });
    wrap.appendChild(cb); wrap.appendChild(txt); box.appendChild(wrap);
  });
}

/* ✅ filtro famiglie davvero coerente con “Uso”
   - Truck: solo truck (PUMA sparisce)
   - Moto: solo moto (priorità)
*/
function familyProducts(){
  const fam = state.family;

  if(fam === "equilibratrici_auto"){
    if(state.uso === "truck") {
      return state.products.filter(p => p.family === "equilibratrici_truck");
    }
    if(state.uso === "furgoni") {
      // furgoni: auto + truck (mix)
      return state.products.filter(p => ["equilibratrici_auto","equilibratrici_truck"].includes(p.family));
    }
    // auto/suv/moto: solo auto (di default)
    return state.products.filter(p => p.family === "equilibratrici_auto");
  }

  if(fam === "smontagomme_auto"){
    if(state.uso === "truck"){
      return state.products.filter(p => p.family === "smontagomme_truck");
    }
    if(state.uso === "moto"){
      return state.products.filter(p => p.family === "smontagomme_moto");
    }
    if(state.uso === "furgoni"){
      // furgoni: auto (+ truck se presente) ma NON forziamo truck-only
      return state.products.filter(p => ["smontagomme_auto","smontagomme_truck"].includes(p.family));
    }
    // auto/suv: auto (+ moto solo se vuoi, ma qui lo evitiamo per non “sporcare”)
    return state.products.filter(p => p.family === "smontagomme_auto");
  }

  return state.products.filter(p => p.family === fam);
}

/* ✅ scoring: fa emergere risultati pertinenti anche senza flag */
function usageBoost(p){
  const tags = new Set(p.tags || []);
  let b = 0;

  if(state.family === "smontagomme_auto"){
    if(state.uso === "suv"){
      if(tags.has("tubeless_gt")) b += 3;
      if(tags.has("piatto")) b += 2;
    }
    if(state.uso === "furgoni"){
      if(tags.has("furgoni")) b += 3;
      if(tags.has("platorello")) b += 1;
    }
  }

  if(state.family === "equilibratrici_auto"){
    if(state.uso === "suv"){
      if(tags.has("sonar")) b += 2;
      if(tags.has("laser")) b += 2;
    }
    if(state.uso === "furgoni"){
      if(tags.has("sollevatore")) b += 2;
      if(tags.has("nls")) b += 2;
    }
  }

  return b;
}

function matchScore(p){
  const tags = new Set(p.tags || []);
  const sel = [...state.selected];
  let score = 0;

  // match con flag
  for(const t of sel){
    if(tags.has(t)) score += 2;
    else score -= 3;
  }

  // boost per uso
  score += usageBoost(p);

  // ricerca testo
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

  // strict match su flag
  if(sel.length){
    strict = filtered.filter(p => sel.every(t => (p.tags || []).includes(t)));
  }

  // fallback: se strict vuoto, mostra comunque alternative ordinate
  let ranked = strict.length ? strict : filtered;

  ranked = ranked
    .map(p => ({...p, _score: matchScore(p)}))
    .sort((a,b)=> b._score - a._score);

  return { ranked, strictCount: strict.length, total: filtered.length };
}

/* ✅ Accessori: mostra tutti quelli compatibili con la famiglia attiva.
   - Se accessori.json contiene mappe compatibilità (models/compat/compatible_with), le visualizziamo.
*/
function accessoriForCurrent(){
  const currentFamilies =
    state.family.startsWith("equilibratrici")
      ? (state.uso === "truck" ? ["equilibratrici_truck"]
        : state.uso === "furgoni" ? ["equilibratrici_auto","equilibratrici_truck"]
        : ["equilibratrici_auto"])
      : (state.uso === "truck" ? ["smontagomme_truck"]
        : state.uso === "furgoni" ? ["smontagomme_auto","smontagomme_truck"]
        : state.uso === "moto" ? ["smontagomme_moto"]
        : ["smontagomme_auto"]);

  const out = state.accessori.filter(a=>{
    const applies = Array.isArray(a.applies_to) ? a.applies_to : [];
    return applies.some(x => currentFamilies.includes(x));
  });

  // opzionale: filtri “piatto/platorello” se l’accessorio ha tags coerenti
  const sel = state.selected;
  const want = [];
  if(sel.has("piatto")) want.push("piatto");
  if(sel.has("platorello")) want.push("platorello");

  if(want.length){
    return out.filter(a=>{
      const at = new Set(a.tags || []);
      // se l’accessorio non ha tag specifici → lo teniamo
      const hasSpecific = at.has("piatto") || at.has("platorello");
      if(!hasSpecific) return true;
      return want.some(w => at.has(w));
    });
  }

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
      const tags = (p.tags || []).slice(0, 12).map(t => `<span class="tag">${t}</span>`).join("");
      const box = el("div", { class:"result" });

      const topRow = el("div", { class:"r-top" }, [
        el("div", { html:`<div class="r-name">${idx===0 ? "✅ Consigliato: " : ""}${p.name}</div><div class="tagline">Famiglia: ${String(p.family||"").replaceAll("_"," ")}</div>` }),
        el("div", { class:"r-code", html:`Codice: ${p.code}` })
      ]);

      box.appendChild(topRow);
      box.appendChild(el("div", { html: tags }));
      res.appendChild(box);
    });
  }

  // ✅ Load more: +10
  if(ranked.length > state.limit){
    const remaining = ranked.length - state.limit;
    const moreBtn = el("button", { class:"primary", style:"width:100%;margin-top:10px;padding:12px;border-radius:12px;" });
    moreBtn.textContent = `Mostra altri (${Math.min(state.step, remaining)})`;
    moreBtn.addEventListener("click", ()=>{
      state.limit = Math.min(ranked.length, state.limit + state.step);
      render();
    });
    res.appendChild(moreBtn);
  }

  // ✅ Accessori box
  const accBox = $("#accessoriBox");
  accBox.innerHTML = "";

  if(state.showAccessori){
    const acc = accessoriForCurrent();
    if(acc.length){
      const html = acc.map(a=>{
        const code = a.code || a.codice || "";
        const name = a.name || a.descrizione || a.title || "Accessorio";
        const extra =
          Array.isArray(a.models) ? ` <span class="tagline" style="margin-top:6px">Compatibile con: ${a.models.join(", ")}</span>` :
          Array.isArray(a.compatible_with) ? ` <span class="tagline" style="margin-top:6px">Compatibile con: ${a.compatible_with.join(", ")}</span>` :
          (typeof a.compat === "string" ? ` <span class="tagline" style="margin-top:6px">${a.compat}</span>` : "");

        return `<div style="margin:6px 0">• <b>${name}</b> — <span class="r-code">cod. ${code}</span>${extra}</div>`;
      }).join("");

      accBox.appendChild(
        el("div", {
          class:"acc",
          html:`<b>Accessori compatibili</b>
                <div class="tagline">Filtrati per famiglia + uso (e piatto/platorello se disponibili nei tag).</div>
                <div style="margin-top:8px">${html}</div>`
        })
      );
    } else {
      accBox.appendChild(el("div", { class:"note", html:"Nessun accessorio disponibile per questa combinazione (dataset accessori.json da completare con tabella PDF)." }));
    }
  }
}

loadData().catch(err=>{
  console.error(err);
  alert("Errore nel caricamento dati. Controlla che data/products.json e data/accessori.json siano presenti.");
});
