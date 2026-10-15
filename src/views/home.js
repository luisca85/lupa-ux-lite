import { openStudy, view } from "../app/render.js";
import { state } from "../core/state.js";
import { esc } from "../core/util.js";
import { DB } from "../data/backend.js";
import { exportAllData, importAllData } from "../data/respaldo.js";
import { store } from "../data/store.js";
import { chevR, pencil, trash } from "../ui/iconos.js";
import { emptyInline } from "../ui/modales.js";
import { confirmDelStudy, studyModal } from "./estudio.js";
import { renderRecursos } from "./recursos.js";

/* ============ Vista: Home (panel de estudios) ============ */
function matchStudy(e,q){
  return !q||[e.nombre,e.cliente,e.url,e.plataforma].some(v=>String(v||"").toLowerCase().includes(q));
}
export function renderHome(){
  const all=state.estudios, q=state.homeQuery.trim().toLowerCase();
  const list=all.filter(e=>matchStudy(e,q));
  const respaldo=DB&&DB.dumpAll?`<button class="btn ghost sm" id="dataExport" title="Descargar un respaldo JSON de todos los datos">Exportar datos</button><button class="btn ghost sm" id="dataImport" title="Cargar un respaldo JSON (de este u otro equipo)">Importar datos</button>`:"";
  const sub=!all.length?"Todavía no hay estudios. Creá el primero para empezar a evaluar un sitio o app."
    :q?`${list.length} de ${all.length} ${all.length===1?"estudio":"estudios"} coinciden con “${esc(state.homeQuery.trim())}”`
    :`${all.length} ${all.length===1?"estudio":"estudios"}`;
  const nuevo=`<button class="study-add" id="newStudy"><span class="sa-ico" aria-hidden="true"><span class="fig-ico ico-plus"></span></span><span class="sa-t">Nuevo estudio</span><span class="sa-s">Cargá cliente, plataforma y URL</span></button>`;
  view.innerHTML=`<div class="home home-rec-on">
    <aside class="home-rec" id="homeRec" aria-label="Recursos"></aside>
    <section class="home-panel">
      <div class="hp-head">
        <div><h1 class="home-title">Estudios</h1><p class="hp-sub">${sub}</p></div>
        ${respaldo?`<div class="hp-acts">${respaldo}</div>`:""}
      </div>
      <div class="hp-grid">${nuevo}${list.map(studyCard).join("")}</div>
      ${q&&!list.length?emptyInline("Ningún estudio coincide con la búsqueda."):""}
    </section>
  </div>`;
  renderRecursos(document.getElementById("homeRec"));
  document.getElementById("newStudy").onclick=()=>studyModal(null);
  const ex=document.getElementById("dataExport"); if(ex)ex.onclick=()=>exportAllData(ex);
  const im=document.getElementById("dataImport"); if(im)im.onclick=importAllData;
  view.querySelectorAll("[data-study]").forEach(c=>{
    const oa=c.querySelector(".open-area");
    oa.onclick=()=>openStudy(c.dataset.study);
    oa.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openStudy(c.dataset.study);}};
    c.querySelector(".edit").onclick=e=>{e.stopPropagation();studyModal(state.estudios.find(s=>s.id===c.dataset.study));};
    c.querySelector(".del").onclick=e=>{e.stopPropagation();confirmDelStudy(c.dataset.study);};
  });
  // conteo de hallazgos por estudio (asíncrono)
  list.forEach(async e=>{
    try{ const hs=await store.listHallazgos(e.id); const el=view.querySelector('[data-study="'+e.id+'"] .hz-count'); if(el)el.textContent=hs.length; }catch(_){}
  });
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
