import { openStudy, view } from "../app/render.js";
import { state } from "../core/state.js";
import { esc } from "../core/util.js";
import { store } from "../data/store.js";
import { chevR, pencil, trash } from "../ui/iconos.js";
import { emptyInline } from "../ui/modales.js";
import { confirmDelStudy, studyModal } from "./estudio.js";
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
  document.getElementById("newStudy").onclick=()=>studyModal(null);
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
