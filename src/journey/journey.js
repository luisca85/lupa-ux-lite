import { render } from "../app/render.js";
import { state } from "../core/state.js";
import { esc, uid } from "../core/util.js";
import { flagIco } from "../flujos/detalle-nodo.js";
import { flowIco, flowModal, saveActiveFlow } from "../flujos/flujos.js";
import { closeJrSide, openJrSide } from "./relaciones.js";
import { bigIco, chevL, chevR, pencil, plus, trash, x } from "../ui/iconos.js";
import { openConfirm, openModal } from "../ui/modales.js";

/* ============ Módulo: User Journey ============ */
export const EMO=[
  {n:0,label:"Muy negativo",emoji:"😣"},
  {n:1,label:"Negativo",emoji:"🙁"},
  {n:2,label:"Neutral",emoji:"😐"},
  {n:3,label:"Positivo",emoji:"🙂"},
  {n:4,label:"Muy positivo",emoji:"😄"}
];
const JR_COLORS=["#2c5c8f","#8a3b3b","#3f7350","#8a6a3a","#834e83","#2c6e6a","#b06a1f"];
export const JR_CARRILES=[
  {id:"touchpoint",label:"Touchpoint",sub:"¿cuándo / con qué medio?"},
  {id:"emocion",label:"Emocionalidad",sub:""},
  {id:"acciones",label:"Acciones",sub:"¿qué hace?"},
  {id:"expectativas",label:"Expectativas / pensamiento",sub:""},
  {id:"pain",label:"Pain points",sub:"obstáculos"},
  {id:"oportunidades",label:"Oportunidades",sub:"qué mejorar"}
];
export function jrDefaultCarriles(){ return {touchpoint:true,emocion:true,acciones:true,expectativas:true,pain:true,oportunidades:true}; }
export const JW=224;
let _jrSaveT;
function jrSave(){ clearTimeout(_jrSaveT); _jrSaveT=setTimeout(saveActiveFlow,500); }
export function jrCleanupPop(){ const p=document.getElementById("emoPop"); if(p)p.remove(); if(window._jrPopClose){document.removeEventListener("pointerdown",window._jrPopClose,true);window._jrPopClose=null;} }
export function emoTop(e){ return 8+(4-(e!=null?e:2))/4*50; }
export function jrNormalizePaso(p){
  if(typeof p.touchpoint!=="string") p.touchpoint=p.touchpoint?String(p.touchpoint):"";
  ["tpPills","acciones","expectativas","pain","oportunidades"].forEach(f=>{
    if(typeof p[f]==="string") p[f]=p[f].trim()?[p[f].trim()]:[];
    else if(!Array.isArray(p[f])) p[f]=[];
  });
  if(!Array.isArray(p.hallazgos)) p.hallazgos=[];
  if(!Array.isArray(p.flujos)) p.flujos=p.flujoId?[p.flujoId]:[];
}
function jrPillEditor(box,arr,onChange,cloud){
  function draw(focusEnd){
    box.innerHTML=arr.map((t,i)=>`<span class="jr-pill ${cloud?'cloud':''}">${esc(t)}<button type="button" class="jr-pill-x" data-i="${i}" title="Quitar">${x()}</button></span>`).join("")
      +`<input class="jr-pill-in" maxlength="140" placeholder="+ agregar">`;
    box.querySelectorAll(".jr-pill-x").forEach(b=>b.onclick=()=>{ arr.splice(+b.dataset.i,1); onChange(); draw(true); });
    const inp=box.querySelector(".jr-pill-in");
    inp.onkeydown=e=>{
      if(e.key==="Enter"){ e.preventDefault(); const v=inp.value.trim().slice(0,140); if(v){ arr.push(v); onChange(); draw(true); } }
      else if(e.key==="Backspace"&&!inp.value&&arr.length){ arr.pop(); onChange(); draw(true); }
    };
    if(focusEnd){ const ni=box.querySelector(".jr-pill-in"); if(ni)ni.focus(); }
  }
  draw(false);
}
export function renderJourneyEditor(c,jr){
  jr.etapas=jr.etapas||[]; jr.pasos=jr.pasos||[]; jr.carriles=jr.carriles||jrDefaultCarriles();
  const car=jr.carriles, pasos=jr.pasos, n=pasos.length;
  pasos.forEach(jrNormalizePaso);
  const labelFor=id=>{ const k=JR_CARRILES.find(x=>x.id===id); return k.label+(k.sub?`<small>${k.sub}</small>`:""); };
  let html=`<div class="jr-bar">
    <button class="btn ghost sm" id="jrBack">${chevL()} Flujos</button>
    <div class="fl-title"><h3>${esc(jr.nombre)}</h3><span class="chip plat">User Journey</span></div>
    <button class="icon-btn sm" id="jrEdit" title="Editar journey" style="width:32px;height:32px">${pencil()}</button>
    <div class="spacer"></div>
    <button class="btn ghost sm" id="jrCarr">Carriles</button>
    <button class="btn ghost sm" id="jrEtapas">Etapas</button>
    <button class="btn primary sm" id="jrAddPaso">${plus()} Paso</button>
  </div>`;
  if(!n){
    html+=`<div class="empty">${bigIco('chart')}<h3>Journey vacío</h3><p>Agregá el primer paso para empezar a mapear la experiencia por etapas.</p><button class="btn primary" id="jrAddPaso2">${plus()} Agregar paso</button></div>`;
    c.innerHTML=html; jrBarHandlers(c,jr); const a2=c.querySelector("#jrAddPaso2"); if(a2)a2.onclick=()=>jrAddPaso(jr); return;
  }
  // bandas de etapa (grupos contiguos)
  let bands=[],start=0;
  for(let i=1;i<=n;i++){ if(i===n||pasos[i].etapaId!==pasos[start].etapaId){ bands.push({etapaId:pasos[start].etapaId,len:i-start}); start=i; } }
  const bandRow=bands.map(b=>{ const et=jr.etapas.find(e=>e.id===b.etapaId); const w=b.len*JW-8;
    return et?`<div class="jr-band" style="width:${w}px;background:${et.color||'#555'}">${esc(et.nombre)}</div>`:`<div class="jr-band empty" style="width:${w}px">sin etapa</div>`; }).join("");
  const heads=pasos.map((p,i)=>{
    return `<div class="jr-cell jr-head-cell"><div class="jr-phead" data-phead="${i}"><div class="jr-pnum">${i+1}</div><div class="jr-pname">${esc(p.nombre||"Paso")}</div></div>
      <div class="jr-rels"><button class="jr-rel" data-rel="hallazgos" data-p="${i}" title="Hallazgos relacionados">${flagIco()} ${(p.hallazgos||[]).length}</button><button class="jr-rel fl" data-rel="flujos" data-p="${i}" title="User Flows relacionados">${flowIco()} ${(p.flujos||[]).length}</button></div></div>`; }).join("");
  const pillRow=(field,cls,cloud)=>`<div class="jr-row ${cls||''}"><div class="jr-lbl">${labelFor(field)}</div><div class="jr-cells">${pasos.map((p,i)=>`<div class="jr-cell"><div class="jr-pills ${cloud?'cloud':''}" data-p="${i}" data-f="${field}"></div></div>`).join("")}</div></div>`;
  let rows="";
  if(car.touchpoint!==false) rows+=`<div class="jr-row"><div class="jr-lbl">${labelFor("touchpoint")}</div><div class="jr-cells">${pasos.map((p,i)=>`<div class="jr-cell"><div class="jr-pills" data-p="${i}" data-f="tpPills"></div><textarea class="jr-ta jr-tp-desc" data-p="${i}" rows="2" placeholder="Descripción del touchpoint...">${esc(p.touchpoint||"")}</textarea></div>`).join("")}</div></div>`;
  if(car.emocion!==false){
    const emoCells=pasos.map((p,i)=>{ const e=(p.emocion!=null?p.emocion:2); return `<div class="jr-emo-cell"><button class="jr-emo-btn" data-emo="${i}" style="top:${emoTop(e)}px" title="${EMO[e].label}">${EMO[e].emoji}</button></div>`; }).join("");
    rows+=`<div class="jr-row jr-emo"><div class="jr-lbl">${labelFor("emocion")}</div><div class="jr-cells jr-emo-cells"><svg width="${n*JW}" height="110" id="jrCurve"></svg>${emoCells}</div></div>`;
  }
  if(car.acciones!==false) rows+=pillRow("acciones");
  if(car.expectativas!==false) rows+=pillRow("expectativas","exp",true);
  if(car.pain!==false) rows+=pillRow("pain","pain");
  if(car.oportunidades!==false) rows+=pillRow("oportunidades");
  const sbar=pos=>`<div class="jr-sbar" data-sb="${pos}"><button class="jr-nav-btn" data-dir="-1" title="Anterior">${chevL()}</button><input type="range" class="jr-range" min="0" max="1000" value="0" aria-label="Desplazar el mapa"><button class="jr-nav-btn" data-dir="1" title="Siguiente">${chevR()}</button></div>`;
  html+=`${sbar("top")}<div class="jr-scroll" id="jrScroll"><div class="jr-matrix">
    <div class="jr-row jr-etapas"><div class="jr-lbl">Etapas</div><div class="jr-cells">${bandRow}</div></div>
    <div class="jr-row jr-head"><div class="jr-lbl">Pasos</div><div class="jr-cells">${heads}</div></div>
    ${rows}
  </div></div>${sbar("bottom")}`;
  c.innerHTML=html;
  jrBarHandlers(c,jr);
  c.querySelectorAll(".jr-phead").forEach(el=>el.onclick=()=>pasoModal(jr,+el.dataset.phead));
  c.querySelectorAll(".jr-rel").forEach(b=>b.onclick=e=>{ e.stopPropagation(); openJrSide(jr,+b.dataset.p,b.dataset.rel); });
  // scroll sincronizado con sliders + chevrones
  const scroll=c.querySelector("#jrScroll"), ranges=[...c.querySelectorAll(".jr-range")], sbars=[...c.querySelectorAll(".jr-sbar")];
  const maxSc=()=>Math.max(0,scroll.scrollWidth-scroll.clientWidth);
  function syncSb(){ const ms=maxSc(); const v=ms?(scroll.scrollLeft/ms)*1000:0; ranges.forEach(r=>{ if(document.activeElement!==r)r.value=v; }); sbars.forEach(sb=>sb.style.display=ms>2?"flex":"none"); }
  ranges.forEach(r=>r.oninput=()=>{ scroll.scrollLeft=(r.value/1000)*maxSc(); });
  scroll.addEventListener("scroll",syncSb);
  c.querySelectorAll(".jr-nav-btn").forEach(b=>b.onclick=()=>scroll.scrollBy({left:(+b.dataset.dir)*JW*1.5,behavior:"smooth"}));
  requestAnimationFrame(syncSb); setTimeout(syncSb,80);
  c.querySelectorAll(".jr-tp-desc").forEach(ta=>ta.oninput=()=>{ const p=pasos[+ta.dataset.p]; if(p){ p.touchpoint=ta.value; jrSave(); } });
  c.querySelectorAll(".jr-pills").forEach(box=>{ const p=pasos[+box.dataset.p], f=box.dataset.f; if(!p)return; if(!Array.isArray(p[f]))p[f]=[]; jrPillEditor(box,p[f],()=>saveActiveFlow(),box.classList.contains("cloud")); });
  c.querySelectorAll("[data-emo]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); openEmoPop(b,pasos[+b.dataset.emo]); });
  const svg=c.querySelector("#jrCurve");
  if(svg){ const pts=pasos.map((p,i)=>[i*JW+JW/2, emoTop(p.emocion)+22]);
    svg.innerHTML=`<polyline points="${pts.map(p=>p.join(",")).join(" ")}" fill="none" stroke="var(--accent)" stroke-width="2"/>`+pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="var(--accent)"/>`).join(""); }
}
function jrBarHandlers(c,jr){
  c.querySelector("#jrBack").onclick=()=>{closeJrSide();state.flowMode="list";state.activeFlowId=null;render();};
  c.querySelector("#jrEdit").onclick=()=>flowModal(jr);
  c.querySelector("#jrCarr").onclick=()=>carrilesModal(jr);
  c.querySelector("#jrEtapas").onclick=()=>etapasModal(jr);
  c.querySelector("#jrAddPaso").onclick=()=>jrAddPaso(jr);
}
function jrAddPaso(jr){ jr.pasos=jr.pasos||[]; const last=jr.pasos[jr.pasos.length-1];
  jr.pasos.push({id:uid(),etapaId:last?last.etapaId:(jr.etapas[0]?jr.etapas[0].id:null),nombre:"Paso "+(jr.pasos.length+1),emocion:2,touchpoint:"",tpPills:[],acciones:[],expectativas:[],pain:[],oportunidades:[],hallazgos:[],flujos:[]});
  render(); saveActiveFlow(); }
function openEmoPop(btn,paso){
  jrCleanupPop();
  const cur=(paso.emocion!=null?paso.emocion:2);
  const pop=document.createElement("div"); pop.className="emo-pop"; pop.id="emoPop";
  pop.innerHTML=EMO.map(e=>`<button data-n="${e.n}" class="${cur===e.n?'on':''}" title="${e.label}">${e.emoji}</button>`).join("");
  document.body.appendChild(pop);
  const r=btn.getBoundingClientRect(); let x=r.left+r.width/2-pop.offsetWidth/2, y=r.bottom+6;
  x=Math.max(8,Math.min(x,window.innerWidth-pop.offsetWidth-8)); if(y+pop.offsetHeight>window.innerHeight-8)y=r.top-pop.offsetHeight-6;
  pop.style.left=x+"px"; pop.style.top=y+"px";
  pop.querySelectorAll("button").forEach(b=>b.onclick=()=>{ paso.emocion=+b.dataset.n; jrCleanupPop(); saveActiveFlow(); render(); });
  window._jrPopClose=ev=>{ if(!pop.contains(ev.target)&&ev.target!==btn)jrCleanupPop(); };
  setTimeout(()=>document.addEventListener("pointerdown",window._jrPopClose,true),0);
}
function pasoModal(jr,idx){
  const p=jr.pasos[idx]; if(!p)return;
  openModal("Editar paso",`
    <div class="field"><label>Nombre del paso</label><input id="pa_n" value="${esc(p.nombre||"")}"></div>
    <div class="field"><label>Etapa</label><select id="pa_et"><option value="">Sin etapa</option>${jr.etapas.map(e=>`<option value="${e.id}" ${p.etapaId===e.id?'selected':''}>${esc(e.nombre)}</option>`).join("")}</select>
      ${jr.etapas.length?"":`<span class="hint">No hay etapas todavía. Creá etapas con el botón "Etapas".</span>`}</div>
    <span class="hint">Los hallazgos y user flows relacionados se gestionan desde los contadores en la cabecera del paso.</span>
    <div style="display:flex;gap:8px;align-items:center"><button type="button" class="btn ghost sm" id="pa_left">${chevL()} Mover</button><button type="button" class="btn ghost sm" id="pa_right">Mover ${chevR()}</button><div class="spacer"></div><button type="button" class="btn ghost danger sm" id="pa_del">${trash()} Eliminar</button></div>
  `,async()=>{
    p.nombre=document.getElementById("pa_n").value.trim()||p.nombre;
    p.etapaId=document.getElementById("pa_et").value||null;
    await saveActiveFlow(); render(); return true;
  });
  const swap=(a,i,j)=>{ const t=a[i];a[i]=a[j];a[j]=t; };
  document.getElementById("pa_left").onclick=()=>{ if(idx>0){ swap(jr.pasos,idx,idx-1); saveActiveFlow(); document.getElementById("modalRoot").innerHTML=""; render(); } };
  document.getElementById("pa_right").onclick=()=>{ if(idx<jr.pasos.length-1){ swap(jr.pasos,idx,idx+1); saveActiveFlow(); document.getElementById("modalRoot").innerHTML=""; render(); } };
  document.getElementById("pa_del").onclick=()=>{ document.getElementById("modalRoot").innerHTML=""; openConfirm("Eliminar paso",`Se elimina "<b>${esc(p.nombre||'Paso')}</b>".`,async()=>{ jr.pasos.splice(idx,1); await saveActiveFlow(); render(); }); };
  setTimeout(()=>document.getElementById("pa_n").focus(),40);
}
function etapasModal(jr){
  jr.etapas=jr.etapas||[];
  openModal("Etapas del journey",`<div id="etList" class="rpt-list"></div><button type="button" class="btn ghost sm" id="etAdd">${plus()} Agregar etapa</button>`,async()=>{
    jr.etapas.forEach((e,i)=>{ const ni=document.getElementById("et_n_"+i); if(ni)e.nombre=ni.value.trim()||e.nombre; });
    await saveActiveFlow(); render(); return true;
  });
  const list=document.getElementById("etList");
  function capture(){ jr.etapas.forEach((e,i)=>{ const ni=document.getElementById("et_n_"+i); if(ni)e.nombre=ni.value; }); }
  function draw(){
    list.innerHTML=jr.etapas.length?jr.etapas.map((e,i)=>`<div class="rpt-item" style="gap:6px"><input id="et_n_${i}" value="${esc(e.nombre)}" style="flex:1;border:1px solid var(--line-strong);border-radius:6px;padding:4px 7px;background:var(--surface-2)"><span class="ri-acts">${JR_COLORS.map(col=>`<button type="button" class="et-col" data-i="${i}" data-c="${col}" title="Color" style="width:18px;height:18px;border-radius:50%;border:2px solid ${e.color===col?'var(--ink)':'transparent'};background:${col};padding:0;cursor:pointer"></button>`).join("")}<button type="button" class="icon-btn sm et-del" data-i="${i}" style="width:26px;height:26px">${trash()}</button></span></div>`).join(""):`<span class="rhint">Sin etapas.</span>`;
    list.querySelectorAll(".et-col").forEach(b=>b.onclick=()=>{ capture(); jr.etapas[+b.dataset.i].color=b.dataset.c; draw(); });
    list.querySelectorAll(".et-del").forEach(b=>b.onclick=()=>{ capture(); const id=jr.etapas[+b.dataset.i].id; jr.etapas.splice(+b.dataset.i,1); (jr.pasos||[]).forEach(p=>{ if(p.etapaId===id)p.etapaId=null; }); draw(); });
  }
  document.getElementById("etAdd").onclick=()=>{ capture(); jr.etapas.push({id:uid(),nombre:"Etapa "+(jr.etapas.length+1),color:JR_COLORS[jr.etapas.length%JR_COLORS.length]}); draw(); };
  draw();
}
function carrilesModal(jr){
  jr.carriles=jr.carriles||jrDefaultCarriles();
  openModal("Carriles visibles",`<div class="rpt-checks">${JR_CARRILES.map(k=>`<label class="chk"><input type="checkbox" data-cr="${k.id}" ${jr.carriles[k.id]!==false?'checked':''}> ${k.label}</label>`).join("")}</div><span class="hint">Mostrá u ocultá cada fila según lo que necesites.</span>`,async()=>{
    document.querySelectorAll("#modalRoot [data-cr]").forEach(cb=>{ jr.carriles[cb.dataset.cr]=cb.checked; });
    await saveActiveFlow(); render(); return true;
  });
}
