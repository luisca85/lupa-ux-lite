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
// Etapas con las que arranca un User Journey nuevo. Se pueden renombrar, describir,
// reordenar, borrar o sumar otras desde "Etapas".
const ETAPAS_BASE=[
  ["Descubrimiento","El cliente identifica una necesidad y conoce la marca."],
  ["Consideración","El cliente compara alternativas y busca información."],
  ["Decisión","El cliente elige un producto o servicio concreto."],
  ["Conversión","El cliente realiza la transacción, compra o suscripción del servicio."],
  ["Experiencia de usuario","El cliente usa el producto y evalúa su satisfacción."],
  ["Fidelización","El cliente repite la compra y se vuelve leal."]
];
export function jrEtapasBase(){ return ETAPAS_BASE.map(([nombre,descripcion],i)=>({id:uid(),nombre,descripcion,color:JR_COLORS[i%JR_COLORS.length]})); }
function jrNuevoPaso(etapaId,n){ return {id:uid(),etapaId,nombre:"Paso "+n,emocion:2,touchpoint:"",tpPills:[],acciones:[],expectativas:[],pain:[],oportunidades:[],hallazgos:[],flujos:[]}; }
// Journey nuevo: las 6 etapas base, cada una con un primer paso, así el flujo se ve entero en el mapa.
export function jrJourneyBase(){ const etapas=jrEtapasBase(); return { etapas, pasos:etapas.map((e,i)=>jrNuevoPaso(e.id,i+1)) }; }
// Etapas prehechas para sumar: las base y las de otros journeys del estudio, sin repetir nombre.
// "usos" cuenta cuántas veces este journey ya la tiene (igual se puede volver a agregar).
function jrLibreriaEtapas(jr){
  const vistas=new Map(), clave=n=>String(n||"").trim().toLowerCase();
  const sumar=e=>{ const k=clave(e.nombre); if(k&&!vistas.has(k)) vistas.set(k,{nombre:e.nombre.trim(),descripcion:e.descripcion||""}); };
  ETAPAS_BASE.forEach(([nombre,descripcion])=>sumar({nombre,descripcion}));
  (state.flujos||[]).filter(f=>f.tipo==="User Journey"&&f.id!==jr.id).forEach(f=>(f.etapas||[]).forEach(sumar));
  return [...vistas.values()].map(e=>({...e,usos:(jr.etapas||[]).filter(x=>clave(x.nombre)===clave(e.nombre)).length}));
}
// Agrega una etapa al final del journey con su primer paso: aparece enseguida en el mapa.
function jrAgregarEtapa(jr,{nombre,descripcion}){
  jr.etapas=jr.etapas||[]; jr.pasos=jr.pasos||[];
  const color=JR_COLORS.find(c=>!jr.etapas.some(e=>e.color===c))||JR_COLORS[jr.etapas.length%JR_COLORS.length];
  const et={id:uid(),nombre:String(nombre).trim(),descripcion:String(descripcion||"").trim(),color};
  jr.etapas.push(et); jr.pasos.push(jrNuevoPaso(et.id,jr.pasos.length+1));
  ordenarPasosPorEtapa(jr); saveActiveFlow(); render();
  requestAnimationFrame(()=>{ const sc=document.getElementById("jrScroll"); if(sc) sc.scrollLeft=sc.scrollWidth; });
}
function openEtapaPop(btn,jr){
  jrCleanupPop();
  const lib=jrLibreriaEtapas(jr);
  const pop=document.createElement("div"); pop.className="et-pop"; pop.id="emoPop"; pop.setAttribute("role","dialog"); pop.setAttribute("aria-label","Agregar una etapa");
  pop.innerHTML=`<div class="et-pop-h">Agregar una etapa</div>
    <div class="et-pop-list">${lib.map((e,k)=>`<button type="button" class="et-pop-op" data-k="${k}"><span class="et-pop-t">${plus()} ${esc(e.nombre)}${e.usos?` <em>${e.usos===1?"ya la usás":`ya la usás ${e.usos} veces`}</em>`:""}</span>${e.descripcion?`<span class="et-pop-d">${esc(e.descripcion)}</span>`:""}</button>`).join("")}</div>
    <div class="et-pop-nueva"><input id="etPopNom" placeholder="O creá una etapa nueva" aria-label="Nombre de la etapa nueva"><button type="button" class="btn sm primary" id="etPopCrear">Agregar</button></div>`;
  document.body.appendChild(pop);
  const r=btn.getBoundingClientRect(), w=Math.min(340,window.innerWidth-16);
  pop.style.width=w+"px"; pop.style.left=Math.max(8,Math.min(r.left,window.innerWidth-w-8))+"px";
  const alto=pop.offsetHeight; pop.style.top=(r.bottom+6+alto>window.innerHeight&&r.top-6-alto>0?r.top-6-alto:Math.min(r.bottom+6,window.innerHeight-alto-8))+"px";
  pop.querySelectorAll(".et-pop-op").forEach(b=>b.onclick=()=>{ jrCleanupPop(); jrAgregarEtapa(jr,lib[+b.dataset.k]); });
  const nom=pop.querySelector("#etPopNom");
  const crear=()=>{ if(!nom.value.trim()){ nom.focus(); return; } const n=nom.value; jrCleanupPop(); jrAgregarEtapa(jr,{nombre:n,descripcion:""}); };
  pop.querySelector("#etPopCrear").onclick=crear;
  nom.onkeydown=e=>{ if(e.key==="Enter"){ e.preventDefault(); crear(); } };
  const primero=pop.querySelector(".et-pop-op")||nom; primero.focus();
  pop.onkeydown=e=>{ if(e.key==="Escape"){ e.preventDefault(); jrCleanupPop(); btn.focus(); } };
  setTimeout(()=>{ window._jrPopClose=e=>{ if(!pop.contains(e.target)&&!btn.contains(e.target)) jrCleanupPop(); }; document.addEventListener("pointerdown",window._jrPopClose,true); },0);
}
// Los pasos se agrupan en bandas contiguas por etapa: al reordenar las etapas, los pasos
// siguen ese orden (sin etapa, al final), manteniendo su orden dentro de cada etapa.
function ordenarPasosPorEtapa(jr){
  const pos=id=>{ const i=jr.etapas.findIndex(e=>e.id===id); return i<0?jr.etapas.length:i; };
  jr.pasos=(jr.pasos||[]).map((p,i)=>[p,i]).sort((a,b)=>(pos(a[0].etapaId)-pos(b[0].etapaId))||(a[1]-b[1])).map(x=>x[0]);
}
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
    <button class="btn ghost sm" id="jrAddEtapa">${plus()} Etapa</button>
    <button class="btn primary sm" id="jrAddPaso">${plus()} Paso</button>
  </div>`;
  if(!n){
    html+=`<div class="empty">${bigIco('chart')}<h3>Journey vacío</h3><p>Agregá el primer paso para empezar a mapear la experiencia por etapas.</p>
      ${jr.etapas.length?`<ol class="jr-etapas-prev" aria-label="Etapas del journey">${jr.etapas.map(e=>`<li><span class="jr-et-dot" style="background:${e.color||'#555'}"></span><b>${esc(e.nombre)}</b><span>${esc(e.descripcion||"")}</span><button type="button" class="jr-sp-add jr-li-add" data-addpaso="${e.id}" aria-label="Agregar un paso en ${esc(e.nombre)}">${plus()} Paso</button></li>`).join("")}</ol>
      <p class="jr-etapas-nota">Sumá o quitá etapas desde <b>Etapas</b>. Cuando tengan pasos, las reordenás en el mapa con las flechas de cada etapa.</p>`:""}
      <button class="btn primary" id="jrAddPaso2">${plus()} Agregar paso</button></div>`;
    c.innerHTML=html; jrBarHandlers(c,jr); const a2=c.querySelector("#jrAddPaso2"); if(a2)a2.onclick=()=>jrAddPaso(jr);
    c.querySelectorAll("[data-addpaso]").forEach(b=>b.onclick=()=>jrAddPaso(jr,b.dataset.addpaso)); return;
  }
  // bandas de etapa (grupos contiguos)
  let bands=[],start=0;
  for(let i=1;i<=n;i++){ if(i===n||pasos[i].etapaId!==pasos[start].etapaId){ bands.push({etapaId:pasos[start].etapaId,len:i-start}); start=i; } }
  const conEtapa=bands.filter(b=>jr.etapas.some(e=>e.id===b.etapaId)).map(b=>b.etapaId);
  const flecha=(d,et,nombre)=>{ const k=conEtapa.indexOf(et), off=d<0?k<=0:k>=conEtapa.length-1;
    return `<button type="button" class="jr-band-mov" data-mover="${d}" data-et="${et}" title="Mover ${esc(nombre)} a la ${d<0?"izquierda":"derecha"}" aria-label="Mover ${esc(nombre)} a la ${d<0?"izquierda":"derecha"}" ${off?"disabled":""}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d<0?"m15 6-6 6 6 6":"m9 6 6 6-6 6"}"/></svg></button>`; };
  const bandRow=bandsHtml()+`<button type="button" class="jr-band-nueva" id="jrBandNueva" style="width:${Math.max(120,JW-8)}px">${plus()} Etapa</button>`;
  function bandsHtml(){ return bands.map(b=>{ const et=jr.etapas.find(e=>e.id===b.etapaId); const w=b.len*JW-8;
    return et?`<div class="jr-band" data-band="${et.id}" style="width:${w}px;background:${et.color||'#555'}"${et.descripcion?` title="${esc(et.descripcion)}"`:""}>${flecha(-1,et.id,et.nombre)}<span class="jr-band-t">${esc(et.nombre)}</span>${flecha(1,et.id,et.nombre)}<button type="button" class="jr-band-add" data-addpaso="${et.id}" title="Agregar un paso en ${esc(et.nombre)}" aria-label="Agregar un paso en ${esc(et.nombre)}">${plus()}</button></div>`:`<div class="jr-band empty" style="width:${w}px">sin etapa</div>`; }).join(""); }
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
  </div></div>${sbar("bottom")}${etapasSinPasos(jr)}`;
  c.innerHTML=html;
  c.querySelectorAll("[data-addpaso]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); jrAddPaso(jr,b.dataset.addpaso); });
  // Reordenar etapas en el mapa: la banda (con sus pasos) pasa antes o después de la vecina.
  c.querySelectorAll("[data-mover]").forEach(b=>b.onclick=e=>{ e.stopPropagation();
    const d=+b.dataset.mover, id=b.dataset.et, k=conEtapa.indexOf(id), vecina=conEtapa[k+d]; if(!vecina) return;
    const et=jr.etapas.find(x=>x.id===id); jr.etapas=jr.etapas.filter(x=>x.id!==id);
    const v=jr.etapas.findIndex(x=>x.id===vecina); jr.etapas.splice(d<0?v:v+1,0,et);
    ordenarPasosPorEtapa(jr); saveActiveFlow(); render();
    const otra=document.querySelector(`[data-mover="${d}"][data-et="${id}"]`); if(otra&&!otra.disabled) otra.focus(); });
  jrArrastrarBandas(c,jr,conEtapa);
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
// Las etapas sin pasos no tienen banda en el mapa: se listan abajo para que se vean y
// se pueda empezar a cargarlas.
function etapasSinPasos(jr){
  const vacias=(jr.etapas||[]).filter(e=>!(jr.pasos||[]).some(p=>p.etapaId===e.id));
  if(!vacias.length) return "";
  return `<div class="jr-sin-pasos"><b>Etapas sin pasos</b>${vacias.map(e=>`<button type="button" class="jr-sp" data-addpaso="${e.id}" title="${esc(e.descripcion||"")}"><span class="jr-et-dot" style="background:${e.color||'#555'}"></span>${esc(e.nombre)}<span class="jr-sp-add">${plus()} Paso</span></button>`).join("")}</div>`;
}
/* Arrastrar una banda de etapa para reordenarla (mouse y touch). La banda sigue al puntero,
   una línea marca dónde va a quedar y, al soltar, la etapa pasa ahí con todos sus pasos.
   Cerca de los bordes del mapa, el mapa se desplaza solo. Las flechas quedan para teclado. */
function jrArrastrarBandas(c,jr,conEtapa){
  const scroll=c.querySelector("#jrScroll");
  const bandas=[...c.querySelectorAll(".jr-band[data-band]")];
  bandas.forEach(el=>el.addEventListener("pointerdown",e=>{
    if(e.button!==0||e.target.closest("button")||bandas.length<2) return;
    const id=el.dataset.band, fila=el.parentElement, x0=e.clientX, sc0=scroll?scroll.scrollLeft:0;
    let activo=false, destino=conEtapa.indexOf(id), auto=null, ultimoX=x0;
    const linea=document.createElement("div"); linea.className="jr-drop-line";
    const otros=bandas.filter(b=>b!==el);
    const ubicar=cx=>{
      el.style.transform=`translateX(${cx-x0+((scroll?scroll.scrollLeft:0)-sc0)}px)`;
      let i=otros.findIndex(b=>{ const r=b.getBoundingClientRect(); return cx<r.left+r.width/2; });
      if(i<0) i=otros.length; destino=i;
      const fr=fila.getBoundingClientRect(), ref=otros[i];
      linea.style.left=(ref?ref.getBoundingClientRect().left-fr.left-5:otros[otros.length-1].getBoundingClientRect().right-fr.left+3)+"px";
    };
    const autoScroll=()=>{ if(!scroll||!activo) return; const r=scroll.getBoundingClientRect(), borde=60;
      const v=ultimoX<r.left+borde?-14:ultimoX>r.right-borde?14:0;
      if(v){ scroll.scrollLeft+=v; ubicar(ultimoX); } auto=requestAnimationFrame(autoScroll); };
    const mover=ev=>{ ultimoX=ev.clientX;
      if(!activo){ if(Math.abs(ev.clientX-x0)<6) return; activo=true; el.classList.add("arrastrando"); fila.classList.add("ordenando"); fila.appendChild(linea); auto=requestAnimationFrame(autoScroll); }
      ev.preventDefault(); ubicar(ev.clientX); };
    const soltar=()=>{
      window.removeEventListener("pointermove",mover); window.removeEventListener("pointerup",soltar); window.removeEventListener("pointercancel",soltar);
      cancelAnimationFrame(auto); linea.remove(); el.classList.remove("arrastrando"); fila.classList.remove("ordenando"); el.style.transform="";
      if(!activo) return;
      const orden=conEtapa.filter(x=>x!==id); orden.splice(destino,0,id);
      if(orden.join()===conEtapa.join()) return;
      const sinBanda=jr.etapas.filter(x=>!orden.includes(x.id));
      jr.etapas=[...orden.map(x=>jr.etapas.find(y=>y.id===x)),...sinBanda];
      ordenarPasosPorEtapa(jr); saveActiveFlow(); render();
    };
    window.addEventListener("pointermove",mover,{passive:false}); window.addEventListener("pointerup",soltar); window.addEventListener("pointercancel",soltar);
  }));
}
function jrBarHandlers(c,jr){
  c.querySelector("#jrBack").onclick=()=>{closeJrSide();state.flowMode="list";state.activeFlowId=null;render();};
  c.querySelector("#jrEdit").onclick=()=>flowModal(jr);
  c.querySelector("#jrCarr").onclick=()=>carrilesModal(jr);
  c.querySelector("#jrEtapas").onclick=()=>etapasModal(jr);
  c.querySelector("#jrAddEtapa").onclick=e=>openEtapaPop(e.currentTarget,jr);
  const bn=c.querySelector("#jrBandNueva"); if(bn) bn.onclick=e=>{ e.stopPropagation(); openEtapaPop(bn,jr); };
  c.querySelector("#jrAddPaso").onclick=()=>jrAddPaso(jr);
}
// Con etapaId, el paso va al final de esa etapa (los pasos se ordenan por etapa).
function jrAddPaso(jr,etapaId){ jr.pasos=jr.pasos||[]; const last=jr.pasos[jr.pasos.length-1];
  const et=etapaId||(last?last.etapaId:(jr.etapas[0]?jr.etapas[0].id:null));
  jr.pasos.push({id:uid(),etapaId:et,nombre:"Paso "+(jr.pasos.length+1),emocion:2,touchpoint:"",tpPills:[],acciones:[],expectativas:[],pain:[],oportunidades:[],hallazgos:[],flujos:[]});
  if(etapaId) ordenarPasosPorEtapa(jr);
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
/* Etapas del journey: las que tiene (nombre, descripción, color, quitar), las que ya
   existen para sumar con un clic (las base y las de otros journeys del estudio) y crear una
   nueva. El orden se cambia en el mapa, moviendo cada banda. Se edita una copia: "Cancelar"
   no cambia nada. */
function etapasDisponibles(jr,actuales){
  const tiene=n=>actuales.some(e=>e.nombre.trim().toLowerCase()===n.trim().toLowerCase());
  const vistas=new Map();
  const sumar=e=>{ const k=(e.nombre||"").trim().toLowerCase(); if(k&&!vistas.has(k)&&!tiene(e.nombre)) vistas.set(k,{nombre:e.nombre.trim(),descripcion:e.descripcion||"",color:e.color}); };
  ETAPAS_BASE.forEach(([nombre,descripcion])=>sumar({nombre,descripcion}));
  (state.flujos||[]).filter(f=>f.tipo==="User Journey"&&f.id!==jr.id).forEach(f=>(f.etapas||[]).forEach(sumar));
  return [...vistas.values()];
}
function etapasModal(jr,opts){
  jr.etapas=jr.etapas||[];
  const etapas=jr.etapas.map(e=>({...e}));
  const colorLibre=()=>JR_COLORS.find(c=>!etapas.some(e=>e.color===c))||JR_COLORS[etapas.length%JR_COLORS.length];
  openModal("Etapas del journey",`<section class="et-sec"><h4>En este journey <span class="cnt" id="etCnt"></span></h4><p class="et-ayuda">El orden se cambia en el mapa, con las flechas de cada etapa.</p><div id="etList" class="et-list"></div></section>
    <section class="et-sec"><h4>Agregar etapas</h4><div id="etDisp" class="et-disp"></div></section>
    <section class="et-sec"><h4>Crear una etapa nueva</h4><div class="et-nueva"><input id="etNomNueva" placeholder="Nombre de la etapa" aria-label="Nombre de la etapa nueva"><input id="etDescNueva" placeholder="Qué le pasa al cliente en esta etapa (opcional)" aria-label="Descripción de la etapa nueva"><button type="button" class="btn sm" id="etCrear">${plus()} Crear y agregar</button></div></section>`,async()=>{
    capture();
    const borradas=jr.etapas.filter(e=>!etapas.some(x=>x.id===e.id)).map(e=>e.id);
    jr.etapas=etapas.map(e=>({...e,nombre:(e.nombre||"").trim()||"Etapa",descripcion:(e.descripcion||"").trim()}));
    (jr.pasos||[]).forEach(p=>{ if(borradas.includes(p.etapaId)) p.etapaId=null; });
    ordenarPasosPorEtapa(jr);
    await saveActiveFlow(); render(); return true;
  },"et-modal");
  const list=document.getElementById("etList"), disp=document.getElementById("etDisp");
  function capture(){ etapas.forEach((e,i)=>{ const ni=document.getElementById("et_n_"+i), di=document.getElementById("et_d_"+i); if(ni)e.nombre=ni.value; if(di)e.descripcion=di.value; }); }
  function draw(){
    document.getElementById("etCnt").textContent=etapas.length;
    list.innerHTML=etapas.length?etapas.map((e,i)=>`<div class="et-item">
      <span class="et-n">${i+1}</span>
      <div class="et-campos"><input id="et_n_${i}" value="${esc(e.nombre)}" aria-label="Nombre de la etapa ${i+1}" placeholder="Nombre de la etapa"><input id="et_d_${i}" value="${esc(e.descripcion||"")}" aria-label="Descripción de la etapa ${i+1}" placeholder="Qué le pasa al cliente en esta etapa (opcional)" class="et-desc">
        <span class="et-cols">${JR_COLORS.map(col=>`<button type="button" class="et-col" data-i="${i}" data-c="${col}" title="Color" aria-label="Color" style="border-color:${e.color===col?'var(--ink)':'transparent'};background:${col}"></button>`).join("")}</span></div>
      <button type="button" class="icon-btn sm et-del" data-i="${i}" title="Quitar del journey" aria-label="Quitar ${esc(e.nombre)}">${trash()}</button></div>`).join(""):`<span class="rhint">Este journey no tiene etapas. Agregá alguna de abajo.</span>`;
    const ds=etapasDisponibles(jr,etapas);
    disp.innerHTML=ds.length?ds.map((e,k)=>`<button type="button" class="et-op" data-k="${k}"${e.descripcion?` title="${esc(e.descripcion)}"`:""}><span class="et-op-t">${plus()} ${esc(e.nombre)}</span>${e.descripcion?`<span class="et-op-d">${esc(e.descripcion)}</span>`:""}</button>`).join(""):`<span class="rhint">Ya agregaste todas las etapas disponibles. Podés crear una nueva.</span>`;
    list.querySelectorAll(".et-col").forEach(b=>b.onclick=()=>{ capture(); etapas[+b.dataset.i].color=b.dataset.c; draw(); });
    list.querySelectorAll(".et-del").forEach(b=>b.onclick=()=>{ capture(); etapas.splice(+b.dataset.i,1); draw(); });
    disp.querySelectorAll(".et-op").forEach(b=>b.onclick=()=>{ capture(); const e=ds[+b.dataset.k]; etapas.push({id:uid(),nombre:e.nombre,descripcion:e.descripcion,color:colorLibre()}); draw(); });
  }
  const crear=()=>{ const n=document.getElementById("etNomNueva"), d=document.getElementById("etDescNueva");
    if(!n.value.trim()){ n.focus(); return; }
    capture(); etapas.push({id:uid(),nombre:n.value.trim(),descripcion:d.value.trim(),color:colorLibre()}); n.value=""; d.value=""; draw(); n.focus(); };
  document.getElementById("etCrear").onclick=crear;
  ["etNomNueva","etDescNueva"].forEach(id=>document.getElementById(id).onkeydown=e=>{ if(e.key==="Enter"){ e.preventDefault(); crear(); } });
  draw();
  if(opts&&opts.nueva){ const n=document.getElementById("etNomNueva"); n.scrollIntoView({block:"center"}); n.focus(); }
}
function carrilesModal(jr){
  jr.carriles=jr.carriles||jrDefaultCarriles();
  openModal("Carriles visibles",`<div class="rpt-checks">${JR_CARRILES.map(k=>`<label class="chk"><input type="checkbox" data-cr="${k.id}" ${jr.carriles[k.id]!==false?'checked':''}> ${k.label}</label>`).join("")}</div><span class="hint">Mostrá u ocultá cada fila según lo que necesites.</span>`,async()=>{
    document.querySelectorAll("#modalRoot [data-cr]").forEach(cb=>{ jr.carriles[cb.dataset.cr]=cb.checked; });
    await saveActiveFlow(); render(); return true;
  });
}
