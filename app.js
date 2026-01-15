/* CORMACH Configuratore — v4.2 (No Prezzi)
   - JS ripulito e stabile
   - platorello/piatto = filtro strutturale reale
   - Accessori ON/OFF funzionante
   - default 7 risultati, poi +10
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
    { id:"monitor", label:"Monitor", hint:"Interfaccia evoluta" },
    { id:"touch", label:"Touch", hint:"Touchscreen" },
    { id:"laser", label:"Laser", hint:"Guida applicazione pesi" },
    { id:"sonar", label:"Sonar", hint:"Misurazione automatica" },
    { id:"nls", label:"NLS", hint:"Bloccaggio pneumatico" },
    { id:"sollevatore", label:"Sollevatore ruota", hint:"Ergonomia operatore" }
  ],
  smontagomme_auto: [
    { id:"platorello", label:"A platorello", hint:"PUMA, CM 1200 BB" },
    { id:"piatto", label:"A piatto", hint:"Autocentrante / BIKE" },
    { id:"motoinverter", label:"Motoinverter (MI)", hint:"Regolazione elettronica" },
    { id:"doppia_velocita", label:"Doppia velocità", hint:"No MI / No 1ph" },
    { id:"tubeless_gt", label:"Tubeless GT", hint:"Gonfiaggio tubeless" },
    { id:"runflat", label:"RunFlat", hint:"Pneumatici RunFlat" }
  ]
};

function byId(id){ return document.getElementById(id); }
function upper(s){ return String(s||"").toUpperCase(); }
function tagsOf(p){ return new Set(Array.isArray(p.tags)?p.tags:[]); }

function hasFlag(p, flag){
  const tags = tagsOf(p);
  if(tags.has(flag)) return true;
  const name = upper(p.name);
  if(flag==="platorello") return /PUMA|1200/.test(name);
  if(flag==="piatto") return /BIKE/.test(name) || tags.has("moto");
  return false;
}

async function loadData(){
  const [p,a] = await Promise.all([
    fetch("./data/products.json").then(r=>r.json()),
    fetch("./data/accessori.json").then(r=>r.json())
  ]);
  state.products = p||[];
  state.accessori = a||[];
  bindUI();
  renderFlags();
  render();
}

function bindUI(){
  document.querySelectorAll(".tabbtn").forEach(btn=>{
    btn.onclick=()=>{
      document.querySelectorAll(".tabbtn").forEach(b=>b.setAttribute("aria-selected","false"));
      btn.setAttribute("aria-selected","true");
      state.family = btn.dataset.family;
      state.selected.clear();
      state.limit = DEFAULT_LIMIT;
      renderFlags();
      render();
    };
  });

  byId("q").oninput=e=>{ state.q=e.target.value.trim(); state.limit=DEFAULT_LIMIT; render(); };
  byId("uso").onchange=e=>{ state.uso=e.target.value; state.limit=DEFAULT_LIMIT; render(); };
  byId("clearBtn").onclick=()=>{ state.selected.clear(); byId("q").value=""; state.q=""; renderFlags(); render(); };
  byId("applyPresetBtn").onclick=()=>{ applyPreset(); renderFlags(); render(); };

  ensureAccessoriToggle();
}

function applyPreset(){
  state.selected.clear();
  if(state.family==="smontagomme_auto"){
    if(state.uso==="auto"||state.uso==="furgoni") state.selected.add("platorello");
    if(state.uso==="moto") state.selected.add("piatto");
  }
}

function renderFlags(){
  const box = byId("flags"); box.innerHTML="";
  (FLAG_DEFS[state.family]||[]).forEach(f=>{
    const id="f_"+f.id;
    const cb=document.createElement("input");
    cb.type="checkbox"; cb.id=id; cb.checked=state.selected.has(f.id);
    cb.onchange=()=>{
      if(cb.checked) state.selected.add(f.id);
      else state.selected.delete(f.id);
      EXCLUSIVE_FLAGS[state.family]?.forEach(g=>{
        if(g.includes(f.id)&&cb.checked) g.forEach(x=>x!==f.id&&state.selected.delete(x));
      });
      renderFlags(); render();
    };
    const lbl=document.createElement("label");
    lbl.className="chk"; lbl.htmlFor=id;
    lbl.append(cb, document.createTextNode(" "+f.label));
    box.appendChild(lbl);
  });
}

function ensureAccessoriToggle(){
  const hd=document.querySelector('section.card[aria-label="Risultati"] .hd');
  if(!hd||byId("toggleAccessoriBtn")) return;
  const b=document.createElement("button");
  b.id="toggleAccessoriBtn"; b.className="ghost";
  const paint=()=>b.textContent="Accessori: "+(state.showAccessori?"ON":"OFF");
  b.onclick=()=>{ state.showAccessori=!state.showAccessori; paint(); render(); };
  paint(); hd.appendChild(b);
}

function familyProducts(){
  if(state.family==="equilibratrici_auto")
    return state.products.filter(p=>p.family.startsWith("equilibratrici"));
  if(state.family==="smontagomme_auto")
    return state.products.filter(p=>p.family.startsWith("smontagomme"));
  return [];
}

function filterAndRank(){
  let list=familyProducts();
  if(state.q) list=list.filter(p=>(upper(p.name)+upper(p.code)).includes(upper(state.q)));
  if(state.selected.has("platorello")) list=list.filter(p=>hasFlag(p,"platorello"));
  if(state.selected.has("piatto")) list=list.filter(p=>hasFlag(p,"piatto"));
  return list.map(p=>({...p})).slice(0,100);
}

function accessoriCompatibili(visible){
  if(!state.showAccessori||!visible.length) return [];
  const codes=new Set(visible.map(p=>String(p.code)));
  return state.accessori.filter(a=>
    (a.compat||[]).some(c=>codes.has(String(c.product_code)))
  );
}

function render(){
  const res=byId("results"); res.innerHTML="";
  const ranked=filterAndRank();
  ranked.slice(0,state.limit).forEach(p=>{
    const d=document.createElement("div");
    d.className="result";
    d.innerHTML=`<b>${p.name}</b><div>Codice: ${p.code}</div>`;
    res.appendChild(d);
  });
  if(ranked.length>state.limit){
    const b=document.createElement("button");
    b.className="primary"; b.textContent="Mostra altri";
    b.onclick=()=>{ state.limit+=MORE_STEP; render(); };
    res.appendChild(b);
  }
}

loadData().catch(e=>{
  console.error(e);
  alert("Errore caricamento dati");
});
