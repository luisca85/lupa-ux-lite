import { render } from "../app/render.js";
import { SEVERIDAD } from "../core/catalogo-base.js";
import { heurById, sesgoById, state } from "../core/state.js";
import { esc } from "../core/util.js";
import { flagIco } from "../flujos/detalle-nodo.js";
import { activeFlow, flowModal, openFlow, saveActiveFlow } from "../flujos/flujos.js";
import { camIco, chevL, chevR, pencil, plus, x } from "../ui/iconos.js";
import { hzThumbs, openHzLightbox } from "../ui/imagenes.js";
import { openModal } from "../ui/modales.js";
import { hzModal } from "../views/hallazgos.js";

/* ---- Sidebar de relaciones (hallazgos / user flows por paso) ---- */
export let JSIDE=null;
export function closeJrSide(){ const r=document.getElementById("jrSideRoot"); if(r)r.remove(); JSIDE=null; }
export function openJrSide(jr,idx,kind){ JSIDE={jr,idx,kind,selId:null,width:(JSIDE&&JSIDE.width)||400}; renderJrSide(); }
function jsPaso(){ return JSIDE?JSIDE.jr.pasos[JSIDE.idx]:null; }
function jsItems(){ const p=jsPaso(); if(!p)return[]; return (JSIDE.kind==="hallazgos"?(p.hallazgos||[]).map(id=>state.hallazgos.find(h=>h.id===id)):(p.flujos||[]).map(id=>state.flujos.find(f=>f.id===id&&f.tipo!=="User Journey"))).filter(Boolean); }
function renderJrSide(){
  if(!JSIDE)return;
  const p=jsPaso(); if(!p){ closeJrSide(); return; }
  let root=document.getElementById("jrSideRoot");
  if(!root){ root=document.createElement("div"); root.id="jrSideRoot"; document.body.appendChild(root); }
  const kind=JSIDE.kind, isHz=kind==="hallazgos";
  root.innerHTML=`<div class="jr-side-bg" id="jsBg"></div><aside class="jr-side" style="width:${JSIDE.width}px"><div class="jr-side-rz" id="jsRz"></div>
    <div class="jr-side-h"><div><div class="jr-side-title">${isHz?"Hallazgos":"User Flows"} del paso</div><div class="jr-side-sub">${esc(p.nombre||"Paso")}</div></div><button class="icon-btn" id="jsClose" style="width:32px;height:32px">${x()}</button></div>
    <div class="jr-side-body" id="jsBody"></div></aside>`;
  root.querySelector("#jsBg").onclick=closeJrSide;
  root.querySelector("#jsClose").onclick=closeJrSide;
  // resize
  const rz=root.querySelector("#jsRz");
  rz.addEventListener("pointerdown",e=>{ e.preventDefault(); const sx=e.clientX, sw=JSIDE.width;
    const mv=ev=>{ JSIDE.width=Math.max(320,Math.min(760,sw+(sx-ev.clientX))); const a=root.querySelector(".jr-side"); if(a)a.style.width=JSIDE.width+"px"; };
    const up=()=>{ window.removeEventListener("pointermove",mv); window.removeEventListener("pointerup",up); };
    window.addEventListener("pointermove",mv); window.addEventListener("pointerup",up); });
  jrSideBody();
}
function jrSideBody(){
  const body=document.getElementById("jsBody"); if(!body)return;
  if(JSIDE.selId){ return jrSideDetail(body); }
  const items=jsItems(), isHz=JSIDE.kind==="hallazgos";
  body.innerHTML=`<div class="jr-side-actions"><button class="btn sm" id="jsRelate">${plus()} Relacionar existente</button><button class="btn primary sm" id="jsCreate">${plus()} Crear nuevo</button></div>
    <div class="jr-side-list">${items.length?items.map(it=>{
      if(isHz){ const sev=(it.severidad!=null&&it.severidad!=="")?SEVERIDAD[it.severidad]:null;
        return `<div class="jr-side-row"><button class="jr-side-rm" data-sel="${it.id}"><span class="jr-side-dot" style="background:${sev?`var(${sev.v})`:'var(--line-strong)'}"></span><span class="jr-side-rt">${esc(it.titulo)}</span></button><button class="jr-side-x" data-un="${it.id}" title="Quitar">${x()}</button></div>`; }
      return `<div class="jr-side-row"><button class="jr-side-rm" data-sel="${it.id}"><span class="jr-side-dot" style="background:var(--accent)"></span><span class="jr-side-rt">${esc(it.nombre)}</span></button><button class="jr-side-x" data-un="${it.id}" title="Quitar">${x()}</button></div>`;
    }).join(""):`<div class="cr-empty" style="padding:24px 4px">Sin ${isHz?"hallazgos":"user flows"} relacionados todavía.</div>`}</div>`;
  body.querySelector("#jsRelate").onclick=jrRelateExisting;
  body.querySelector("#jsCreate").onclick=jrCreateRelated;
  body.querySelectorAll(".jr-side-rm").forEach(b=>b.onclick=()=>{ JSIDE.selId=b.dataset.sel; jrSideBody(); });
  body.querySelectorAll(".jr-side-x").forEach(b=>b.onclick=async()=>{ const p=jsPaso(); const key=JSIDE.kind==="hallazgos"?"hallazgos":"flujos"; p[key]=(p[key]||[]).filter(id=>id!==b.dataset.un); await saveActiveFlow(); render(); jrSideBody(); });
}
function jrSideDetail(body){
  const isHz=JSIDE.kind==="hallazgos";
  if(isHz){
    const h=state.hallazgos.find(x=>x.id===JSIDE.selId);
    if(!h){ JSIDE.selId=null; return jrSideBody(); }
    const sev=(h.severidad!=null&&h.severidad!=="")?SEVERIDAD[h.severidad]:null;
    const heur=(h.heuristicas||[]).map(x=>heurById(x)).filter(Boolean), ses=(h.sesgos||[]).map(x=>sesgoById(x)).filter(Boolean);
    body.innerHTML=`<button class="cr-back" id="jsBack">${chevL()} Volver a la lista</button>
      <div class="cr-detail-head">${sev?`<span class="sev-chip" style="background:var(${sev.v})">Sev ${sev.n} · ${sev.label}</span>`:""}<span class="type-chip type-${esc(h.tipo)}">${esc(h.tipo)}</span>${h.pantalla?`<span class="pantalla">${esc(h.pantalla)}</span>`:""}</div>
      <h3 style="margin:6px 0">${esc(h.titulo)}</h3>
      ${h.descripcion?`<div class="cr-field"><b>Descripción</b><p>${esc(h.descripcion)}</p></div>`:""}
      ${h.recomendacion?`<div class="cr-field"><b>Recomendación</b><p>${esc(h.recomendacion)}</p></div>`:""}
      ${(heur.length||ses.length)?`<div class="rels" style="margin:10px 0">${heur.map(x=>`<span class="rel-chip h">${esc(x.nombre)}</span>`).join("")}${ses.map(x=>`<span class="rel-chip s">${esc(x.nombre)}</span>`).join("")}</div>`:""}
      ${(h.imgs&&h.imgs.length)?hzThumbs(h):""}
      <button class="btn sm" id="jsEditHz" style="margin-top:12px">${pencil()} Editar hallazgo</button>`;
    body.querySelector("#jsBack").onclick=()=>{ JSIDE.selId=null; jrSideBody(); };
    body.querySelectorAll(".hz-thumbs .t").forEach((t,idx)=>t.onclick=()=>openHzLightbox(h.id,idx));
    const more=body.querySelector(".hz-thumbs .more"); if(more)more.onclick=()=>openHzLightbox(h.id,5);
    body.querySelector("#jsEditHz").onclick=()=>hzModal(h,{onSaved:async()=>{ renderJrSide(); }});
  } else {
    const f=state.flujos.find(x=>x.id===JSIDE.selId);
    if(!f){ JSIDE.selId=null; return jrSideBody(); }
    const nodes=f.nodes||[];
    body.innerHTML=`<button class="cr-back" id="jsBack">${chevL()} Volver a la lista</button>
      <h3 style="margin:6px 0">${esc(f.nombre)}</h3>${f.descripcion?`<p class="jr-side-desc">${esc(f.descripcion)}</p>`:""}
      <div class="jr-side-meta">${nodes.length} interacciones · ${(f.edges||[]).length} conexiones</div>
      <div class="jr-side-nodes">${nodes.map((n,i)=>{ const hzc=(n.markers||[]).length;
        return `<div class="jr-side-node">${n.imgThumb?`<div class="jr-side-nimg"><img src="${n.imgThumb}" alt=""></div>`:`<div class="jr-side-nimg noimg">${camIco()}</div>`}<div class="jr-side-ninfo"><div class="jr-side-nt">${i+1}. ${esc(n.titulo||"Interacción")}</div><div class="jr-side-nhz">${flagIco()} ${hzc} ${hzc===1?'hallazgo':'hallazgos'}</div></div></div>`; }).join("")||`<div class="cr-empty">Este flujo no tiene interacciones todavía.</div>`}</div>
      <button class="btn sm" id="jsOpenFlow" style="margin-top:12px">Abrir flujo completo ${chevR()}</button>`;
    body.querySelector("#jsBack").onclick=()=>{ JSIDE.selId=null; jrSideBody(); };
    body.querySelector("#jsOpenFlow").onclick=()=>{ closeJrSide(); openFlow(f.id); };
  }
}
function jrRelateExisting(){
  const p=jsPaso(), kind=JSIDE.kind, jr=JSIDE.jr;
  const related=new Set(kind==="hallazgos"?(p.hallazgos||[]):(p.flujos||[]));
  const cands=kind==="hallazgos"?state.hallazgos.filter(h=>!related.has(h.id)):state.flujos.filter(f=>f.tipo!=="User Journey"&&f.id!==jr.id&&!related.has(f.id));
  const sel=new Set();
  openModal(kind==="hallazgos"?"Relacionar hallazgos":"Relacionar user flows",
    cands.length?`<p class="hint" style="margin-bottom:8px">Elegí uno o varios para relacionar a este paso.</p><div class="multi" style="max-height:320px">${cands.map(c=>`<button type="button" class="mchip" data-id="${c.id}">${esc(kind==="hallazgos"?c.titulo:c.nombre)}</button>`).join("")}</div>`:`<p class="hint">No hay ${kind==="hallazgos"?"hallazgos":"user flows"} disponibles para relacionar. Creá uno nuevo con el botón "Crear nuevo".</p>`,
    async()=>{ const key=kind==="hallazgos"?"hallazgos":"flujos"; p[key]=p[key]||[]; sel.forEach(id=>{ if(!p[key].includes(id))p[key].push(id); }); await saveActiveFlow(); render(); renderJrSide(); return true; });
  document.querySelectorAll("#modalRoot .mchip").forEach(b=>b.onclick=()=>{ const id=b.dataset.id; if(sel.has(id)){sel.delete(id);b.classList.remove("on");}else{sel.add(id);b.classList.add("on");} });
}
function jrCreateRelated(){
  const p=jsPaso(), kind=JSIDE.kind;
  if(kind==="hallazgos"){
    hzModal({tipo:"Problema",severidad:3,heuristicas:[],sesgos:[],tags:[]},{onSaved:async(id)=>{ const jr=activeFlow(); const pp=jr&&jr.pasos[JSIDE.idx]; if(!pp)return; JSIDE.jr=jr; pp.hallazgos=pp.hallazgos||[]; if(!pp.hallazgos.includes(id))pp.hallazgos.push(id); await saveActiveFlow(); renderJrSide(); }});
  } else {
    flowModal(null,{onCreated:async(id)=>{ const jr=activeFlow(); const pp=jr&&jr.pasos[JSIDE.idx]; if(!pp)return; JSIDE.jr=jr; pp.flujos=pp.flujos||[]; if(!pp.flujos.includes(id))pp.flujos.push(id); await saveActiveFlow(); renderJrSide(); }});
  }
}
