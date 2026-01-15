/* CORMACH Configuratore — v1
   - Data-driven: data/products.json + data/accessori.json
   - Nessun prezzo: solo modello + codice
*/

const state = {
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
    { id:"laser", label:"Laser", hint:"Guida applicazione pesi (L / VDL / VDLL…)" },
    { id:"sonar", label:"Sonar", hint:"Misure/diagnosi con sonar" },
    { id:"nls", label:"Bloccaggio NLS", hint:"Centraggio più ripetibile (opzione premium)" },
    { id:"sollevatore", label:"Sollevatore ruota", hint:"Ergonomia: presente su varianti VDLL o come accessorio" },
    { id:"rlc", label:"RLC", hint:"Analisi eccentricità (quando previsto)" },
    { id:"mobile_service", label:"Mobile service", hint:"Modelli portatili / alimentazione dedicata" }
  ],
  smontagomme_auto: [
    { id:"motoinverter", label:"Motoinverter (MI)", hint:"Più controllo e coppia gestita" },
    { id:"tubeless_gt", label:"Tubeless (GT)", hint:"Funzioni/kit per tubeless" },
    { id:"bb_doppio_disco", label:"BB doppio disco", hint:"Stallonatore evoluto (BB)" },
    { id:"runflat", label:"Runflat", hint:"Lavoro su runflat/ribassati (se presente)" },
    { id:"racing", label:"Racing", hint:"Allestimento racing (se presente)" },
    { id:"palo_ribaltabile", label:"Palo ribaltabile", hint:"Comodità e accesso rapido (se presente)" }
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
      renderFlags();
      render();
    });
  });

  $("#q").addEventListener("input", (e)=>{
    state.q = e.target.value.trim();
    render();
  });

  $("#uso").addEventListener("change", (e)=>{
    state.uso = e.target.value;
    // non forziamo reset; solo aggiorniamo accessori/preset
    render();
  });

  $("#clearBtn").addEventListener("click", ()=>{
    state.selected.clear();
    state.q = "";
    $("#q").value = "";
    $("#uso").value = "auto";
    state.uso = "auto";
    renderFlags();
    render();
  });

  $("#applyPresetBtn").addEventListener("click", ()=>{
    applyPreset();
    renderFlags();
    render();
  });
}

function applyPreset(){
  // Preset ragionati: servono come punto di partenza, non come regola.
  state.selected.clear();

  if(state.family === "equilibratrici_auto"){
    if(state.uso === "auto"){
      ["monitor","laser"].forEach(t=>state.selected.add(t));
    } else if(state.uso === "suv"){
      ["monitor","laser","sonar"].forEach(t=>state.selected.add(t));
    } else if(state.uso === "furgoni"){
      ["monitor","laser","sonar","nls"].forEach(t=>state.selected.add(t));
    } else if(state.uso === "truck"){
      ["monitor","laser","sonar","nls"].forEach(t=>state.selected.add(t));
    }
  }

  if(state.family === "smontagomme_auto"){
    if(state.uso === "auto"){
      ["motoinverter"].forEach(t=>state.selected.add(t));
    } else if(state.uso === "suv"){
      ["motoinverter","tubeless_gt"].forEach(t=>state.selected.add(t));
    } else if(state.uso === "furgoni"){
      ["motoinverter"].forEach(t=>state.selected.add(t));
    } else if(state.uso === "truck"){
      // Per truck spesso è un'altra famiglia; qui teniamo preset minimale.
      ["motoinverter"].forEach(t=>state.selected.add(t));
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
      if(cb.checked) state.selected.add(def.id);
      else state.selected.delete(def.id);
      render();
    });

    const txt = el("div", { html:`<b>${def.label}</b><span>${def.hint}</span>` });
    wrap.appendChild(cb);
    wrap.appendChild(txt);
    box.appendChild(wrap);
  });
}

function familyProducts(){
  // Include anche varianti truck/moto se l'uso lo richiede
  const fam = state.family;
  let fams = [fam];

  if(state.uso === "truck"){
    if(fam === "equilibratrici_auto") fams = ["equilibratrici_truck","equilibratrici_auto"];
    if(fam === "smontagomme_auto") fams = ["smontagomme_truck","smontagomme_auto"];
  }
  if(state.uso === "furgoni"){
    // restiamo su auto, ma includiamo truck come alternativa se esiste
    if(fam === "equilibratrici_auto") fams = ["equilibratrici_auto","equilibratrici_truck"];
    if(fam === "smontagomme_auto") fams = ["smontagomme_auto","smontagomme_truck"];
  }

  return state.products.filter(p => fams.includes(p.family));
}

function matchScore(p){
  const tags = new Set(p.tags || []);
  const sel = [...state.selected];

  // punteggio: match +2, miss -3 (per dare priorità a chi soddisfa i requisiti)
  let score = 0;
  for(const t of sel){
    if(tags.has(t)) score += 2;
    else score -= 3;
  }

  // bonus: se query matcha nome/codice
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

  // se ci sono flag selezionati, proviamo prima il filtro "tutti i flag presenti"
  const sel = [...state.selected];
  let strict = filtered;
  if(sel.length){
    strict = filtered.filter(p => sel.every(t => (p.tags || []).includes(t)));
  }

  let ranked = strict.length ? strict : filtered;
  ranked = ranked
    .map(p => ({...p, _score: matchScore(p)}))
    .sort((a,b)=> b._score - a._score);

  return { ranked, strictCount: strict.length, total: filtered.length };
}

function accessoriSuggeriti(){
  // Regole semplici: furgoni/truck => cono+distanziale; ergonomia => sollevatore ruota
  const fam = state.family.startsWith("equilibratrici") ? ["equilibratrici_auto","equilibratrici_truck"] : ["smontagomme_auto","smontagomme_truck"];
  const out = [];

  for(const a of state.accessori){
    const applies = (a.applies_to || []).some(x => fam.includes(x));
    if(!applies) continue;

    if(a.code === "21100303"){
      if(state.uso === "furgoni" || state.uso === "truck") out.push(a);
    } else if(a.code === "21100397"){
      // suggeriamolo sempre come optional ergonomia
      out.push(a);
    }
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

  const top = ranked.slice(0, 7);
  if(!top.length){
    res.appendChild(el("div", { class:"note", html:"Nessun risultato. Prova a rimuovere qualche flag o cambia ricerca." }));
  } else {
    top.forEach((p, idx)=>{
      const tags = (p.tags || []).slice(0, 8).map(t => `<span class="tag">${t}</span>`).join("");
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

  // Accessori
  const accBox = $("#accessoriBox");
  accBox.innerHTML = "";
  const acc = accessoriSuggeriti();
  if(acc.length){
    const html = acc.map(a=>`<div>• <b>${a.name}</b> — <span class="r-code">cod. ${a.code}</span></div>`).join("");
    accBox.appendChild(el("div", { class:"acc", html:`<b>Optional consigliati</b><div class="tagline">In base all’uso selezionato.</div><div style="margin-top:8px">${html}</div>` }));
  }
}

loadData().catch(err=>{
  console.error(err);
  alert("Errore nel caricamento dati. Controlla che data/products.json sia presente.");
});
