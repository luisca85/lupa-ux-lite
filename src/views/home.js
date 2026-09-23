import { openStudy, view } from "../app/render.js";
import { state } from "../core/state.js";
import { esc } from "../core/util.js";
import { DB } from "../data/backend.js";
import { exportAllData, importAllData } from "../data/respaldo.js";
import { store } from "../data/store.js";
import { chevR, pencil, trash } from "../ui/iconos.js";
import { emptyInline } from "../ui/modales.js";
import { confirmDelStudy, studyModal } from "./estudio.js";

/* ============ Vista: Home (estudios) ============ */
const MES=30*24*60*60*1000;
function kpiCard(label,value,desc,id){
  return `<div class="kpi-card"><div class="kpi">
    <p class="kpi-l">${esc(label)}</p>
    <p class="kpi-v"${id?` id="${id}"`:""}>${esc(String(value))}</p>
    <p class="kpi-d">${esc(desc)}</p>
  </div></div>`;
}
function matchStudy(e,q){
  return !q||[e.nombre,e.cliente,e.url,e.plataforma].some(v=>String(v||"").toLowerCase().includes(q));
}
export function renderHome(){
  const all=state.estudios, q=state.homeQuery.trim().toLowerCase();
  const recientes=all.filter(e=>e.createdAt&&Date.now()-e.createdAt<=MES).length;
  const clientes=new Set(all.map(e=>String(e.cliente||"").trim().toLowerCase()).filter(Boolean)).size;
  const respaldo=DB&&DB.dumpAll?`<button class="btn ghost sm" id="dataExport" title="Descargar un respaldo JSON de todos los datos">Exportar datos</button><button class="btn ghost sm" id="dataImport" title="Cargar un respaldo JSON (de este u otro equipo)">Importar datos</button>`:"";
  const head=`<div class="home-head"><h1 class="home-title">Diagnóstico</h1><div class="spacer"></div>${respaldo}</div>
    <div class="kpi-grid">
      ${kpiCard("Diagnósticos",recientes,"Número de diagnósticos generados en el último mes")}
      ${kpiCard("Clientes",clientes,"Cantidad de clientes")}
      ${kpiCard("Hallazgos",all.length?"·":0,"Cantidad de hallazgos hechos en total","kpiHz")}
    </div>`;
  let body;
  if(!all.length){
    body=`<div class="home-empty"><div class="home-empty-in">
      <div class="home-empty-t"><p class="h">Todavía no hay estudios</p><p class="s">Creá tu primer estudio para empezar a evaluar un sitio o app.</p></div>
      <button class="btn primary home-cta" id="newStudy2"><span class="fig-ico ico-plus" aria-hidden="true"></span>Crear estudio</button>
    </div></div>`;
  } else {
    const list=all.filter(e=>matchStudy(e,q));
    body=`<div class="home-list-head"><h2>Estudios</h2><div class="spacer"></div><button class="btn primary home-cta" id="newStudy"><span class="fig-ico ico-plus" aria-hidden="true"></span>Nuevo estudio</button></div>
      ${list.length?`<div class="grid studies">${list.map(studyCard).join("")}</div>`:emptyInline("Ningún estudio coincide con la búsqueda.")}`;
  }
  view.innerHTML=`<div class="home">${head}${body}</div>`;
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
  // conteo de hallazgos por estudio y total (asíncrono)
  if(all.length){
    Promise.all(all.map(async e=>{
      try{ const hs=await store.listHallazgos(e.id); const el=view.querySelector('[data-study="'+e.id+'"] .hz-count'); if(el)el.textContent=hs.length; return hs.length; }
      catch(_){ return 0; }
    })).then(ns=>{ const t=document.getElementById("kpiHz"); if(t)t.textContent=ns.reduce((a,b)=>a+b,0); });
  }
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
