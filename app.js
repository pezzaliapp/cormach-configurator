/* CORMACH Configuratore — v4.4 (No Prezzi)
   FIX principali:
   - Truck: include famiglie truck anche se family nel JSON varia (match robusto)
   - A PIATTO: riconosce "PIATTO" in name/descrizione + evita falsi positivi platorello
   - A PLATORELLO: riconosce anche "PLATORELLO" in name/descrizione
   - resto invariato: tabs/pill/preset, risultati 7 poi +10, accessori toggle no duplicati
*/

const DEFAULT_LIMIT = 7;
const MORE_STEP = 10;

const state = {
  limit: DEFAULT_LIMIT,
  family: "equilibratrici_auto",
  selected: new Set(),
  q: "",
  uso: "auto",
  showAccessori: true,
  products: [],
  accessori: []
};

const EXCLUSIVE_FLAGS = {
  smontagomme_auto: [
    ["platorello", "piatto"],
    ["motoinverter", "doppia_velocita"]
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

    { id:"motoinverter", label:"Motoinverter (MI)", hint:"Controllo elettronico coppia e velocità (non è 2 velocità)" },
    { id:"doppia_velocita", label:"Doppia velocità", hint:"Mandrino con 2 velocità (no MI, no 1ph)" },

    { id:"tubeless_gt", label:"Tubeless (GT)", hint:"Gruppo gonfiaggio / funzioni tubeless" },
    { id:"bb_doppio_disco", label:"BB doppio disco", hint:"Stallonatore evoluto (BB)" },
    { id:"runflat", label:"RunFlat", hint:"Lavoro su runflat (se presente)" },
    { id:"ribassati", label:"Ribassati", hint:"Supporto pneumatici ribassati" },
    { id:"racing", label:"Racing", hint:"Allestimento racing (se presente)" }
  ]
};

function byId(id){ return document.getElementById(id); }
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

function upper(s){ return String(s || "").toUpperCase(); }

function tagsOf(p){
  const t = Array.isArray(p.tags) ? p.tags : [];
  return new Set(t);
}

function textOf(p){
  // prova a leggere anche descrizione/descrizione_breve/note se esistono
  const parts = [
    p?.name,
    p?.descrizione,
    p?.description,
    p?.note
  ].filter(Boolean);
  return upper(parts.join(" | "));
}

/* ✅ Match robusto: fallback SOLO per platorello/piatto */
function hasFlag(p, flag){
  const tags = tagsOf(p);
  if(tags.has(flag)) return true;

  const txt = textOf(p);

  if(flag === "platorello"){
    // keyword + modelli tipici
    if(txt.includes("PLATORELLO")) return true;
    if(/\bPUMA\b/.test(txt)) return true;
    if(/\b1200\b/.test(txt) || /\b1200BB\b/.test(txt)) return true;
    return false;
  }

  if(flag === "piatto"){
    // keyword PIATTO (auto) oppure BIKE/moto
    if(txt.includes("PIATTO")) return true;
    if(/\bBIKE\b/.test(txt)) return true;
    if(tags.has("moto")) return true;

    // fallback “anti-platorello”: se NON è platorello e nel testo c’è qualche indizio
    // (qui volutamente conservativo: senza PIATTO/BIKE/moto NON lo considero piatto)
    return false;
  }

  return false;
}

async function loadData(){
  const [p, a] = await Promise.all([
    fetch("./data/products.json").then(r=>r.json()),
    fetch("./data/accessori.json").then(r=>r.json())
  ]);

  state.products = Array.isArray(p) ? p : [];
  state.accessori = Array.isArray(a) ? a : [];

  bindUI();
  bindAccessoriToggle();
  renderFlags();
  render();
}

/* ===================== UI ===================== */
function bindUI(){
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

  const q = byId("q");
  if(q){
    q.addEventListener("input", (e)=>{
      state.q = e.target.value.trim();
      state.limit = DEFAULT_LIMIT;
      render();
    });
  }

  const uso = byId("uso");
  if(uso){
    uso.addEventListener("change", (e)=>{
      state.uso = e.target.value;
      state.limit = DEFAULT_LIMIT;
      render();
    });
  }

  const clearBtn = byId("clearBtn");
  if(clearBtn){
    clearBtn.addEventListener("click", ()=>{
      state.selected.clear();
      state.q = "";
      if(q) q.value = "";
      if(uso){ uso.value = "auto"; state.uso = "auto"; }
      state.limit = DEFAULT_LIMIT;
      renderFlags();
      render();
    });
  }

  const presetBtn = byId("applyPresetBtn");
  if(presetBtn){
    presetBtn.addEventListener("click", ()=>{
      applyPreset();
      state.limit = DEFAULT_LIMIT;
      renderFlags();
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
    if(state.uso === "auto") ["platorello"].forEach(t=>state.selected.add(t));
    if(state.uso === "furgoni") ["platorello"].forEach(t=>state.selected.add(t));
    if(state.uso === "suv") ["piatto","tubeless_gt"].forEach(t=>state.selected.add(t));
    if(state.uso === "moto") ["piatto"].forEach(t=>state.selected.add(t));
    if(state.uso === "truck") ["runflat"].forEach(t=>state.selected.add(t));
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

function normalizeConstraints(){
  if(state.family === "smontagomme_auto"){
    if(state.selected.has("doppia_velocita") && state.selected.has("motoinverter")){
      state.selected.delete("motoinverter");
    }
  }
}

function renderFlags(){
  const box = byId("flags");
  if(!box) return;

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
        renderFlags();
      } else {
        state.selected.delete(def.id);
        normalizeConstraints();
      }
      state.limit = DEFAULT_LIMIT;
      render();
    });

    const txt = el("div", { html:`<b>${def.label}</b><span>${def.hint}</span>` });
    wrap.appendChild(cb);
    wrap.appendChild(txt);
    box.appendChild(wrap);
  });
}

/* ===================== ACCESSORI TOGGLE (NO DUPLICATI) ===================== */
function findLeftAccessoriButton(){
  const leftCard = document.querySelector('section.card[aria-label="Filtri"]') || document.querySelectorAll(".card")[0];
  if(!leftCard) return null;
  const buttons = leftCard.querySelectorAll("button");
  for(const b of buttons){
    const t = (b.textContent || "").trim();
    if(/^Accessori\s*:/i.test(t) || t.toLowerCase() === "accessori") return b;
  }
  return null;
}

function bindAccessoriToggle(){
  const leftBtn = findLeftAccessoriButton();
  if(leftBtn){
    leftBtn.id = "toggleAccessoriBtn";
    leftBtn.type = "button";
    leftBtn.disabled = false;
    leftBtn.style.pointerEvents = "auto";
    leftBtn.onclick = null;
    leftBtn.addEventListener("click", ()=>{
      state.showAccessori = !state.showAccessori;
      paintAccessoriToggle();
      render();
    });
    paintAccessoriToggle();
    return;
  }

  if(byId("toggleAccessoriBtn")) {
    paintAccessoriToggle();
    return;
  }

  const hd = document.querySelector('section.card[aria-label="Risultati"] .hd') ||
             (document.querySelectorAll(".card")[1] ? document.querySelectorAll(".card")[1].querySelector(".hd") : null);
  if(!hd) return;

  const btn = el("button", { id:"toggleAccessoriBtn", class:"ghost", type:"button" });
  btn.style.padding = "6px 10px";
  btn.style.borderRadius = "999px";
  btn.style.border = "1px solid rgba(232,238,247,.14)";
  btn.style.background = "rgba(0,0,0,.10)";

  btn.addEventListener("click", ()=>{
    state.showAccessori = !state.showAccessori;
    paintAccessoriToggle();
    render();
  });

  hd.appendChild(btn);
  paintAccessoriToggle();
}

function paintAccessoriToggle(){
  const btn = byId("toggleAccessoriBtn");
  if(!btn) return;
  btn.textContent = `Accessori: ${state.showAccessori ? "ON" : "OFF"}`;
  btn.style.opacity = state.showAccessori ? "1" : ".65";
}

/* ===================== DATA FILTERING ===================== */
function isFamily(p, key){
  // key esempio: "smontagomme_truck" — match robusto
  const f = String(p?.family || "");
  return f === key || f.startsWith(key) || f.includes(key);
}

function familyProducts(){
  const fam = state.family;

  if(fam === "equilibratrici_auto"){
    let fams = ["equilibratrici_auto"];
    if(state.uso === "truck" || state.uso === "furgoni") fams = ["equilibratrici_auto","equilibratrici_truck"];
    return state.products.filter(p => fams.some(k => isFamily(p, k)));
  }

  if(fam === "smontagomme_auto"){
    // NB: qui serve davvero truck quando uso=truck
    let fams = ["smontagomme_auto","smontagomme_moto"];
    if(state.uso === "truck" || state.uso === "furgoni") fams = ["smontagomme_auto","smontagomme_truck","smontagomme_moto"];

    if(state.uso === "moto"){
      fams = ["smontagomme_moto","smontagomme_auto"];
      const base = state.products.filter(p => fams.some(k => isFamily(p, k)));
      return base.filter(p=>{
        if(isFamily(p, "smontagomme_moto")) return true;
        const tags = tagsOf(p);
        return tags.has("moto_ok") || tags.has("moto");
      });
    }

    return state.products.filter(p => fams.some(k => isFamily(p, k)));
  }

  return state.products.filter(p => isFamily(p, fam));
}

function applyStructuralFilters(list){
  if(state.family !== "smontagomme_auto") return list;

  const wantPlatorello = state.selected.has("platorello");
  const wantPiatto = state.selected.has("piatto");

  if(!wantPlatorello && !wantPiatto) return list;

  return list.filter(p=>{
    if(wantPlatorello) return hasFlag(p, "platorello");
    if(wantPiatto) return hasFlag(p, "piatto") && !hasFlag(p, "platorello"); // evita contaminazioni
    return true;
  });
}

function constraintPenalty(p){
  const tags = tagsOf(p);
  let pen = 0;

  if(state.selected.has("doppia_velocita") && tags.has("motoinverter")) pen -= 12;
  if(state.selected.has("doppia_velocita") && (tags.has("alimentazione_1ph") || tags.has("230v"))) pen -= 12;

  return pen;
}

function matchScore(p){
  const sel = [...state.selected];
  let score = 0;

  for(const t of sel){
    if(hasFlag(p, t)) score += 2;
    else score -= 3;
  }

  score += constraintPenalty(p);

  if(state.q){
    const q = upper(state.q);
    const hay = upper(p.name) + " " + upper(p.code) + " " + textOf(p);
    if(hay.includes(q)) score += 3;
  }

  return score;
}

function filterAndRank(){
  let list = familyProducts();

  if(state.q){
    const q = upper(state.q);
    list = list.filter(p => (upper(p.name) + " " + upper(p.code) + " " + textOf(p)).includes(q));
  }

  list = applyStructuralFilters(list);

  const sel = [...state.selected];

  let strict = list;
  if(sel.length){
    strict = list.filter(p => sel.every(t => hasFlag(p, t)));
  }

  const ranked = (strict.length ? strict : list)
    .map(p => ({...p, _score: matchScore(p)}))
    .sort((a,b)=> b._score - a._score);

  return { ranked, strictCount: strict.length, total: list.length };
}

/* ===================== ACCESSORI ===================== */
function accessoriCompatibili(visibleProducts){
  if(!Array.isArray(visibleProducts) || !visibleProducts.length) return [];

  const activeCodes = new Set(visibleProducts.map(p => String(p.code)));
  const nameByCode = new Map(visibleProducts.map(p => [String(p.code), p.name]));

  const famAllowed = state.family.startsWith("equilibratrici")
    ? new Set(["equilibratrici_auto","equilibratrici_truck"])
    : new Set(["smontagomme_auto","smontagomme_truck","smontagomme_moto"]);

  const out = [];

  for(const a of state.accessori){
    if(!(a.applies_to || []).some(f => [...famAllowed].some(k => String(f).includes(k)))) continue;

    const compat = Array.isArray(a.compat) ? a.compat : [];
    if(!compat.length) continue;

    const hits = compat.filter(c => activeCodes.has(String(c.product_code)));
    if(!hits.length) continue;

    out.push({
      code: String(a.code || ""),
      name: a.name || a.descrizione || "Accessorio",
      _models: hits.map(h => ({
        code: String(h.product_code),
        name: nameByCode.get(String(h.product_code)) || String(h.product_code),
        type: (h.type || "X").toUpperCase() === "S" ? "S" : "X"
      }))
    });
  }

  out.sort((a,b)=> b._models.length - a._models.length);
  return out;
}

/* ===================== RENDER ===================== */
function render(){
  paintAccessoriToggle();

  const { ranked, strictCount, total } = filterAndRank();

  const countPill = byId("countPill");
  if(countPill) countPill.textContent = `${familyProducts().length} modelli`;

  const matchPill = byId("matchPill");
  if(matchPill){
    matchPill.textContent = state.selected.size
      ? (strictCount ? `${strictCount} match perfetti` : `0 match perfetti (mostro alternative)`)
      : `${total} risultati`;
  }

  const res = byId("results");
  if(!res) return;
  res.innerHTML = "";

  const top = ranked.slice(0, state.limit);

  if(!top.length){
    const msg = (state.selected.has("platorello") || state.selected.has("piatto"))
      ? "Nessun risultato per questo tipo (piatto/platorello). Prova a togliere altri flag."
      : "Nessun risultato. Prova a rimuovere qualche flag o cambia ricerca.";
    res.appendChild(el("div", { class:"note", html: msg }));
  } else {
    top.forEach((p, idx)=>{
      const tags = (Array.isArray(p.tags) ? p.tags : []).slice(0, 10).map(t => `<span class="tag">${t}</span>`).join("");
      const box = el("div", { class:"result" });

      const famLabel = String(p.family || "").replaceAll("_"," ");
      const topRow = el("div", { class:"r-top" }, [
        el("div", { html:`<div class="r-name">${idx===0 ? "✅ Consigliato: " : ""}${p.name}</div><div class="tagline">Famiglia: ${famLabel}</div>` }),
        el("div", { class:"r-code", html:`Codice: ${p.code}` })
      ]);

      box.appendChild(topRow);
      box.appendChild(el("div", { html: tags }));
      res.appendChild(box);
    });
  }

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

  const accBox = byId("accessoriBox");
  if(!accBox) return;
  accBox.innerHTML = "";

  if(!state.showAccessori) return;

  const acc = accessoriCompatibili(top);

  if(acc.length){
    const html = acc.map(a=>{
      const tags = a._models
        .slice(0, 10)
        .map(m => `<span class="tag">${m.type} — ${m.name}</span>`)
        .join("");

      const more = a._models.length > 10
        ? `<div class="tagline" style="margin-top:6px">+ altri ${a._models.length - 10} modelli compatibili…</div>`
        : "";

      return `
        <div class="result" style="border-color: rgba(53,194,107,.18)">
          <div class="r-top">
            <div>
              <div class="r-name">${a.name}</div>
              <div class="tagline">Codice accessorio: <b>${a.code}</b></div>
            </div>
          </div>
          <div style="margin-top:8px">${tags}</div>
          ${more}
        </div>
      `;
    }).join("");

    accBox.appendChild(el("div", {
      class:"acc",
      html:`<b>Accessori compatibili</b>
            <div class="tagline">Derivati dalla compatibilità (S / X) per i modelli visibili.</div>
            <div style="margin-top:10px">${html}</div>`
    }));
  } else {
    accBox.appendChild(el("div", {
      class:"note",
      html:"Accessori: nessuna compatibilità trovata. (Serve accessori.json con <b>compat[]</b> S/X → product_code)"
    }));
  }
}

loadData().catch(err=>{
  console.error(err);
  alert("Errore nel caricamento dati. Controlla che data/products.json e data/accessori.json siano presenti.");
});
