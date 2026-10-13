import { render } from "../app/render.js";
import { SEVERIDAD } from "../core/catalogo-base.js";
import { state } from "../core/state.js";
import { esc } from "../core/util.js";
import { flowStore, openFlow } from "../flujos/flujos.js";
import { bigIco, chevR, plus } from "../ui/iconos.js";
import { goStudyTab } from "./estudio.js";
import { hzModal } from "./hallazgos.js";

/* ============ Vista: Resumen del proyecto (dashboard) ============ */
export function renderResumenInto(c,est){
  // Los flujos se cargan aparte; mientras tanto la card muestra "Cargando" (o el error).
  if(state._flujosFor!==est.id && !state._flujosLoading && state._flujosErr!==est.id) cargarFlujos(est.id);
  const hz=state.hallazgos;
  const flujos=state._flujosFor===est.id?state.flujos:(state._flujosErr===est.id?"error":null);
  const pps=(est.reporte&&est.reporte.protopersonas)||[];
  c.innerHTML=`<div class="dash">
    ${cardProblemas(hz)}
    ${cardHallazgos(hz)}
    ${cardProtopersonas(pps)}
    ${cardFlujos(flujos)}
  </div>`;
  c.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{
    const f=b.dataset;
    if(f.tipo||f.sev){ state.hzTipo=f.tipo||"todos"; state.hzSev=f.sev||"todos"; state.hzHeur="todos"; state.hzQuery=""; }
    goStudyTab(f.go);
  });
  c.querySelectorAll("[data-hz]").forEach(b=>b.onclick=()=>{ const h=hz.find(x=>x.id===b.dataset.hz); if(h) hzModal(h); });
  c.querySelectorAll("[data-flow]").forEach(b=>b.onclick=()=>{ state.studyTab="flujos"; openFlow(b.dataset.flow); });
  const nh=c.querySelector("#dashNewHz"); if(nh) nh.onclick=()=>hzModal(null);
  const rf=c.querySelector("#dashRetryFl"); if(rf) rf.onclick=()=>{ state._flujosErr=null; render(); };
}
async function cargarFlujos(sid){
  state._flujosLoading=true;
  try{ state.flujos=await flowStore.list(sid); state._flujosFor=sid; state._flujosErr=null; }
  catch(e){ console.error("cargarFlujos",e); state._flujosErr=sid; }
  finally{ state._flujosLoading=false; }
  if(state.view==="study"&&state.studyTab==="resumen"&&state.activeId===sid) render();
}

function dcHead(titulo,sub,accion){
  return `<div class="dc-head"><div><h3>${titulo}</h3>${sub?`<p>${sub}</p>`:""}</div>${accion||""}</div>`;
}
const verTodo=(go,txt)=>`<button class="dc-link" data-go="${go}">${txt||"Ver todos"} ${chevR()}</button>`;

function cardProblemas(hz){
  const n=t=>hz.filter(h=>h.tipo===t).length;
  const prob=hz.filter(h=>h.tipo==="Problema");
  const sev=SEVERIDAD.map(s=>({...s,c:prob.filter(h=>h.severidad===s.n).length}));
  const conSev=sev.reduce((a,s)=>a+s.c,0);
  const top=[...prob].sort((a,b)=>(b.severidad??-1)-(a.severidad??-1)).slice(0,4);
  return `<article class="dcard dc-prob">
    ${dcHead("Resumen de problemas",hz.length?`${hz.length} hallazgos registrados en el estudio`:"Todavía no hay hallazgos",verTodo("hallazgos","Ver hallazgos"))}
    <div class="dp-kpis">
      <button class="dp-kpi" data-go="hallazgos" data-tipo="Problema"><span class="n" style="color:var(--prob)">${n("Problema")}</span><span class="l">Problemas</span></button>
      <button class="dp-kpi" data-go="hallazgos" data-tipo="Oportunidad"><span class="n" style="color:var(--opor)">${n("Oportunidad")}</span><span class="l">Oportunidades</span></button>
      <button class="dp-kpi" data-go="hallazgos" data-tipo="Observación"><span class="n" style="color:var(--obs)">${n("Observación")}</span><span class="l">Observaciones</span></button>
    </div>
    ${prob.length?`
    <div class="dp-sev">
      <div class="dp-sub">Problemas por severidad</div>
      <div class="dp-bar" role="img" aria-label="${sev.map(s=>`Sev ${s.n}: ${s.c}`).join(", ")}">${conSev?sev.slice().reverse().filter(s=>s.c).map(s=>`<span style="flex:${s.c};background:var(${s.v})" title="Sev ${s.n} · ${s.label}: ${s.c}"></span>`).join(""):""}</div>
      <div class="dp-leg">${sev.slice().reverse().map(s=>`<button data-go="hallazgos" data-tipo="Problema" data-sev="${s.n}"><i style="background:var(${s.v})"></i>Sev ${s.n} · ${s.label}<b>${s.c}</b></button>`).join("")}</div>
    </div>
    <div class="dp-top">
      <div class="dp-sub">Prioritarios</div>
      ${top.map(h=>`<button class="dp-row" data-hz="${h.id}"><span class="sev-pill" style="--c:var(${SEVERIDAD[h.severidad??0].v})">Sev ${h.severidad??"–"}</span><span class="t">${esc(h.titulo||"(sin título)")}</span>${chevR()}</button>`).join("")}
    </div>`:`<div class="dc-empty">Cuando registres problemas vas a ver acá su severidad y los más urgentes.</div>`}
  </article>`;
}

function cardHallazgos(hz){
  const recientes=[...hz].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,4);
  const tipoVar=t=>t==="Oportunidad"?"--opor":(t==="Observación"?"--obs":"--prob");
  return `<article class="dcard dc-hz">
    ${dcHead("Hallazgos","Acceso rápido",verTodo("hallazgos"))}
    <button class="btn primary dc-cta" id="dashNewHz">${plus()} Nuevo hallazgo</button>
    ${recientes.length?`<div class="dp-sub">Últimos registrados</div>
    <div class="dh-list">${recientes.map(h=>`<button class="dh-row" data-hz="${h.id}"><i style="background:var(${tipoVar(h.tipo)})" aria-hidden="true"></i><span class="t">${esc(h.titulo||"(sin título)")}</span><span class="k">${esc(h.tipo||"")}</span></button>`).join("")}</div>`
    :`<div class="dc-empty">Registrá el primer problema, oportunidad u observación.</div>`}
  </article>`;
}

function cardProtopersonas(pps){
  return `<article class="dcard dc-pp">
    ${dcHead("Protopersonas",pps.length?`${pps.length} ${pps.length===1?"protopersona":"protopersonas"} en el estudio`:"Le dan contexto a los hallazgos",pps.length?verTodo("proyecto","Editar"):"")}
    ${pps.length?`<div class="pp-grid">${pps.slice(0,4).map(p=>`<button class="pp-card" data-go="proyecto" title="Editar en Configuración">
        ${p.foto?`<img src="${p.foto}" alt="">`:`<span class="pp-av" aria-hidden="true">${esc((p.nombre||"?").charAt(0).toUpperCase())}</span>`}
        <span class="pp-tx"><b>${esc(p.nombre||"Protopersona")}</b>${p.titulo?`<span>${esc(p.titulo)}</span>`:""}<small>${[p.edad?esc(p.edad)+" años":"",esc(p.ocupacion||"")].filter(Boolean).join(" · ")}</small></span>
      </button>`).join("")}</div>`
    :`<div class="dc-start">${bigIco("user")}<p>Todavía no hay protopersonas. Creá la primera a partir de lo que sabés del cliente y sus usuarios.</p><button class="btn sm" data-go="proyecto">${plus()} Crear protopersona</button></div>`}
  </article>`;
}

function cardFlujos(flujos){
  const lista=Array.isArray(flujos)?flujos:null;
  const head=dcHead("Flujos",lista&&lista.length?`${lista.length} ${lista.length===1?"recorrido diagramado":"recorridos diagramados"}`:"User Flows y User Journeys",lista&&lista.length?verTodo("flujos"):"");
  if(flujos==="error") return `<article class="dcard dc-fl">${head}<div class="dc-empty">No se pudieron cargar los flujos. <button class="dc-link" id="dashRetryFl">Reintentar</button></div></article>`;
  if(!flujos) return `<article class="dcard dc-fl">${head}<div class="dc-empty">Cargando flujos…</div></article>`;
  return `<article class="dcard dc-fl">${head}
    ${flujos.length?`<div class="fl-list">${flujos.slice(0,5).map(f=>{
      const jr=f.tipo==="User Journey"; const nodos=jr?(f.etapas||[]).length:(f.nodes||[]).length, marcas=(f.nodes||[]).reduce((s,n)=>s+((n.markers||[]).length),0);
      return `<button class="fl-row" data-flow="${f.id}"><span class="fl-ico" aria-hidden="true">${bigIco(f.tipo==="User Journey"?"chart":"flow")}</span><span class="t"><b>${esc(f.nombre||"(sin nombre)")}</b><small>${esc(f.tipo||"User Flow")} · ${nodos} ${jr?"etapas":"interacciones"}${marcas?` · ${marcas} hallazgos`:""}</small></span>${chevR()}</button>`;
    }).join("")}</div>`
    :`<div class="dc-start">${bigIco("flow")}<p>Diagramá el recorrido de una tarea para mostrar dónde se rompe la experiencia.</p><button class="btn sm" data-go="flujos">${plus()} Crear flujo</button></div>`}
  </article>`;
}
