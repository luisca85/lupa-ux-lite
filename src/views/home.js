import { openStudy, view } from "../app/render.js";
import { state } from "../core/state.js";
import { esc } from "../core/util.js";
import { store } from "../data/store.js";
import { chevR, pencil, trash } from "../ui/iconos.js";
import { emptyInline } from "../ui/modales.js";
import { ESTADOS, PLATAFORMAS } from "../core/catalogo-base.js";
import { confirmDelStudy, guardarEstudio, studyModal } from "./estudio.js";
import { renderRecursos } from "./recursos.js";

/* ============ Vista: Home (panel de estudios) ============ */
function matchStudy(e,q){
  return !q||[e.nombre,e.cliente,e.url,e.plataforma].some(v=>String(v||"").toLowerCase().includes(q));
}
// Cuántas tarjetas entran sin scroll: columnas de la grilla × filas que caben en la ventana
// (mínimo 2 filas). La tarjeta "Nuevo estudio" ocupa el primer lugar de cada página.
const CARD_H=208, GAP=16;
function porPagina(){
  const g=view.querySelector(".hp-grid"); if(!g) return 5;
  const cols=Math.max(1,getComputedStyle(g).gridTemplateColumns.split(" ").filter(Boolean).length);
  const libre=window.innerHeight-g.getBoundingClientRect().top-window.scrollY-96; // 96: paginador y margen
  const filas=Math.max(2,Math.floor((libre+GAP)/(CARD_H+GAP)));
  return Math.max(1,cols*filas-1);
}
let alRedimensionar=null;
export function renderHome(){
  const all=state.estudios, q=state.homeQuery.trim().toLowerCase();
  // Los más recientes primero: con paginador, el que acabás de crear queda en la primera página.
  const list=all.filter(e=>matchStudy(e,q)).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const sub=!all.length?"Todavía no hay estudios. Creá el primero para empezar a evaluar un sitio o app."
    :q?`${list.length} de ${all.length} ${all.length===1?"estudio":"estudios"} coinciden con “${esc(state.homeQuery.trim())}”`
    :`${all.length} ${all.length===1?"estudio":"estudios"}`;
  const n=state.homePorPagina||5, paginas=Math.max(1,Math.ceil(list.length/n));
  if(state.homeQ!==q){ state.homeQ=q; state.homePagina=0; }
  const pag=Math.min(state.homePagina||0,paginas-1); state.homePagina=pag;
  const visibles=list.slice(pag*n,pag*n+n);
  const nuevo=`<button class="study-add" id="newStudy"><span class="sa-ico" aria-hidden="true"><span class="fig-ico ico-plus"></span></span><span class="sa-t">Nuevo estudio</span><span class="sa-s">Cargá cliente, plataforma y URL</span></button>`;
  if(state.homeNuevo){
    view.innerHTML=`<div class="home"><aside class="home-rec" id="homeRec" aria-label="Recursos"></aside><section class="home-panel home-est" id="nuevoEstudio"></section></div>`;
    renderRecursos(document.getElementById("homeRec"));
    return formNuevo(document.getElementById("nuevoEstudio"));
  }
  view.innerHTML=`<div class="home">
    <aside class="home-rec" id="homeRec" aria-label="Recursos"></aside>
    <section class="home-panel home-est">
      <div class="hp-head"><div><h1 class="home-title">Estudios</h1><p class="hp-sub">${sub}</p></div></div>
      <div class="hp-grid">${nuevo}${visibles.map(studyCard).join("")}</div>
      ${q&&!list.length?emptyInline("Ningún estudio coincide con la búsqueda."):""}
      ${paginas>1?paginador(pag,paginas,list.length,n):""}
    </section>
  </div>`;
  renderRecursos(document.getElementById("homeRec"));
  document.getElementById("newStudy").onclick=()=>{ state.homeNuevo={paso:1,datos:{plataforma:PLATAFORMAS[0],estado:"En curso",fecha:new Date().toISOString().slice(0,10)}}; renderHome(); };
  view.querySelectorAll("[data-pag]").forEach(b=>b.onclick=()=>{ state.homePagina=+b.dataset.pag; renderHome(); const h=view.querySelector(".home-est"); if(h) h.scrollIntoView({block:"nearest"}); });
  view.querySelectorAll("[data-study]").forEach(c=>{
    const oa=c.querySelector(".open-area");
    oa.onclick=()=>openStudy(c.dataset.study);
    oa.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openStudy(c.dataset.study);}};
    c.querySelector(".edit").onclick=e=>{e.stopPropagation();studyModal(state.estudios.find(s=>s.id===c.dataset.study));};
    c.querySelector(".del").onclick=e=>{e.stopPropagation();confirmDelStudy(c.dataset.study);};
  });
  // conteo de hallazgos por estudio (asíncrono)
  visibles.forEach(async e=>{
    try{ const hs=await store.listHallazgos(e.id); const el=view.querySelector('[data-study="'+e.id+'"] .hz-count'); if(el)el.textContent=hs.length; }catch(_){}
  });
  // Ajusta el tamaño de página a lo que entra en la pantalla (y al cambiar el tamaño de la ventana).
  const medido=porPagina(); if(medido!==state.homePorPagina){ state.homePorPagina=medido; return renderHome(); }
  if(!alRedimensionar){ let t=null; alRedimensionar=()=>{ clearTimeout(t); t=setTimeout(()=>{ if(state.view==="home"&&!document.querySelector(".modal-bg")&&porPagina()!==state.homePorPagina) renderHome(); },200); }; window.addEventListener("resize",alRedimensionar); }
}
/* Nuevo estudio: formulario en dos pasos dentro del bloque de Estudios (sin modal).
   1. Datos básicos (nombre obligatorio) · 2. Detalles. Atrás vuelve al paso anterior o a la
   lista; Escape cancela. Los datos se conservan al ir y volver entre pasos. */
const PASOS_NUEVO=["Datos básicos","Detalles"];
function formNuevo(box){
  const st=state.homeNuevo, d=st.datos, paso=st.paso;
  const opts=(lista,val)=>lista.map(v=>`<option${v===val?" selected":""}>${esc(v)}</option>`).join("");
  box.innerHTML=`<div class="ne">
    <button type="button" class="cf-back" id="neBack"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg> ${paso===1?"Estudios":PASOS_NUEVO[0]}</button>
    <div class="ne-head"><h1 class="home-title">Nuevo estudio</h1>
      <ol class="ne-pasos" aria-label="Pasos">${PASOS_NUEVO.map((t,i)=>`<li class="${i+1===paso?"on":i+1<paso?"ok":""}"${i+1===paso?' aria-current="step"':""}><span>${i+1}</span>${t}</li>`).join("")}</ol></div>
    <form class="ne-form" id="neForm" novalidate>
      ${paso===1?`
      <div class="pf"><label for="f_nombre">Nombre del estudio</label><input id="f_nombre" value="${esc(d.nombre||"")}" placeholder="Ej: Onboarding app de ahorro" required aria-describedby="neErr"></div>
      <div class="pf-row"><div class="pf"><label for="f_cliente">Cliente <span class="hint">opcional</span></label><input id="f_cliente" value="${esc(d.cliente||"")}" placeholder="Nombre del cliente"></div>
        <div class="pf"><label for="f_plat">Plataforma</label><select id="f_plat">${opts(PLATAFORMAS,d.plataforma)}</select></div></div>
      <div class="pf"><label for="f_url">URL o referencia <span class="hint">opcional</span></label><input id="f_url" value="${esc(d.url||"")}" placeholder="https://..."></div>`:`
      <div class="pf-row"><div class="pf"><label for="f_estado">Estado</label><select id="f_estado">${opts(ESTADOS,d.estado)}</select></div>
        <div class="pf"><label for="f_fecha">Fecha</label><input type="date" id="f_fecha" value="${esc(d.fecha||"")}"></div></div>
      <div class="pf"><label for="f_desc">Descripción / alcance <span class="hint">opcional</span></label><textarea id="f_desc" rows="5" placeholder="Objetivo del estudio, alcance, contexto del cliente...">${esc(d.descripcion||"")}</textarea></div>`}
      <p class="ne-err" id="neErr" role="alert"></p>
      <div class="cf-acts ne-acts"><button type="button" class="btn-q" id="neCancel">Cancelar</button><span class="grow"></span>
        ${paso>1?`<button type="button" class="btn-q" id="nePrev">← Atrás</button>`:""}
        <button type="submit" class="btn-q sel" id="neNext">${paso<PASOS_NUEVO.length?"Siguiente →":"Crear estudio"}</button></div>
    </form></div>`;
  const leer=()=>{ for(const [k,id] of [["nombre","f_nombre"],["cliente","f_cliente"],["plataforma","f_plat"],["url","f_url"],["estado","f_estado"],["fecha","f_fecha"],["descripcion","f_desc"]]){ const el=box.querySelector("#"+id); if(el) d[k]=el.value.trim(); } };
  const salir=()=>{ state.homeNuevo=null; document.removeEventListener("keydown",onKey); renderHome(); };
  const ir=n=>{ leer(); st.paso=n; document.removeEventListener("keydown",onKey); formNuevo(box); };
  const onKey=e=>{ if(e.key==="Escape"&&!document.querySelector(".modal-bg")) salir(); };
  document.addEventListener("keydown",onKey);
  box.querySelector("#neBack").onclick=()=>paso===1?salir():ir(paso-1);
  box.querySelector("#neCancel").onclick=salir;
  const prev=box.querySelector("#nePrev"); if(prev) prev.onclick=()=>ir(paso-1);
  box.querySelector("#neForm").onsubmit=async e=>{ e.preventDefault(); leer();
    if(!d.nombre){ st.paso=1; if(paso!==1) return ir(1); box.querySelector("#neErr").textContent="Poné un nombre para el estudio."; box.querySelector("#f_nombre").focus(); return; }
    if(paso<PASOS_NUEVO.length) return ir(paso+1);
    const btn=box.querySelector("#neNext"); btn.disabled=true; btn.textContent="Creando…";
    try{ document.removeEventListener("keydown",onKey); state.homeNuevo=null; await guardarEstudio({...d},true); }
    catch(err){ state.homeNuevo=st; btn.disabled=false; btn.textContent="Crear estudio"; box.querySelector("#neErr").textContent="No se pudo crear: "+((err&&err.message)||err); }
  };
  (box.querySelector(paso===1?"#f_nombre":"#f_estado")).focus();
}
function paginador(pag,paginas,total,n){
  const desde=pag*n+1, hasta=Math.min(total,pag*n+n);
  // Con muchas páginas: primera, última y las vecinas de la actual.
  const nums=[...Array(paginas).keys()].filter(i=>paginas<=7||i===0||i===paginas-1||Math.abs(i-pag)<=1);
  let prev=-1, botones="";
  for(const i of nums){ if(i-prev>1) botones+=`<span class="pg-gap" aria-hidden="true">…</span>`; botones+=`<button type="button" class="pg-n${i===pag?" on":""}" data-pag="${i}" aria-label="Página ${i+1}"${i===pag?' aria-current="page"':""}>${i+1}</button>`; prev=i; }
  return `<nav class="pg" aria-label="Páginas de estudios">
    <span class="pg-info">Mostrando ${desde}–${hasta} de ${total}</span>
    <div class="pg-btns"><button type="button" class="pg-a" data-pag="${pag-1}" ${pag===0?"disabled":""}>‹ Anterior</button>${botones}<button type="button" class="pg-a" data-pag="${pag+1}" ${pag===paginas-1?"disabled":""}>Siguiente ›</button></div>
  </nav>`;
}
function studyCard(e){
  return `<div class="card study-card" data-study="${e.id}">
    <div class="open-area" role="button" tabindex="0">
      <div class="top-row"><div>
        <h3>${esc(e.nombre)}</h3>
        ${e.cliente?`<div class="client">${esc(e.cliente)}</div>`:""}
      </div>${chevR()}</div>
      ${e.url?`<div class="url">${esc(e.url)}</div>`:""}
      <div class="meta">
        ${e.plataforma?`<span class="chip plat">${esc(e.plataforma)}</span>`:""}
        ${e.estado?`<span class="chip estado" data-e="${esc(e.estado)}">${esc(e.estado)}</span>`:""}
      </div>
    </div>
    <div class="foot">
      <span class="stat"><b class="hz-count">·</b> hallazgos</span>
      <div class="actions">
        <button class="icon-btn sm edit" title="Editar" style="width:30px;height:30px">${pencil()}</button>
        <button class="icon-btn sm del" title="Eliminar" style="width:30px;height:30px">${trash()}</button>
      </div>
    </div>
  </div>`;
}
