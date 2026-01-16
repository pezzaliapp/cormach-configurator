/* CORMACH Configuratore — v4.5 (No Prezzi)
   FIX principali:
   - Smontagomme: "Truck/pesante" => SOLO smontagomme_truck (niente auto/moto mischiati)
   - Strutturale:
      * A PLATORELLO => SOLO PUMA + CM 1200/1200BB
      * A PIATTO     => TUTTI GLI ALTRI (auto), escludendo moto + platorello
      * Moto => piatto mostra solo moto
   - Flag (BB / Runflat / Ribassati / Racing / GT / 2Vel) funzionano anche senza tag (euristiche su name)
   - Doppia velocità: mai su moto
   - Accessori ON/OFF: usa bottone sinistra se c'è, altrimenti ne crea UNO solo a destra
   - Default risultati 7, poi +10
*/

const DEFAULT_LIMIT = 7;
const MORE_STEP = 10;

const state = {
  limit: DEFAULT_LIMIT,
  family: "equilibratrici_auto", // tab default
  selected: new Set(),
  q: "",
  uso: "auto",
  showAccessori: true,
  products: [],
  accessori: []
};

// Mutua esclusione tra flag (solo dove ha senso)
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
    { id:"nls", label:"Bloccaggio pneumatico (NLS – Versioni P)", hint:"Centraggio pneumatico (versioni P)" },
    { id:"sollevatore", label:"Sollevatore ruota", hint:"Ergonomia: sollevatore ruota" },
    { id:"rlc", label:"RLC", hint:"Analisi eccentricità (quando previsto)" },
    { id:"mobile_service", label:"Mobile service", hint:"Portatile / alimentazione dedicata" }
  ],

  smontagomme_auto: [
    { id:"platorello", label:"A platorello", hint:"PUMA, CM 1200 BB…" },
    { id:"piatto", label:"A piatto", hint:"Autocentrante / leverless / ecc." },

    { id:"motoinverter", label:"Motoinverter (MI)", hint:"Regolazione elettronica (non è 2 velocità)" },
    { id:"doppia_velocita", label:"Doppia velocità", hint:"Mandrino 2 velocità (no MI, no 1ph, no moto)" },

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
function tagsOf(p){ return new Set(Array.isArray(p?.tags) ? p.tags : []); }

function textOf(p){
  const parts = [p?.name, p?.descrizione, p?.description, p?.note].filter(Boolean);
  return upper(parts.join(" | "));
}

function isMoto(p){
  const tags = tagsOf(p);
  const t = textOf(p);
  return tags.has("moto") || tags.has("bike") || /\bBIKE\b/.test(t) || /\bMOTO\b/.test(t);
}

function isTruck(p){
  const tags = tagsOf(p);
  const t = textOf(p);
  return tags.has("truck") || /\bTRUCK\b/.test(t) || /\bPESANTE\b/.test(t);
}

/* ----------------- FLAG MATCH (robusto) ----------------- */
function hasFlag(p, flag){
  const tags = tagsOf(p);
  const t = textOf(p);

  // tag diretto
  if(tags.has(flag)) return true;

  // --- Smontagomme strutturali ---
  if(flag === "platorello"){
    // SOLO PUMA e CM 1200/1200BB (come richiesto)
    if(/\bPUMA\b/.test(t)) return true;
    if(/\bCM\s*1200\b/.test(t)) return true;
    if(/\b1200BB\b/.test(t)) return true;
    if(/\b1200\b/.test(t) && /\bCM\b/.test(t)) return true;
    return false;
  }

  if(flag === "piatto"){
    // Non usare solo keyword PIATTO (che spesso non c'è).
    // Regola pratica:
    // - se è moto => piatto = sì
    // - se NON è moto e NON è platorello => piatto = sì
    // (evita il bug "A piatto mostra solo moto")
    if(isMoto(p)) return true;
    if(hasFlag(p, "platorello")) return false;
    return true;
  }

  // --- Smontagomme flags su testo ---
  if(flag === "tubeless_gt"){
    return tags.has("tubeless_gt") || /\bGT\b/.test(t) || /\bTUBELESS\b/.test(t);
  }

  if(flag === "bb_doppio_disco"){
    // "BB" nel modello
    return tags.has("bb") || tags.has("bb_doppio_disco") || /\bBB\b/.test(t);
  }

  if(flag === "runflat"){
    return tags.has("runflat") || /\bRUNFLAT\b/.test(t);
  }

  if(flag === "ribassati"){
    return tags.has("ribassati") || /\bRIBASS/.test(t) || /\bLOW\b/.test(t);
  }

  if(flag === "racing"){
    return tags.has("racing") || /\bRACING\b/.test(t) || /\bRAC\b/.test(t);
  }

  if(flag === "motoinverter"){
    return tags.has("motoinverter") || /\bMI\b/.test(t) || /\bMOTOINVERTER\b/.test(t);
  }

  if(flag === "doppia_velocita"){
    // Mai su moto
    if(isMoto(p)) return false;

    // tag o testo "2 VEL", "2VEL", "2 VELOCITA"
    if(tags.has("doppia_velocita")) return true;
    if(/\b2\s*VEL\b/.test(t) || /\b2VEL\b/.test(t) || /\b2\s*VELOCIT/.test(t)) return true;

    // alcuni tuoi record non hanno tag: ok.
    return false;
  }

  // --- Equilibratrici flags: prova anche su testo (quando i tag mancano) ---
  if(flag === "monitor") return tags.has("monitor") || /\bVDL\b|\bVDLL\b|\bVDBL\b|\bMONITOR\b/.test(t);
  if(flag === "laser") return tags.has("laser") || /\bLASER\b/.test(t);
  if(flag === "touch") return tags.has("touch") || /\bTOUCH\b/.test(t);
  if(flag === "sonar") return tags.has("sonar") || /\bSONAR\b/.test(t);
  if(flag === "nls") return tags.has("nls") || /\b\-P\b/.test(t) || /\bPNEUMATICA\b/.test(t);
  if(flag === "sollevatore") return tags.has("sollevatore") || /\bLIFT\b/.test(t) || /\bSOLLEVATORE\b/.test(t);
  if(flag === "rlc") return tags.has("rlc") || /\bRLC\b/.test(t);
  if(flag === "mobile_service") return tags.has("mobile_service") || /\b12V\b/.test(t) || /\bBAT\b/.test(t);

  // default: no match
  return false;
}

/* ----------------- DATA LOAD ----------------- */
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

/* ----------------- UI BIND ----------------- */
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

      // quando cambi USO, ripulisci flag incompatibili (es. doppia_velocita su moto)
      normalizeConstraints();
      renderFlags();
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
    if(state.uso === "truck") ["monitor","sonar"].forEach(t=>state.selected.add(t)); // più conservativo
    if(state.uso === "moto") ["mobile_service"].forEach(t=>state.selected.add(t));
  }

  if(state.family === "smontagomme_auto"){
    if(state.uso === "auto" || state.uso === "furgoni") state.selected.add("piatto");
    if(state.uso === "suv") ["piatto","tubeless_gt"].forEach(t=>state.selected.add(t));
    if(state.uso === "moto") state.selected.add("piatto");
    if(state.uso === "truck") state.selected.add("runflat");
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
    // doppia velocità non può coesistere con MI
    if(state.selected.has("doppia_velocita") && state.selected.has("motoinverter")){
      state.selected.delete("motoinverter");
    }
    // su moto: niente doppia velocità
    if(state.uso === "moto"){
      state.selected.delete("doppia_velocita");
    }
    // su truck: platorello/piatto non hanno senso -> togli per evitare filtri errati
    if(state.uso === "truck"){
      state.selected.delete("platorello");
      state.selected.delete("piatto");
    }
  }
}

function renderFlags(){
  const box = byId("flags");
  if(!box) return;

  box.innerHTML = "";
  const defs = FLAG_DEFS[state.family] || [];

  defs.forEach(def=>{
    // regole UI: nascondi doppia_velocita se moto
    if(state.family === "smontagomme_auto" && state.uso === "moto" && def.id === "doppia_velocita"){
      return;
    }
    // regole UI: nascondi platorello/piatto se truck
    if(state.family === "smontagomme_auto" && state.uso === "truck" && (def.id === "platorello" || def.id === "piatto")){
      return;
    }

    const id = `flag_${def.id}`;
    const wrap = el("label", { class:"chk", for:id });
    const cb = el("input", { type:"checkbox", id });

    cb.checked = state.selected.has(def.id);

    cb.addEventListener("change", ()=>{
      if(cb.checked){
        state.selected.add(def.id);
        applyExclusives(def.id);
      } else {
        state.selected.delete(def.id);
      }
      normalizeConstraints();
      renderFlags();
      state.limit = DEFAULT_LIMIT;
      render();
    });

    const txt = el("div", { html:`<b>${def.label}</b><span>${def.hint}</span>` });
    wrap.appendChild(cb);
    wrap.appendChild(txt);
    box.appendChild(wrap);
  });
}

/* ----------------- ACCESSORI TOGGLE (NO DUPLICATI) ----------------- */
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

/* ----------------- FAMILY SELECTION (qui era il bug Truck) ----------------- */
function familyProducts(){
  const fam = state.family;

  // EQUILIBRATRICI
  if(fam === "equilibratrici_auto"){
    // IMPORTANTISSIMO: non andare a "0 risultati" se non esiste equilibratrici_truck nel JSON.
    // Usiamo:
    // - per "moto" => equilibratrici_moto + qualsiasi equilibratrice con tag moto
    // - per "truck/furgoni" => equilibratrici_truck SE esiste, altrimenti fallback su equilibratrici_auto con tag truck/name TRUCK
    const allEq = state.products.filter(p => String(p.family || "").startsWith("equilibratrici"));

    if(state.uso === "moto"){
      return allEq.filter(p => String(p.family || "").includes("moto") || isMoto(p));
    }

    if(state.uso === "truck" || state.uso === "furgoni"){
      const truckFam = allEq.filter(p => String(p.family || "").includes("truck"));
      if(truckFam.length) return truckFam;

      // fallback robusto (se il JSON non ha family truck)
      const byTag = allEq.filter(p => isTruck(p));
      if(byTag.length) return byTag;

      // ultimo fallback: non bloccare la UI
      return allEq;
    }

    // auto/suv standard
    return allEq.filter(p => !String(p.family || "").includes("moto"));
  }

  // SMONTAGOMME
  if(fam === "smontagomme_auto"){
    const allSm = state.products.filter(p => String(p.family || "").startsWith("smontagomme"));

    if(state.uso === "truck"){
      // FIX: SOLO TRUCK
      return allSm.filter(p => String(p.family || "").includes("truck") || isTruck(p));
    }

    if(state.uso === "moto"){
      // SOLO moto + auto moto_ok/moto (se vuoi)
      const base = allSm.filter(p => String(p.family || "").includes("moto") || isMoto(p));
      return base;
    }

    // auto / suv / furgoni
    // qui includiamo auto, e (se vuoi) anche truck quando uso=furgoni? NO: furgoni resta auto.
    return allSm.filter(p => !String(p.family || "").includes("truck"));
  }

  // fallback
  return state.products.filter(p => String(p.family || "") === fam);
}

/* ----------------- STRUCTURAL FILTER (platorello/piatto) ----------------- */
function applyStructuralFilters(list){
  if(state.family !== "smontagomme_auto") return list;
  if(state.uso === "truck") return list; // su truck NON applicare piatto/platorello

  const wantPlatorello = state.selected.has("platorello");
  const wantPiatto = state.selected.has("piatto");

  if(!wantPlatorello && !wantPiatto) return list;

  // platorello = solo PUMA/1200
  if(wantPlatorello){
    return list.filter(p => hasFlag(p, "platorello"));
  }

  // piatto:
  // - se moto: solo moto
  // - se auto: tutti gli altri, escludendo moto e platorello
  if(wantPiatto){
    if(state.uso === "moto"){
      return list.filter(p => isMoto(p) && !hasFlag(p, "platorello"));
    }
    return list.filter(p => !isMoto(p) && !hasFlag(p, "platorello"));
  }

  return list;
}

/* ----------------- MATCH / RANK ----------------- */
function constraintPenalty(p){
  const tags = tagsOf(p);
  let pen = 0;

  // 2 vel incompatibile con MI / 1ph / 230v (se presenti tag)
  if(state.selected.has("doppia_velocita") && (hasFlag(p,"motoinverter") || tags.has("motoinverter"))) pen -= 12;
  if(state.selected.has("doppia_velocita") && (tags.has("alimentazione_1ph") || tags.has("230v"))) pen -= 12;

  return pen;
}

function matchScore(p){
  let score = 0;
  const sel = [...state.selected];

  for(const f of sel){
    if(hasFlag(p, f)) score += 2;
    else score -= 2;
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

  // ricerca testuale
  if(state.q){
    const q = upper(state.q);
    list = list.filter(p => (upper(p.name) + " " + upper(p.code) + " " + textOf(p)).includes(q));
  }

  // strutturale
  list = applyStructuralFilters(list);

  const sel = [...state.selected];

  // strict match su flag selezionati
  let strict = list;
  if(sel.length){
    strict = list.filter(p => sel.every(f => hasFlag(p, f)));
  }

  const ranked = (strict.length ? strict : list)
    .map(p => ({...p, _score: matchScore(p)}))
    .sort((a,b)=> b._score - a._score);

  return { ranked, strictCount: strict.length, total: list.length };
}

/* ----------------- ACCESSORI ----------------- */
function accessoriCompatibili(visibleProducts){
  if(!Array.isArray(visibleProducts) || !visibleProducts.length) return [];

  const activeCodes = new Set(visibleProducts.map(p => String(p.code)));
  const nameByCode = new Map(visibleProducts.map(p => [String(p.code), p.name]));

  const famAllowed = state.family.startsWith("equilibratrici")
    ? new Set(["equilibratrici_auto","equilibratrici_truck","equilibratrici_moto"])
    : new Set(["smontagomme_auto","smontagomme_truck","smontagomme_moto"]);

  const out = [];

  for(const a of state.accessori){
    const appliesTo = Array.isArray(a.applies_to) ? a.applies_to : [];
    const applies = appliesTo.some(f => {
      const s = String(f || "");
      for(const k of famAllowed){
        if(s.includes(k)) return true;
      }
      return false;
    });
    if(!applies) continue;

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

/* ----------------- RENDER ----------------- */
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
    const msg = "Nessun risultato. Prova a rimuovere qualche flag o cambia ricerca.";
    res.appendChild(el("div", { class:"note", html: msg }));
  } else {
    top.forEach((p, idx)=>{
      const tags = (Array.isArray(p.tags) ? p.tags : []).slice(0, 12)
        .map(t => `<span class="tag">${t}</span>`).join("");

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
        .slice(0, 12)
        .map(m => `<span class="tag">${m.type} — ${m.name}</span>`)
        .join("");

      const more = a._models.length > 12
        ? `<div class="tagline" style="margin-top:6px">+ altri ${a._models.length - 12} modelli compatibili…</div>`
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
            <div class="tagline">Derivati dalla compatibilità (S / X) sui modelli visibili.</div>
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
