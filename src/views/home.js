import { openStudy, view } from "../app/render.js";
import { state } from "../core/state.js";
import { esc } from "../core/util.js";
import { DB } from "../data/backend.js";
import { exportAllData, importAllData } from "../data/respaldo.js";
import { store } from "../data/store.js";
import { bigIco, chevR, pencil, plus, trash } from "../ui/iconos.js";
import { confirmDelStudy, studyModal } from "./estudio.js";

/* ============ Vista: Home (estudios) ============ */
export function renderHome(){
  const head=`<div class="sec-head"><div class="t"><h2>Estudios</h2>
    <p>Cada estudio es un proyecto independiente con sus hallazgos, flujos, protopersonas, métricas y reportes. Entrá a uno para trabajar sobre él.</p></div>
    <div class="spacer"></div>${DB&&DB.dumpAll?`<button class="btn ghost sm" id="dataExport" title="Descargar un respaldo JSON de todos los datos">Exportar datos</button><button class="btn ghost sm" id="dataImport" title="Cargar un respaldo JSON (de este u otro equipo)">Importar datos</button>`:""}${state.estudios.length?`<button class="btn primary" id="newStudy">${plus()} Nuevo estudio</button>`:""}</div>`;
  let body;
  if(!state.estudios.length){
    body=`<div class="empty">${bigIco('folder')}<h3>Todavía no hay estudios</h3>
      <p>Creá tu primer estudio para empezar a evaluar un sitio o app.</p>
      <button class="btn primary" id="newStudy2">${plus()} Crear estudio</button></div>`;
  } else {
    body=`<div class="grid studies">${state.estudios.map(studyCard).join("")}</div>`;
  }
  view.innerHTML=head+body;
  const open=()=>studyModal(null);
  const n1=document.getElementById("newStudy"); if(n1)n1.onclick=open;
  const n2=document.getElementById("newStudy2"); if(n2)n2.onclick=open;
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
  state.estudios.forEach(async e=>{ try{const hs=await store.listHallazgos(e.id);const el=view.querySelector('[data-study="'+e.id+'"] .hz-count');if(el)el.textContent=hs.length;}catch(_){} });
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
