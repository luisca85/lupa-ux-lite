import { render } from "../app/render.js";
import { state } from "../core/state.js";
import { LS, esc, stripId, uid } from "../core/util.js";
import { DB, USE_DB } from "../data/backend.js";
import { renderNodeDetail } from "./detalle-nodo.js";
import { renderFlowEditor } from "./diagrama.js";
import { jrDefaultCarriles, jrEtapasBase, renderJourneyEditor } from "../journey/journey.js";
import { bigIco, chevR, pencil, plus, trash, x } from "../ui/iconos.js";
import { openConfirm, openModal, toast } from "../ui/modales.js";
import { ilustraFlujos } from "../views/estudio.js";

/* ============ Módulo: Flujos (User Flow) ============ */
export const NODE_W=212;
export const flowStore={
  async list(sid){ if(USE_DB){const s=await DB.collection("estudios/"+sid+"/flujos").get();return s.docs.map(d=>({id:d.id,...JSON.parse(JSON.stringify(d.data()))}));} return LS.get("lupa:flujos:"+sid,[]); },
  async save(sid,f){ f.updatedAt=Date.now(); if(USE_DB){await DB.doc("estudios/"+sid+"/flujos/"+f.id).set(stripId(f));} else {const a=LS.get("lupa:flujos:"+sid,[]);const i=a.findIndex(x=>x.id===f.id);i>=0?a[i]=f:a.push(f);LS.set("lupa:flujos:"+sid,a);} },
  async del(sid,id){ if(USE_DB){const imgs=await DB.collection("estudios/"+sid+"/flujos/"+id+"/imgs").get();await Promise.all(imgs.docs.map(im=>DB.doc("estudios/"+sid+"/flujos/"+id+"/imgs/"+im.id).delete()));await DB.doc("estudios/"+sid+"/flujos/"+id).delete();} else {LS.set("lupa:flujos:"+sid,LS.get("lupa:flujos:"+sid,[]).filter(x=>x.id!==id));LS.del("lupa:fimg:"+id);} },
  async getImg(sid,fid,imgId){ if(USE_DB){const d=await DB.doc("estudios/"+sid+"/flujos/"+fid+"/imgs/"+imgId).get();return d.exists?d.data():null;} const m=LS.get("lupa:fimg:"+fid,{});return m[imgId]||null; },
  async putImg(sid,fid,imgId,rec){ if(USE_DB){await DB.doc("estudios/"+sid+"/flujos/"+fid+"/imgs/"+imgId).set(rec);} else {const m=LS.get("lupa:fimg:"+fid,{});m[imgId]=rec;LS.set("lupa:fimg:"+fid,m);} },
  async delImg(sid,fid,imgId){ if(USE_DB){await DB.doc("estudios/"+sid+"/flujos/"+fid+"/imgs/"+imgId).delete();} else {const m=LS.get("lupa:fimg:"+fid,{});delete m[imgId];LS.set("lupa:fimg:"+fid,m);} }
};
export function flowIco(){return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="6" height="5" rx="1"/><rect x="15" y="15" width="6" height="5" rx="1"/><path d="M9 6.5h4a2 2 0 0 1 2 2v9"/></svg>';}
export function activeFlow(){ return state.flujos.find(f=>f.id===state.activeFlowId)||null; }
function activeNode(){ const f=activeFlow(); return f?(f.nodes||[]).find(n=>n.id===state.activeNodeId)||null:null; }
export function resolveHz(id){ return state.hallazgos.find(h=>h.id===id)||null; }
export function tipoColorVar(t){ return t==="Oportunidad"?"--opor":(t==="Observación"?"--obs":"--prob"); }
export async function saveActiveFlow(){ const f=activeFlow(); if(!f)return; try{ await flowStore.save(state.activeId,f); }catch(e){ console.error("saveActiveFlow",e); toast("No se pudo guardar el flujo"); } }

export function renderFlujosInto(c,est){
  if(state._flujosFor!==est.id){
    c.innerHTML=`<div class="ev-loading" style="min-height:220px">Cargando flujos...</div>`;
    (async()=>{ state.flujos=await flowStore.list(est.id); state._flujosFor=est.id; render(); })();
    return;
  }
  if(state.flowMode==="journey" && activeFlow()) return renderJourneyEditor(c,activeFlow());
  if(state.flowMode==="editor" && activeFlow()) return renderFlowEditor(c,activeFlow());
  if(state.flowMode==="node" && activeFlow() && activeNode()) return renderNodeDetail(c,activeFlow(),activeNode());
  return renderFlowList(c);
}
/* Lista con flujos: los dos tipos siempre a mano arriba y los flujos agrupados por tipo,
   cada uno con una vista previa (pantallas del flow o curva emocional del journey). */
function renderFlowList(c){
  if(!state.flujos.length) return renderFlujosVacio(c);
  const recientes=(a,b)=>(b.createdAt||0)-(a.createdAt||0);
  const grupos=[
    {tipo:"User Flow",titulo:"User Flows",ico:"flow",lista:state.flujos.filter(f=>f.tipo!=="User Journey").sort(recientes)},
    {tipo:"User Journey",titulo:"User Journeys",ico:"chart",lista:state.flujos.filter(f=>f.tipo==="User Journey").sort(recientes)}
  ];
  c.innerHTML=`<div class="flx-head">
      <div><h2 class="flx-h">Flujos</h2><p class="flx-sub">${state.flujos.length} ${state.flujos.length===1?"flujo":"flujos"} · recorridos pantalla a pantalla y mapas de experiencia por etapas.</p></div>
      <div class="flx-nuevos" role="group" aria-label="Crear un flujo">${OPCIONES_FLUJO.map(o=>`<button type="button" class="btn${o.tipo==="User Flow"?" primary":""}" data-nuevo="${o.tipo}">${plus()} ${o.titulo}</button>`).join("")}</div>
    </div>
    ${grupos.map(g=>`<section class="flx-grupo" aria-label="${g.titulo}">
      <h3 class="flx-gh">${bigIco(g.ico)} ${g.titulo} <span class="cnt">${g.lista.length}</span></h3>
      ${g.lista.length?`<div class="flx-grid">${g.lista.map(flowCard).join("")}</div>`
        :`<button type="button" class="flx-falta" data-nuevo="${g.tipo}">${plus()} Todavía no hay ${g.titulo.toLowerCase()}. Crear el primero</button>`}
    </section>`).join("")}`;
  c.querySelectorAll("[data-nuevo]").forEach(b=>b.onclick=()=>flowModal(null,{tipo:b.dataset.nuevo}));
  c.querySelectorAll("[data-flow]").forEach(el=>{
    el.querySelector(".open-area").onclick=()=>openFlow(el.dataset.flow);
    el.querySelector(".edit").onclick=e=>{e.stopPropagation();flowModal(state.flujos.find(f=>f.id===el.dataset.flow));};
    el.querySelector(".del").onclick=e=>{e.stopPropagation();confirmDelFlow(el.dataset.flow);};
  });
}
/* Estado vacío: explicación a la izquierda y dos cards grandes para empezar,
   una por tipo (User Journey o User Flow). */
const OPCIONES_FLUJO=[
  { tipo:"User Journey", ico:"chart", titulo:"User Journey",
    texto:"Mapeá la experiencia por etapas: lo que la persona hace, piensa y siente, con la curva emocional, los touchpoints y los puntos de dolor.",
    cta:"Crear user journey" },
  { tipo:"User Flow", ico:"flow", titulo:"User Flow",
    texto:"Armá una tarea pantalla a pantalla, con el camino ideal y sus desvíos, y ubicá los hallazgos en cada interacción.",
    cta:"Crear user flow" }
];
function renderFlujosVacio(c){
  c.innerHTML=`<section class="flx-vacio" aria-labelledby="flxT">
    <div class="flx-info">
      <div class="soon-ilu">${ilustraFlujos}</div>
      <h2 id="flxT">Flujos</h2>
      <p class="soon-lead">Ninguna pantalla vive sola. Diagramá los recorridos de las personas usuarias, paso a paso, y mostrá en qué punto se rompe la experiencia.</p>
      <ul class="soon-list">
        <li><span class="soon-ico">${bigIco("flag")}</span><span><b>Hallazgos en cada paso</b><span>Ubicá los hallazgos sobre cada interacción o etapa para mostrar dónde aparecen los problemas.</span></span></li>
        <li><span class="soon-ico">${bigIco("report")}</span><span><b>En el reporte</b><span>Los flujos y journeys se suman al reporte del cliente.</span></span></li>
      </ul>
    </div>
    <div class="flx-ops" role="group" aria-label="Crear un flujo">
      ${OPCIONES_FLUJO.map(o=>`<button type="button" class="flx-op" data-tipo="${o.tipo}">
        <span class="flx-op-ico" aria-hidden="true">${bigIco(o.ico)}</span>
        <span class="flx-op-t">${o.titulo}</span>
        <span class="flx-op-d">${o.texto}</span>
        <span class="flx-op-cta">${plus()} ${o.cta}</span>
      </button>`).join("")}
    </div>
  </section>`;
  c.querySelectorAll(".flx-op").forEach(b=>b.onclick=()=>flowModal(null,{tipo:b.dataset.tipo}));
}
// Vista previa: hasta 4 pantallas del User Flow, o la curva emocional del journey.
function flowPreview(f){
  if(f.tipo==="User Journey"){
    const ps=f.pasos||[];
    if(ps.length<2) return `<div class="flx-prev vacia">${ps.length?"1 paso":"Sin pasos todavía"}</div>`;
    const W=240,H=56, pts=ps.map((p,i)=>[8+i*(W-16)/(ps.length-1), 8+(4-(p.emocion!=null?p.emocion:2))/4*(H-16)]);
    return `<div class="flx-prev"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts.map(p=>p.join(",")).join(" ")}" class="flx-curva"/>${pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3" class="flx-punto"/>`).join("")}</svg></div>`;
  }
  const th=(f.nodes||[]).map(n=>n.imgThumb).filter(Boolean).slice(0,4);
  return th.length?`<div class="flx-prev pants">${th.map(t=>`<img src="${t}" alt="">`).join("")}</div>`:`<div class="flx-prev vacia">${(f.nodes||[]).length?"Interacciones sin pantalla":"Sin interacciones todavía"}</div>`;
}
function flowCard(f){
  const jr=f.tipo==="User Journey";
  const nodes=(f.nodes||[]).length, edges=(f.edges||[]).length;
  const hz=jr?(f.pasos||[]).reduce((s,p)=>s+((p.hallazgos||[]).length),0):(f.nodes||[]).reduce((s,n)=>s+((n.markers||[]).length),0);
  const stats=jr?`<b>${(f.etapas||[]).length}</b> etapas · <b>${(f.pasos||[]).length}</b> pasos · <b>${hz}</b> hallazgos`
    :`<b>${nodes}</b> interacciones · <b>${edges}</b> conexiones · <b>${hz}</b> hallazgos`;
  return `<div class="card study-card flx-card" data-flow="${f.id}">
    <div class="open-area" role="button" tabindex="0">
      ${flowPreview(f)}
      <div class="top-row"><div><h3>${esc(f.nombre)}</h3><div class="client">${esc(f.tipo||"User Flow")}</div></div>${chevR()}</div>
      ${f.descripcion?`<div class="url" style="font-family:var(--sans);color:var(--muted);font-size:12.5px">${esc(f.descripcion)}</div>`:""}
    </div>
    <div class="foot">
      <span class="stat">${stats}</span>
      <div class="actions">
        <button class="icon-btn sm edit" title="Editar" style="width:30px;height:30px">${pencil()}</button>
        <button class="icon-btn sm del" title="Eliminar" style="width:30px;height:30px">${trash()}</button>
      </div>
    </div>
  </div>`;
}
export function openFlow(id){ state.activeFlowId=id; const f=state.flujos.find(x=>x.id===id); state.flowMode=(f&&f.tipo==="User Journey")?"journey":"editor"; state.flowVP={x:40,y:40,k:1}; render(); }
export function flowModal(f,opts){
  opts=opts||{};
  const isNew=!f; f=f||{};
  const tipoFijo=isNew&&opts.tipo; // desde las cards del estado vacío el tipo ya viene elegido
  openModal(isNew?(tipoFijo?`Nuevo ${opts.tipo}`:"Nuevo flujo"):"Editar flujo",`
    <div class="field"><label>Nombre del flujo</label><input id="fl_nombre" value="${esc(f.nombre||"")}" placeholder="${opts.tipo==="User Journey"?"Ej: Primera compra desde el celular":"Ej: Alta de cuenta y primer depósito"}"></div>
    <div class="field"><label>Tipo</label>
      ${tipoFijo?`<div class="chip plat" style="align-self:flex-start">${esc(opts.tipo)}</div><input type="hidden" id="fl_tipo" value="${esc(opts.tipo)}">`
      :isNew?`<select id="fl_tipo"><option value="User Flow" selected>User Flow</option><option value="User Journey">User Journey</option></select>
      <span class="hint">User Flow: recorrido pantalla a pantalla, con diagrama e imágenes. User Journey: mapa de experiencia por etapas, con curva emocional.</span>`
      :`<div class="chip plat" id="fl_tipo_fijo" style="align-self:flex-start">${esc(f.tipo||"User Flow")}</div>
      <span class="hint">El tipo se elige al crear y no se puede cambiar: cada tipo guarda contenido distinto y se perdería.</span>`}</div>
    <div class="field"><label>Descripción / escenario <span class="opt">opcional</span></label><textarea id="fl_desc" placeholder="Tarea, escenario o contexto de este flujo...">${esc(f.descripcion||"")}</textarea></div>
  `,async()=>{
    const nombre=document.getElementById("fl_nombre").value.trim();
    if(!nombre){document.getElementById("fl_nombre").focus();return false;}
    // Al editar, el tipo no cambia: cambiarlo descartaría nodos/conexiones o etapas/pasos.
    const tipo=isNew?(document.getElementById("fl_tipo").value||"User Flow"):(f.tipo||"User Flow");
    const rec={ id:f.id||uid(), nombre, tipo,
      descripcion:document.getElementById("fl_desc").value.trim(),
      createdAt:f.createdAt||Date.now() };
    if(tipo==="User Journey"){ rec.etapas=f.etapas||jrEtapasBase(); rec.pasos=f.pasos||[]; rec.carriles=f.carriles||jrDefaultCarriles(); }
    else { rec.nodes=f.nodes||[]; rec.edges=f.edges||[]; }
    await flowStore.save(state.activeId,rec);
    state.flujos=await flowStore.list(state.activeId);
    toast(isNew?"Flujo creado":"Flujo actualizado");
    if(isNew&&opts.onCreated){ await opts.onCreated(rec.id); render(); }
    else if(isNew){ openFlow(rec.id); } else { render(); }
    return true;
  });
  setTimeout(()=>{ const el=document.getElementById("fl_nombre"); if(el)el.focus(); },40);
}
function confirmDelFlow(id){
  const f=state.flujos.find(x=>x.id===id);
  openConfirm("Eliminar flujo",`Se elimina "<b>${esc(f.nombre)}</b>" con sus interacciones y conexiones. Los hallazgos vinculados no se borran, pero pierden el vínculo con el flujo.`,async()=>{
    await flowStore.del(state.activeId,id);
    state.flujos=await flowStore.list(state.activeId);
    if(state.activeFlowId===id){state.activeFlowId=null;state.flowMode="list";}
    toast("Flujo eliminado"); render();
  });
}
