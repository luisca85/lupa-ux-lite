import { render } from "../app/render.js";
import { state } from "../core/state.js";
import { LS, esc, stripId, uid } from "../core/util.js";
import { DB, USE_DB } from "../data/backend.js";
import { renderNodeDetail } from "./detalle-nodo.js";
import { renderFlowEditor } from "./diagrama.js";
import { jrDefaultCarriles, renderJourneyEditor } from "../journey/journey.js";
import { bigIco, chevR, pencil, plus, trash, x } from "../ui/iconos.js";
import { openConfirm, openModal, toast } from "../ui/modales.js";

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
function renderFlowList(c){
  c.innerHTML=`<div class="tab-actions"><div class="t"><p style="margin:0;color:var(--muted);font-size:13.5px;max-width:70ch">Un User Flow es el recorrido pantalla a pantalla: interacciones (qué ve y qué hace la persona) conectadas por el happy path y sus desvíos.</p></div><div class="spacer"></div>${state.flujos.length?`<button class="btn primary" id="newFlow">${plus()} Nuevo flujo</button>`:""}</div>`;
  if(!state.flujos.length){
    c.innerHTML+=`<div class="empty">${bigIco('flow')}<h3>Todavía no hay flujos</h3><p>Creá un User Flow para diagramar el recorrido de una tarea o escenario.</p><button class="btn primary" id="newFlow2">${plus()} Crear flujo</button></div>`;
  } else {
    c.innerHTML+=`<div class="grid studies">${state.flujos.map(flowCard).join("")}</div>`;
  }
  const n1=c.querySelector("#newFlow"), n2=c.querySelector("#newFlow2");
  if(n1)n1.onclick=()=>flowModal(null); if(n2)n2.onclick=()=>flowModal(null);
  c.querySelectorAll("[data-flow]").forEach(el=>{
    el.querySelector(".open-area").onclick=()=>openFlow(el.dataset.flow);
    el.querySelector(".edit").onclick=e=>{e.stopPropagation();flowModal(state.flujos.find(f=>f.id===el.dataset.flow));};
    el.querySelector(".del").onclick=e=>{e.stopPropagation();confirmDelFlow(el.dataset.flow);};
  });
}
function flowCard(f){
  const nodes=(f.nodes||[]).length, edges=(f.edges||[]).length;
  const hz=(f.nodes||[]).reduce((s,n)=>s+((n.markers||[]).length),0);
  return `<div class="card study-card" data-flow="${f.id}">
    <div class="open-area" role="button" tabindex="0">
      <div class="top-row"><div><h3>${esc(f.nombre)}</h3><div class="client">${esc(f.tipo||"User Flow")}</div></div>${chevR()}</div>
      ${f.descripcion?`<div class="url" style="font-family:var(--sans);color:var(--muted);font-size:12.5px">${esc(f.descripcion)}</div>`:""}
    </div>
    <div class="foot">
      <span class="stat"><b>${nodes}</b> interacciones · <b>${edges}</b> conexiones · <b>${hz}</b> hallazgos</span>
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
  openModal(`${isNew?"Nuevo":"Editar"} flujo`,`
    <div class="field"><label>Nombre del flujo</label><input id="fl_nombre" value="${esc(f.nombre||"")}" placeholder="Ej: Alta de cuenta y primer depósito"></div>
    <div class="field"><label>Tipo</label>
      ${isNew?`<select id="fl_tipo"><option value="User Flow" selected>User Flow</option><option value="User Journey">User Journey</option></select>
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
    if(tipo==="User Journey"){ rec.etapas=f.etapas||[]; rec.pasos=f.pasos||[]; rec.carriles=f.carriles||jrDefaultCarriles(); }
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
