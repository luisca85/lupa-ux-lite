import { SEVERIDAD, TIPOS } from "../core/catalogo-base.js";
import { heurById, sesgoById, state } from "../core/state.js";
import { LS, esc } from "../core/util.js";
import { store } from "../data/store.js";
import { flagIco } from "../flujos/detalle-nodo.js";
import { flowStore, tipoColorVar } from "../flujos/flujos.js";
import { EMO, JR_CARRILES, JW, emoTop, jrDefaultCarriles, jrNormalizePaso } from "../journey/journey.js";
import { brandStore, bulletsHTML, ensureReporte, findHz, marcaActual, paraHTML, rptSevColor } from "./comun.js";
import { normalizePropuesta, propuestaCardHTML } from "./propuestas.js";
import { compositeDataUrl } from "../ui/anotaciones.js";
import { camIco, chevL, chevR, searchIco, x } from "../ui/iconos.js";

/* ============ Módulo: Reporte online (cliente) ============ */
let CR={};
function reportLink(id){ return location.origin+location.pathname+"#reporte/"+id; }
export function parseReportHash(){ const m=(location.hash||"").match(/^#reporte\/([\w-]+)/); return m?m[1]:null; }
function crHref(u){ u=String(u||""); return /^https?:\/\//i.test(u)?u:("https://"+u); }
function crIco(t){ const p={home:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',flag:'<path d="M5 21V4M5 4h11l-2 3.5L16 11H5"/>',flow:'<circle cx="6" cy="6" r="2.2"/><circle cx="18" cy="6" r="2.2"/><circle cx="12" cy="18" r="2.2"/><path d="M8.2 6H16M6 8.2V13a3 3 0 0 0 3 3h1M18 8.2V13a3 3 0 0 1-3 3h-1"/>',chart:'<path d="M4 20V4M4 20h16M8 20v-6M12 20V9M16 20v-9"/>',user:'<circle cx="12" cy="8" r="3.4"/><path d="M5 20a7 7 0 0 1 14 0"/>',report:'<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',spark:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'}[t]||""; return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`; }
function crBrandMark(m){ return m.headerImg?`<img src="${m.headerImg}" alt="" style="max-height:30px;max-width:150px;object-fit:contain">`:`<span class="cr-word">${esc(m.wordmark)}</span>`; }
function crRoot(){ const app=document.querySelector(".app"); if(app)app.hidden=true; const hd=document.querySelector("header.top"); if(hd)hd.hidden=true; let root=document.getElementById("clientRoot"); if(!root){ root=document.createElement("div"); root.id="clientRoot"; document.body.appendChild(root); } return root; }
function crLoading(){ crRoot().innerHTML=`<div class="cr-gate"><div class="ev-loading" style="color:var(--muted)">Cargando reporte...</div></div>`; }
function crFatal(msg){ crRoot().innerHTML=`<div class="cr-gate"><div class="cr-gate-card"><h2>Reporte</h2><p>${esc(msg)}</p></div></div>`; }
function closeClientReport(){ const root=document.getElementById("clientRoot"); if(root)root.remove(); const app=document.querySelector(".app"); if(app)app.hidden=false; const hd=document.querySelector("header.top"); if(hd)hd.hidden=false; const t=LS.get("lupa:theme",null); if(t)document.documentElement.setAttribute("data-theme",t); else document.documentElement.removeAttribute("data-theme"); if(location.hash)history.replaceState(null,"",location.pathname+location.search); }
export async function openClientReport(estId,opts){
  opts=opts||{};
  document.documentElement.setAttribute("data-theme","light");
  crLoading();
  let est;
  try{ est=(await store.listEstudios()).find(e=>e.id===estId); }catch(e){}
  if(!est){ crFatal("No encontramos este reporte o no está disponible."); return; }
  const r=ensureReporte(est);
  crLoading();
  let hallazgos=[],flujos=[],marca=null;
  try{ [hallazgos,flujos,marca]=await Promise.all([store.listHallazgos(estId),flowStore.list(estId),brandStore.get()]); }catch(e){}
  state.marca=marca; state.activeId=estId; state.hallazgos=hallazgos; state.flujos=flujos; state._flujosFor=estId;
  const imgCache={};
  for(const f of flujos){ for(const n of (f.nodes||[])){ if(n.imgId){ try{ const d=await flowStore.getImg(estId,f.id,n.imgId); if(d)imgCache[f.id+"/"+n.id]=d.full; }catch(e){} } } }
  CR={est,r,hallazgos,flujos,marca:marcaActual(),imgCache,preview:!!opts.preview,section:"inicio"};
  renderClientShell();
}
function crSections(){
  const {r,hallazgos,flujos}=CR;
  const journeys=flujos.filter(f=>f.tipo==="User Journey"), flows=flujos.filter(f=>f.tipo!=="User Journey");
  const list=[{id:"inicio",label:"Inicio",icon:crIco('home')}];
  if(r.online.hallazgos!==false) list.push({id:"hallazgos",label:"Hallazgos",icon:crIco('flag'),count:hallazgos.length});
  if(r.online.flujos!==false&&flows.length) list.push({id:"flujos",label:"Flujos",icon:crIco('flow'),count:flows.length});
  if(r.online.journeys!==false&&journeys.length) list.push({id:"journeys",label:"User Journeys",icon:crIco('chart'),count:journeys.length});
  if(r.online.protopersonas!==false&&r.protopersonas.length) list.push({id:"protopersonas",label:"Protopersonas",icon:crIco('user'),count:r.protopersonas.length});
  if(r.online.diagnostico!==false&&(r.diagIntro||r.hallazgosClave.length||r.recomendaciones.length)) list.push({id:"diagnostico",label:"Diagnóstico",icon:crIco('report')});
  if(r.online.propuestas!==false&&r.propuestas.length) list.push({id:"propuestas",label:"Trabajemos juntos",icon:crIco('spark')});
  if(r.online.contacto!==false) list.push({id:"contacto",label:"Contacto",icon:crIco('mail')});
  return list;
}
function renderClientShell(){
  const {est,marca}=CR, root=crRoot(), secs=crSections();
  if(!secs.find(s=>s.id===CR.section))CR.section="inicio";
  root.innerHTML=`<div class="cr-app">
    <header class="cr-top">
      <div class="cr-brand">${crBrandMark(marca)}</div>
      <div class="cr-study"><div class="cr-cli">${esc(est.cliente||"Diagnóstico UX")}</div><div class="cr-name">${esc(est.nombre)}</div></div>
      <div class="spacer"></div>
      ${CR.preview?`<button class="btn ghost sm" id="crExit">${x()} Cerrar vista previa</button>`:""}
    </header>
    <div class="cr-body">
      <nav class="cr-nav">${secs.map(s=>`<button data-s="${s.id}" class="${CR.section===s.id?'on':''}">${s.icon} ${s.label}${s.count!=null?`<span class="cr-cnt">${s.count}</span>`:""}</button>`).join("")}</nav>
      <main class="cr-main" id="crMain"></main>
    </div>
  </div>`;
  root.querySelectorAll(".cr-nav button").forEach(b=>b.onclick=()=>{ CR.section=b.dataset.s; CR.hzOpen=null; CR.flowOpen=null; CR.nodeOpen=null; CR.flowHzOpen=null; CR.jrOpen=null; renderClientShell(); });
  const ex=root.querySelector("#crExit"); if(ex)ex.onclick=closeClientReport;
  crRenderSection(document.getElementById("crMain"));
}
function crRenderSection(main){
  ({inicio:crInicio,hallazgos:crHallazgos,flujos:crFlujos,journeys:crJourneys,protopersonas:crProtopersonas,diagnostico:crDiagnostico,propuestas:crPropuestas,contacto:crContacto}[CR.section]||crInicio)(main);
  const r=CR.r, f=document.createElement("div"); f.className="cr-foot";
  f.innerHTML=`${(r.muestra.on&&r.muestra.texto&&CR.section!=="inicio")?`<div class="cr-foot-note">${esc(r.muestra.texto)}</div>`:""}<div>${esc(CR.marca.wordmark)}${CR.marca.sitio?" · "+esc(CR.marca.sitio):""}</div>`;
  main.appendChild(f); main.parentElement.scrollTop=0; try{document.getElementById("clientRoot").scrollTop=0;}catch(e){}
}
function crPinCol(hz){ return (hz.severidad!=null&&hz.severidad!=="")?rptSevColor(hz.severidad):`var(${tipoColorVar(hz.tipo)})`; }
function crFindBlock(n,hz){ const heur=(hz.heuristicas||[]).map(id=>{const h=heurById(id);return h?h.nombre:"";}).filter(Boolean).join(", ");
  return `<div class="rpt-find"><span class="rpt-pin sm" style="background:${crPinCol(hz)}">${n}</span><div class="rf"><div class="rf-t">${esc(hz.titulo)}</div>${heur?`<div class="rf-h">Heurística: ${esc(heur)}</div>`:""}${hz.descripcion?`<div class="rf-p"><b>Descripción:</b> ${esc(hz.descripcion)}</div>`:""}${hz.recomendacion?`<div class="rf-p"><b>Recomendación:</b> ${esc(hz.recomendacion)}</div>`:""}</div></div>`; }
function crInicio(main){
  const {est,r,hallazgos}=CR;
  const byT=t=>hallazgos.filter(h=>h.tipo===t).length, sevN=n=>hallazgos.filter(h=>h.tipo==="Problema"&&h.severidad===n).length;
  const tiles=[["Hallazgos",hallazgos.length],["Problemas",byT("Problema")],["Oportunidades",byT("Oportunidad")],["Severidad alta",sevN(3)+sevN(4)]];
  main.innerHTML=`${(r.muestra.on&&r.muestra.texto)?`<div class="cr-teaser">${crIco('spark')}<span>${esc(r.muestra.texto)}</span></div>`:""}
    <div class="cr-hero"><h1>${esc(est.nombre)}</h1>${est.cliente?`<div class="cr-sub">${esc(est.cliente)}</div>`:""}
      <div class="cr-meta">${[est.plataforma,est.fecha].filter(Boolean).map(v=>`<span>${esc(v)}</span>`).join("")}</div></div>
    ${r.resumen?`<div class="cr-prose">${paraHTML(r.resumen)}</div>`:""}
    <div class="cr-tiles">${tiles.map(t=>`<div class="cr-tile"><b>${t[1]}</b><span>${t[0]}</span></div>`).join("")}</div>
    ${r.objetivos?`<h3>Objetivos</h3><div class="cr-prose">${bulletsHTML(r.objetivos)}</div>`:""}
    ${r.alcance?`<h3>Alcance</h3><div class="cr-prose">${bulletsHTML(r.alcance)}</div>`:""}`;
}
function crHallazgos(main){ if(CR.hzOpen) return crHzDetail(main,CR.hzOpen); crHzListView(main); }
function crHzListView(main){
  main.innerHTML=`<h2>Hallazgos</h2>
    <div class="cr-filters">
      <div class="search" style="max-width:240px">${searchIco()}<input id="crQ" placeholder="Buscar..." value="${esc(CR.hzQ||"")}"></div>
      <select id="crFT"><option value="todos">Todos los tipos</option>${TIPOS.map(t=>`<option ${CR.hzTipo===t?'selected':''}>${t}</option>`).join("")}</select>
      <select id="crFS"><option value="todos">Toda severidad</option>${SEVERIDAD.map(s=>`<option value="${s.n}" ${String(CR.hzSev)===String(s.n)?'selected':''}>Sev ${s.n} · ${s.label}</option>`).join("")}</select>
    </div><div class="cr-rows" id="crHzList"></div>`;
  main.querySelector("#crQ").oninput=e=>{ CR.hzQ=e.target.value; crHzList(); };
  main.querySelector("#crFT").onchange=e=>{ CR.hzTipo=e.target.value; crHzList(); };
  main.querySelector("#crFS").onchange=e=>{ CR.hzSev=e.target.value; crHzList(); };
  crHzList();
}
function crHzList(){
  const box=document.getElementById("crHzList"); if(!box)return;
  const q=(CR.hzQ||"").trim().toLowerCase();
  let list=CR.hallazgos.filter(h=>{
    if(CR.hzTipo&&CR.hzTipo!=="todos"&&h.tipo!==CR.hzTipo)return false;
    if(CR.hzSev&&CR.hzSev!=="todos"&&String(h.severidad)!==String(CR.hzSev))return false;
    if(q&&!((h.titulo+" "+(h.descripcion||"")+" "+(h.pantalla||"")).toLowerCase().includes(q)))return false;
    return true;
  });
  const order={Problema:0,Oportunidad:1,"Observación":2};
  list.sort((a,b)=>(order[a.tipo]-order[b.tipo])||((b.severidad??-1)-(a.severidad??-1)));
  box.innerHTML=list.length?list.map(crHzRow).join(""):`<div class="cr-empty">Ningún hallazgo coincide con el filtro.</div>`;
  box.querySelectorAll("[data-hz]").forEach(b=>b.onclick=()=>{ CR.hzOpen=b.dataset.hz; renderClientShell(); });
}
function crHzRow(h){
  const sev=(h.severidad!=null&&h.severidad!=="")?SEVERIDAD[h.severidad]:null;
  const heur=(h.heuristicas||[]).map(id=>{const x=heurById(id);return x?x.nombre:null;}).filter(Boolean).join(", ");
  return `<button class="cr-row" data-hz="${h.id}"><span class="cr-row-sev" style="background:${sev?`var(${sev.v})`:'var(--line-strong)'}">${sev?sev.n:"·"}</span><span class="cr-row-main"><span class="cr-row-t">${esc(h.titulo)}</span>${heur?`<span class="cr-row-sub">${esc(heur)}</span>`:""}</span>${chevR()}</button>`;
}
function crHzDetail(main,id,opts){
  opts=opts||{};
  const h=CR.hallazgos.find(x=>x.id===id); if(!h){ CR.hzOpen=null; return crHzListView(main); }
  const sev=(h.severidad!=null&&h.severidad!=="")?SEVERIDAD[h.severidad]:null;
  const heur=(h.heuristicas||[]).map(x=>heurById(x)).filter(Boolean);
  const ses=(h.sesgos||[]).map(x=>sesgoById(x)).filter(Boolean);
  main.innerHTML=`<button class="cr-back" id="crBack">${chevL()} ${esc(opts.backLabel||"Hallazgos")}</button>
    <div class="cr-detail-head">${sev?`<span class="sev-chip" style="background:var(${sev.v})">Sev ${sev.n} · ${sev.label}</span>`:""}<span class="type-chip type-${esc(h.tipo)}">${esc(h.tipo)}</span>${h.pantalla?`<span class="pantalla">${esc(h.pantalla)}</span>`:""}</div>
    <h2 style="margin-top:6px">${esc(h.titulo)}</h2>
    ${h.descripcion?`<div class="cr-field"><b>Descripción</b><p>${esc(h.descripcion)}</p></div>`:""}
    ${h.recomendacion?`<div class="cr-field"><b>Recomendación</b><p>${esc(h.recomendacion)}</p></div>`:""}
    ${(heur.length||ses.length)?`<div class="rels" style="margin:12px 0">${heur.map(x=>`<span class="rel-chip h">${esc(x.nombre)}</span>`).join("")}${ses.map(x=>`<span class="rel-chip s">${esc(x.nombre)}</span>`).join("")}</div>`:""}
    ${(h.tags&&h.tags.length)?`<div class="rels" style="margin-bottom:12px">${h.tags.map(t=>`<span class="tag-chip">${esc(t)}</span>`).join("")}</div>`:""}
    <div class="cr-figs" id="crFigs">${(h.imgs&&h.imgs.length)?`<div class="ev-loading" style="color:var(--faint)">Cargando imágenes...</div>`:""}</div>`;
  main.querySelector("#crBack").onclick=opts.back||(()=>{ CR.hzOpen=null; renderClientShell(); });
  if(h.imgs&&h.imgs.length){ const figs=main.querySelector("#crFigs"); figs.innerHTML=""; crLoadImages(figs,CR.est.id,h.id,h.imgs); }
}
async function crLoadImages(container,sid,hid,imgs){
  for(const im of imgs){
    let d=null; try{ d=await store.getImg(sid,hid,im.id); }catch(e){}
    if(!d)continue;
    let url; try{ url=await compositeDataUrl(d,0.9); }catch(e){ url=d.base; }
    const pins=(d.ann||[]).filter(a=>a.t==="pin").sort((a,b)=>(a.n||0)-(b.n||0));
    const fig=document.createElement("figure"); fig.className="cr-fig";
    fig.innerHTML=`<img src="${url}" alt="">${pins.length?`<ol class="cr-pins">${pins.map(p=>`<li><span class="cr-pinn" style="background:${p.color||'#e2483d'}">${p.n}</span><span>${esc(p.comment||"")}</span></li>`).join("")}</ol>`:""}`;
    container.appendChild(fig);
  }
}
function crFlujos(main){
  if(CR.flowHzOpen) return crHzDetail(main,CR.flowHzOpen,{backLabel:"Interacción",back:()=>{ CR.flowHzOpen=null; renderClientShell(); }});
  if(CR.flowOpen&&CR.nodeOpen) return crNodeDetail(main);
  if(CR.flowOpen) return crFlowDiagram(main);
  crFlowListView(main);
}
function crFlowListView(main){
  const flows=CR.flujos.filter(f=>f.tipo!=="User Journey");
  main.innerHTML=`<h2>Flujos de usuario</h2><p class="cr-lead">Elegí un flujo para ver su diagrama de interacciones.</p>
    <div class="cr-cards">${flows.length?flows.map(f=>{ const nodes=(f.nodes||[]).length,edges=(f.edges||[]).length,hz=(f.nodes||[]).reduce((s,n)=>s+((n.markers||[]).length),0);
      return `<button class="cr-card2" data-flow="${f.id}"><div class="cr-card2-h"><h3>${esc(f.nombre)}</h3>${chevR()}</div>${f.descripcion?`<p>${esc(f.descripcion)}</p>`:""}<div class="cr-card2-meta">${nodes} interacciones · ${edges} conexiones · ${hz} hallazgos</div></button>`; }).join(""):`<div class="cr-empty">Sin flujos.</div>`}</div>`;
  main.querySelectorAll("[data-flow]").forEach(b=>b.onclick=()=>{ CR.flowOpen=b.dataset.flow; CR.nodeOpen=null; renderClientShell(); });
}
function crFlowDiagram(main){
  const flow=CR.flujos.find(f=>f.id===CR.flowOpen); if(!flow){ CR.flowOpen=null; return crFlowListView(main); }
  main.innerHTML=`<button class="cr-back" id="crBack">${chevL()} Flujos</button><h2>${esc(flow.nombre)}</h2>${flow.descripcion?`<p class="cr-lead">${esc(flow.descripcion)}</p>`:""}
    <div class="fl-legend" style="margin-bottom:10px"><span><i class="lg happy"></i>Happy path</span><span><i class="lg desvio"></i>Desvío</span></div>
    <div class="cr-diagram" id="crDiag"><div class="cr-canvas" id="crCanvas"><svg class="flow-edges" id="crEdges"><defs><marker id="cah-h" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="var(--accent)"/></marker><marker id="cah-d" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="var(--sev3)"/></marker></defs></svg></div></div>
    <p class="cr-hint">Tocá una interacción para ver su detalle completo.</p>`;
  main.querySelector("#crBack").onclick=()=>{ CR.flowOpen=null; renderClientShell(); };
  const canvas=main.querySelector("#crCanvas"), svg=main.querySelector("#crEdges"), nodes=flow.nodes||[], nodeEls={};
  nodes.forEach((n,i)=>{ const el=document.createElement("button"); el.className="cr-fnode"; el.dataset.node=n.id; el.style.left=(n.x||0)+"px"; el.style.top=(n.y||0)+"px";
    const hzc=(n.markers||[]).length;
    el.innerHTML=`<div class="cr-fnode-h"><span class="fnode-n">${i+1}</span><span class="fnode-t">${esc(n.titulo||"Interacción")}</span></div>${n.imgThumb?`<div class="cr-fnode-img"><img src="${n.imgThumb}" alt=""></div>`:`<div class="fnode-noimg">${camIco()} sin imagen</div>`}<div class="cr-fnode-foot">${flagIco()} ${hzc} ${hzc===1?'hallazgo':'hallazgos'}</div>`;
    canvas.appendChild(el); nodeEls[n.id]=el; });
  requestAnimationFrame(()=>{
    let maxX=0,maxY=0; nodes.forEach(n=>{ const el=nodeEls[n.id]; if(el){ maxX=Math.max(maxX,(n.x||0)+el.offsetWidth); maxY=Math.max(maxY,(n.y||0)+el.offsetHeight); } });
    canvas.style.width=(maxX+60)+"px"; canvas.style.height=(maxY+60)+"px"; svg.setAttribute("width",maxX+60); svg.setAttribute("height",maxY+60);
    const anchors=n=>{ const el=nodeEls[n.id]; const w=el?el.offsetWidth:212,h=el?el.offsetHeight:80; return {sx:(n.x||0)+w,sy:(n.y||0)+h/2,tx:(n.x||0),ty:(n.y||0)+h/2}; };
    const map={}; nodes.forEach(n=>map[n.id]=n);
    const paths=(flow.edges||[]).map(e=>{ const a=map[e.from],b=map[e.to]; if(!a||!b)return ""; const A=anchors(a),B=anchors(b),dx=Math.max(46,Math.abs(B.tx-A.sx)/2),d=`M ${A.sx} ${A.sy} C ${A.sx+dx} ${A.sy}, ${B.tx-dx} ${B.ty}, ${B.tx} ${B.ty}`,col=e.tipo==="desvio"?"var(--sev3)":"var(--accent)";
      return `<path d="${d}" fill="none" stroke="${col}" stroke-width="2" ${e.tipo==="desvio"?'stroke-dasharray="6 5"':''} marker-end="url(#cah-${e.tipo==="desvio"?'d':'h'})"/>${e.label?`<text class="edge-label" x="${(A.sx+B.tx)/2}" y="${(A.sy+B.ty)/2-8}" text-anchor="middle">${esc(e.label)}</text>`:""}`; }).join("");
    svg.innerHTML=svg.querySelector("defs").outerHTML+paths;
  });
  canvas.querySelectorAll(".cr-fnode").forEach(el=>el.onclick=()=>{ CR.nodeOpen=el.dataset.node; renderClientShell(); });
}
function crNodeDetail(main){
  const flow=CR.flujos.find(f=>f.id===CR.flowOpen), node=flow?(flow.nodes||[]).find(n=>n.id===CR.nodeOpen):null;
  if(!node){ CR.nodeOpen=null; return crFlowDiagram(main); }
  const src=CR.imgCache[flow.id+"/"+node.id];
  const ms=(node.markers||[]).map(mk=>({mk,hz:findHz(mk.hallazgoId)})).filter(o=>o.hz);
  main.innerHTML=`<button class="cr-back" id="crBack">${chevL()} ${esc(flow.nombre)}</button>
    <div class="cr-detail-head"><span class="fnode-n" style="position:static">${(flow.nodes||[]).findIndex(n=>n.id===node.id)+1}</span><h2 style="margin:0">${esc(node.titulo||"Interacción")}</h2></div>
    ${(node.ve||node.hace)?`<div class="cr-field" style="margin-top:10px">${node.ve?`<p><b>Ve:</b> ${esc(node.ve)}</p>`:""}${node.hace?`<p><b>Hace:</b> ${esc(node.hace)}</p>`:""}</div>`:""}
    <div class="cr-nd-img">${src?`<div class="cr-shot"><img src="${src}" alt="">${ms.map((o,i)=>`<span class="rpt-pin" style="left:${o.mk.x*100}%;top:${o.mk.y*100}%;background:${crPinCol(o.hz)}">${i+1}</span>`).join("")}</div>`:`<div class="cr-empty">Sin imagen.</div>`}</div>
    <h3>Hallazgos de esta interacción</h3>
    <div class="cr-rows">${ms.length?ms.map((o,i)=>`<button class="cr-row" data-hz="${o.hz.id}"><span class="cr-row-sev" style="background:${crPinCol(o.hz)}">${i+1}</span><span class="cr-row-main"><span class="cr-row-t">${esc(o.hz.titulo)}</span>${(o.hz.heuristicas||[]).length?`<span class="cr-row-sub">${esc((o.hz.heuristicas||[]).map(x=>{const y=heurById(x);return y?y.nombre:null;}).filter(Boolean).join(", "))}</span>`:""}</span>${chevR()}</button>`).join(""):`<div class="cr-empty">Sin hallazgos marcados en esta interacción.</div>`}</div>`;
  main.querySelector("#crBack").onclick=()=>{ CR.nodeOpen=null; renderClientShell(); };
  main.querySelectorAll("[data-hz]").forEach(b=>b.onclick=()=>{ CR.flowHzOpen=b.dataset.hz; renderClientShell(); });
}
function crJourneys(main){ if(CR.jrOpen) return crJourneyDetail(main); crJourneyListView(main); }
function crJourneyListView(main){
  const js=CR.flujos.filter(f=>f.tipo==="User Journey");
  main.innerHTML=`<h2>User Journeys</h2><p class="cr-lead">Elegí un journey para ver el mapa completo.</p>
    <div class="cr-cards">${js.length?js.map(j=>{ const pasos=(j.pasos||[]).length,et=(j.etapas||[]).length;
      return `<button class="cr-card2" data-jr="${j.id}"><div class="cr-card2-h"><h3>${esc(j.nombre)}</h3>${chevR()}</div>${j.descripcion?`<p>${esc(j.descripcion)}</p>`:""}<div class="cr-card2-meta">${et} etapas · ${pasos} pasos</div></button>`; }).join(""):`<div class="cr-empty">Sin journeys.</div>`}</div>`;
  main.querySelectorAll("[data-jr]").forEach(b=>b.onclick=()=>{ CR.jrOpen=b.dataset.jr; renderClientShell(); });
}
function crJourneyDetail(main){
  const j=CR.flujos.find(f=>f.id===CR.jrOpen); if(!j){ CR.jrOpen=null; return crJourneyListView(main); }
  main.innerHTML=`<button class="cr-back" id="crBack">${chevL()} User Journeys</button>`+crJourneyMatrix(j);
  main.querySelector("#crBack").onclick=()=>{ CR.jrOpen=null; renderClientShell(); };
}
function crJourneyMatrix(j){
  j.etapas=j.etapas||[]; (j.pasos||[]).forEach(jrNormalizePaso);
  const car=j.carriles||jrDefaultCarriles(), pasos=j.pasos||[], n=pasos.length;
  if(!n) return `<div class="cr-flow"><div class="cr-flow-h"><h3>${esc(j.nombre)}</h3></div><div class="cr-empty">Sin pasos.</div></div>`;
  let bands=[],start=0; for(let i=1;i<=n;i++){ if(i===n||pasos[i].etapaId!==pasos[start].etapaId){ bands.push({etapaId:pasos[start].etapaId,len:i-start}); start=i; } }
  const bandRow=bands.map(b=>{ const et=j.etapas.find(e=>e.id===b.etapaId); const w=b.len*JW-8; return et?`<div class="jr-band" style="width:${w}px;background:${et.color||'#555'}">${esc(et.nombre)}</div>`:`<div class="jr-band empty" style="width:${w}px">sin etapa</div>`; }).join("");
  const heads=pasos.map((p,i)=>`<div class="jr-cell"><div class="jr-pnum">${i+1}</div><div class="jr-pname">${esc(p.nombre||"Paso")}</div></div>`).join("");
  const lbl=id=>{ const k=JR_CARRILES.find(x=>x.id===id); return k.label; };
  const pillsStatic=(arr,cloud)=>`<div class="jr-pills ${cloud?'cloud':''}">${(arr||[]).map(t=>`<span class="jr-pill ${cloud?'cloud':''}">${esc(t)}</span>`).join("")||'<span class="cr-dash">—</span>'}</div>`;
  let rows="";
  if(car.touchpoint!==false) rows+=`<div class="jr-row"><div class="jr-lbl">${lbl("touchpoint")}</div><div class="jr-cells">${pasos.map(p=>`<div class="jr-cell">${pillsStatic(p.tpPills)}${p.touchpoint?`<div class="cr-tp-desc">${esc(p.touchpoint)}</div>`:""}</div>`).join("")}</div></div>`;
  if(car.emocion!==false){ const emo=pasos.map(p=>{ const e=(p.emocion!=null?p.emocion:2); return `<div class="jr-emo-cell"><span class="jr-emo-btn" style="top:${emoTop(e)}px;cursor:default">${EMO[e].emoji}</span></div>`; }).join(""); const pts=pasos.map((p,i)=>[i*JW+JW/2,emoTop(p.emocion)+22]); rows+=`<div class="jr-row jr-emo"><div class="jr-lbl">${lbl("emocion")}</div><div class="jr-cells jr-emo-cells"><svg width="${n*JW}" height="110"><polyline points="${pts.map(p=>p.join(",")).join(" ")}" fill="none" stroke="var(--accent)" stroke-width="2"/>${pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="var(--accent)"/>`).join("")}</svg>${emo}</div></div>`; }
  if(car.acciones!==false) rows+=`<div class="jr-row"><div class="jr-lbl">${lbl("acciones")}</div><div class="jr-cells">${pasos.map(p=>`<div class="jr-cell">${pillsStatic(p.acciones)}</div>`).join("")}</div></div>`;
  if(car.expectativas!==false) rows+=`<div class="jr-row exp"><div class="jr-lbl">${lbl("expectativas")}</div><div class="jr-cells">${pasos.map(p=>`<div class="jr-cell">${pillsStatic(p.expectativas,true)}</div>`).join("")}</div></div>`;
  if(car.pain!==false) rows+=`<div class="jr-row pain"><div class="jr-lbl">${lbl("pain")}</div><div class="jr-cells">${pasos.map(p=>`<div class="jr-cell">${pillsStatic(p.pain)}</div>`).join("")}</div></div>`;
  if(car.oportunidades!==false) rows+=`<div class="jr-row"><div class="jr-lbl">${lbl("oportunidades")}</div><div class="jr-cells">${pasos.map(p=>`<div class="jr-cell">${pillsStatic(p.oportunidades)}</div>`).join("")}</div></div>`;
  return `<div class="cr-flow"><div class="cr-flow-h"><h3>${esc(j.nombre)}</h3>${j.descripcion?`<p>${esc(j.descripcion)}</p>`:""}</div><div class="jr-scroll"><div class="jr-matrix"><div class="jr-row jr-etapas"><div class="jr-lbl">Etapas</div><div class="jr-cells">${bandRow}</div></div><div class="jr-row jr-head"><div class="jr-lbl">Pasos</div><div class="jr-cells">${heads}</div></div>${rows}</div></div></div>`;
}
function crProtopersonas(main){
  main.innerHTML=`<h2>Protopersonas</h2><div class="cr-personas">${CR.r.protopersonas.map(p=>`<div class="cr-persona">
    <div class="pp-head">${p.foto?`<img src="${p.foto}">`:`<div class="pp-ph"></div>`}<div><div class="pp-name">${esc(p.nombre)}${p.edad?", "+esc(p.edad):""}</div><div class="pp-title">${esc(p.titulo||"")}</div>${p.ubicacion?`<div class="pp-meta">Ubicación: ${esc(p.ubicacion)}</div>`:""}${p.ocupacion?`<div class="pp-meta">Ocupación: ${esc(p.ocupacion)}</div>`:""}</div></div>
    ${p.bio?`<div class="pp-sec"><b>Bio</b><p>${esc(p.bio)}</p></div>`:""}
    ${p.necesidades&&p.necesidades.length?`<div class="pp-sec"><b>Necesidades</b><ul>${p.necesidades.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`:""}
    ${p.objetivos&&p.objetivos.length?`<div class="pp-sec"><b>Objetivos</b><ul>${p.objetivos.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`:""}
    ${p.dolores&&p.dolores.length?`<div class="pp-sec"><b>Dolores</b><ul>${p.dolores.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`:""}
  </div>`).join("")}</div>`;
}
function crDiagnostico(main){
  const r=CR.r;
  main.innerHTML=`<h2>Diagnóstico estratégico</h2>
    ${r.diagIntro?`<div class="cr-prose">${paraHTML(r.diagIntro)}</div>`:""}
    ${r.hallazgosClave.length?`<h3>Hallazgos clave</h3>${r.hallazgosClave.map(b=>`<div class="cr-block"><h4>${esc(b.titulo)}</h4><div class="cr-prose">${paraHTML(b.texto)}</div></div>`).join("")}`:""}
    ${r.recomendaciones.length?`<h3>Recomendaciones prioritarias</h3>${r.recomendaciones.map(b=>`<div class="cr-block"><h4>${esc(b.titulo)}</h4><div class="cr-prose">${paraHTML(b.texto)}${b.bullets&&b.bullets.length?`<ul>${b.bullets.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}</div>${b.impacto?`<p class="cr-imp"><b>Impacto esperado:</b> ${esc(b.impacto)}</p>`:""}</div>`).join("")}`:""}`;
}
function crPropuestas(main){
  const r=CR.r;
  main.innerHTML=`<h2>Trabajemos juntos</h2><p class="cr-lead">Formas de seguir avanzando sobre este diagnóstico.</p>
    <div class="cr-props">${r.propuestas.map(p=>propuestaCardHTML(normalizePropuesta(p),esc,paraHTML)).join("")}</div>
    ${crContactoCard(CR.marca)}`;
}
function crContacto(main){ main.innerHTML=`<h2>Contacto</h2>${crContactoCard(CR.marca)}`; }
function crContactoCard(m){
  const svc=(m.servicioNombre||m.servicioDesc)?`<div class="cr-svc"><div class="cr-svc-badge">${esc(m.servicioNombre||"Servicio")}</div>${m.servicioDesc?`<p>${esc(m.servicioDesc)}</p>`:""}${m.servicioUrl?`<a class="cr-svc-link" href="${crHref(m.servicioUrl)}" target="_blank" rel="noopener">Conocer más</a>`:""}</div>`:"";
  return `<div class="cr-contact"><div class="cr-contact-main"><div class="cr-word">${esc(m.wordmark)}</div><div class="cr-contact-name">${esc(m.nombre)}</div><div class="cr-contact-rol">${esc(m.rol)}</div>
    <div class="cr-contact-lines">${m.sitio?`<a href="${crHref(m.sitio)}" target="_blank" rel="noopener">${esc(m.sitio)}</a>`:""}${m.email?`<a href="mailto:${esc(m.email)}">${esc(m.email)}</a>`:""}${m.tel?`<span>${esc(m.tel)}</span>`:""}</div></div>${svc}</div>`;
}
