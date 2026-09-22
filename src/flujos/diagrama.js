import { render } from "../app/render.js";
import { state } from "../core/state.js";
import { esc, uid } from "../core/util.js";
import { store } from "../data/store.js";
import { flagIco } from "./detalle-nodo.js";
import { NODE_W, flowModal, flowStore, resolveHz, saveActiveFlow } from "./flujos.js";
import { bigIco, camIco, chevL, pencil, plus, trash, x } from "../ui/iconos.js";
import { openConfirm, openModal, toast } from "../ui/modales.js";

/* ---- Editor de diagrama ---- */
export function renderFlowEditor(c,flow){
  const vp=state.flowVP;
  c.innerHTML=`
    <div class="flow-bar">
      <button class="btn ghost sm" id="flBack">${chevL()} Flujos</button>
      <div class="fl-title"><h3>${esc(flow.nombre)}</h3><span class="chip plat">${esc(flow.tipo||"User Flow")}</span></div>
      <button class="icon-btn sm" id="flEdit" title="Editar flujo" style="width:32px;height:32px">${pencil()}</button>
      <div class="spacer"></div>
      <div class="fl-legend"><span><i class="lg happy"></i>Happy path</span><span><i class="lg desvio"></i>Desvío</span></div>
      <div class="fl-zoom"><button id="zOut" title="Alejar">−</button><button id="zFit" title="Ajustar">${Math.round(vp.k*100)}%</button><button id="zIn" title="Acercar">+</button></div>
      <button class="btn primary sm" id="flAddNode">${plus()} Interacción</button>
    </div>
    <div class="flow-wrap" id="flowWrap">
      <div class="flow-canvas" id="flowCanvas" style="transform:translate(${vp.x}px,${vp.y}px) scale(${vp.k})">
        <svg class="flow-edges" id="flowEdges" width="6000" height="4000">
          <defs>
            <marker id="ah-happy" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="var(--accent)"/></marker>
            <marker id="ah-desvio" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="var(--sev3)"/></marker>
          </defs>
        </svg>
      </div>
      ${(flow.nodes||[]).length?"":`<div class="flow-empty">${bigIco('flow')}<h3>Diagrama vacío</h3><p>Agregá la primera interacción para empezar a construir el recorrido.</p><button class="btn primary" id="flAddNode2">${plus()} Agregar interacción</button></div>`}
      <div class="flow-help">Arrastrá el fondo para moverte · rueda para zoom · arrastrá desde el punto de un nodo para conectar</div>
    </div>`;
  c.querySelector("#flBack").onclick=()=>{state.flowMode="list";state.activeFlowId=null;render();};
  c.querySelector("#flEdit").onclick=()=>flowModal(flow);
  const addNode=()=>flowAddNode(flow);
  c.querySelector("#flAddNode").onclick=addNode;
  const a2=c.querySelector("#flAddNode2"); if(a2)a2.onclick=addNode;
  const wrap=c.querySelector("#flowWrap"), canvas=c.querySelector("#flowCanvas"), svg=c.querySelector("#flowEdges");
  // nodos
  const nodeEls={};
  (flow.nodes||[]).forEach((n,i)=>{
    const el=document.createElement("div");
    el.className="fnode"; el.dataset.node=n.id; el.style.left=n.x+"px"; el.style.top=n.y+"px";
    const hzc=(n.markers||[]).length;
    el.innerHTML=`
      <div class="fnode-h"><span class="fnode-n">${i+1}</span><span class="fnode-t">${esc(n.titulo||"Interacción")}</span>
        <button class="fnode-del" title="Eliminar">${x()}</button></div>
      ${n.imgThumb?`<div class="fnode-img"><img src="${n.imgThumb}" alt=""></div>`:`<div class="fnode-noimg">${camIco()} sin imagen</div>`}
      ${(n.ve||n.hace)?`<div class="fnode-body">${n.ve?`<div><b>Ve</b> ${esc(n.ve)}</div>`:""}${n.hace?`<div><b>Hace</b> ${esc(n.hace)}</div>`:""}</div>`:""}
      <div class="fnode-foot"><span class="fnode-hz ${hzc?'has':''}">${flagIco()} ${hzc} ${hzc===1?'hallazgo':'hallazgos'}</span></div>
      <div class="fnode-handle" title="Arrastrá para conectar"></div>`;
    canvas.appendChild(el); nodeEls[n.id]=el;
  });
  // helpers de coordenadas
  const toCanvas=(clientX,clientY)=>{const r=wrap.getBoundingClientRect();return [(clientX-r.left-state.flowVP.x)/state.flowVP.k,(clientY-r.top-state.flowVP.y)/state.flowVP.k];};
  function applyVP(){const v=state.flowVP;canvas.style.transform=`translate(${v.x}px,${v.y}px) scale(${v.k})`;const zf=c.querySelector("#zFit");if(zf)zf.textContent=Math.round(v.k*100)+"%";}
  function anchors(n){const el=nodeEls[n.id];const w=el?el.offsetWidth:NODE_W,h=el?el.offsetHeight:80;return {sx:n.x+w,sy:n.y+h/2,tx:n.x,ty:n.y+h/2,h};}
  function edgePath(a,b){const dx=Math.max(46,Math.abs(b.tx-a.sx)/2);return `M ${a.sx} ${a.sy} C ${a.sx+dx} ${a.sy}, ${b.tx-dx} ${b.ty}, ${b.tx} ${b.ty}`;}
  function drawEdges(){
    const map={}; (flow.nodes||[]).forEach(n=>map[n.id]=n);
    const paths=(flow.edges||[]).map(e=>{
      const a=map[e.from],b=map[e.to]; if(!a||!b)return "";
      const A=anchors(a),B=anchors(b),d=edgePath(A,B),col=e.tipo==="desvio"?"var(--sev3)":"var(--accent)";
      const mid=`${(A.sx+B.tx)/2} ${(A.sy+B.ty)/2-8}`;
      return `<path class="edge-hit" data-edge="${e.id}" d="${d}"></path>
        <path class="edge-line ${e.tipo==='desvio'?'desvio':'happy'}" d="${d}" fill="none" stroke="${col}" stroke-width="2" ${e.tipo==='desvio'?'stroke-dasharray="6 5"':''} marker-end="url(#ah-${e.tipo==='desvio'?'desvio':'happy'})"></path>
        ${e.label?`<text class="edge-label" x="${(A.sx+B.tx)/2}" y="${(A.sy+B.ty)/2-8}" text-anchor="middle">${esc(e.label)}</text>`:""}`;
    }).join("");
    svg.innerHTML=svg.querySelector("defs").outerHTML+paths+(draftPath||"");
    svg.querySelectorAll(".edge-hit").forEach(p=>p.onclick=ev=>{ev.stopPropagation();edgeModal(flow,(flow.edges||[]).find(e=>e.id===p.dataset.edge));});
  }
  let draftPath="";
  applyVP(); drawEdges();

  // pan + zoom
  let panning=false,panStart=null;
  wrap.addEventListener("pointerdown",e=>{ if(e.target.closest(".fnode")||e.target.closest(".edge-hit")||e.target.closest("button")||e.target.closest(".flow-empty"))return; panning=true;panStart=[e.clientX,e.clientY,state.flowVP.x,state.flowVP.y];wrap.classList.add("grabbing"); });
  window._flowMove=onMove; window._flowUp=onUp;
  window.addEventListener("pointermove",onMove); window.addEventListener("pointerup",onUp);
  wrap.addEventListener("wheel",e=>{ e.preventDefault(); const r=wrap.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top,v=state.flowVP; const k2=Math.min(2,Math.max(.3,v.k*(e.deltaY<0?1.1:0.9))); const cx=(mx-v.x)/v.k,cy=(my-v.y)/v.k; v.x=mx-cx*k2; v.y=my-cy*k2; v.k=k2; applyVP(); },{passive:false});
  c.querySelector("#zIn").onclick=()=>zoomBtn(1.15); c.querySelector("#zOut").onclick=()=>zoomBtn(1/1.15);
  c.querySelector("#zFit").onclick=()=>{state.flowVP={x:40,y:40,k:1};applyVP();drawEdges();};
  function zoomBtn(f){const v=state.flowVP,r=wrap.getBoundingClientRect(),mx=r.width/2,my=r.height/2,k2=Math.min(2,Math.max(.3,v.k*f));const cx=(mx-v.x)/v.k,cy=(my-v.y)/v.k;v.x=mx-cx*k2;v.y=my-cy*k2;v.k=k2;applyVP();}

  // node drag + connect
  let mode=null,curNode=null,startPos=null,moved=false,connFrom=null;
  Object.keys(nodeEls).forEach(id=>{
    const el=nodeEls[id],node=(flow.nodes||[]).find(n=>n.id===id);
    el.querySelector(".fnode-del").onclick=e=>{e.stopPropagation();confirmDelNode(flow,node);};
    el.querySelector(".fnode-handle").addEventListener("pointerdown",e=>{e.stopPropagation();e.preventDefault();mode="conn";connFrom=node;});
    el.addEventListener("pointerdown",e=>{ if(e.target.closest(".fnode-del")||e.target.closest(".fnode-handle"))return; mode="drag";curNode=node;startPos=[e.clientX,e.clientY,node.x,node.y];moved=false; });
  });
  function onMove(e){
    if(panning){const v=state.flowVP;v.x=panStart[2]+(e.clientX-panStart[0]);v.y=panStart[3]+(e.clientY-panStart[1]);applyVP();return;}
    if(mode==="drag"&&curNode){const dx=(e.clientX-startPos[0])/state.flowVP.k,dy=(e.clientY-startPos[1])/state.flowVP.k;if(Math.abs(dx)>3||Math.abs(dy)>3)moved=true;curNode.x=Math.max(0,startPos[2]+dx);curNode.y=Math.max(0,startPos[3]+dy);const el=nodeEls[curNode.id];el.style.left=curNode.x+"px";el.style.top=curNode.y+"px";drawEdges();return;}
    if(mode==="conn"&&connFrom){const A=anchors(connFrom),[cx,cy]=toCanvas(e.clientX,e.clientY);draftPath=`<path class="edge-line happy" d="${edgePath(A,{tx:cx,ty:cy})}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="4 4" opacity=".7"></path>`;drawEdges();return;}
  }
  async function onUp(e){
    if(panning){panning=false;wrap.classList.remove("grabbing");return;}
    if(mode==="drag"&&curNode){ if(moved){await saveActiveFlow();} else { openNode(curNode.id); } mode=null;curNode=null;return; }
    if(mode==="conn"&&connFrom){
      draftPath="";const [cx,cy]=toCanvas(e.clientX,e.clientY);
      const target=(flow.nodes||[]).find(n=>{const el=nodeEls[n.id];const w=el.offsetWidth,h=el.offsetHeight;return cx>=n.x&&cx<=n.x+w&&cy>=n.y&&cy<=n.y+h;});
      if(target&&target.id!==connFrom.id){ flow.edges=flow.edges||[]; if(!flow.edges.some(ed=>ed.from===connFrom.id&&ed.to===target.id)){ flow.edges.push({id:uid(),from:connFrom.id,to:target.id,tipo:"happy",label:""}); await saveActiveFlow(); render(); return; } }
      drawEdges(); mode=null;connFrom=null;return;
    }
  }
}
function flowAddNode(flow){
  flow.nodes=flow.nodes||[];
  const v=state.flowVP, n=flow.nodes.length;
  const x=Math.round((80-v.x)/v.k)+ (n%4)*40, y=Math.round((120-v.y)/v.k)+ (n%4)*30;
  const node={id:uid(),x:Math.max(20,x),y:Math.max(20,y),titulo:"Interacción "+(n+1),ve:"",hace:"",imgId:null,imgThumb:null,imgW:0,imgH:0,markers:[]};
  flow.nodes.push(node);
  render();              // muestra el nodo en el diagrama de inmediato
  saveActiveFlow();      // persiste en segundo plano
}
function openNode(id){ state.activeNodeId=id; state.flowMode="node"; state.ndVP=null; render(); }
export function targetIco(){return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg>';}
function confirmDelNode(flow,node){
  openConfirm("Eliminar interacción",`Se elimina "<b>${esc(node.titulo||'Interacción')}</b>" y sus conexiones. Los hallazgos vinculados quedan en el módulo Hallazgos sin el vínculo.`,async()=>{
    flow.edges=(flow.edges||[]).filter(e=>e.from!==node.id&&e.to!==node.id);
    if(node.imgId) await flowStore.delImg(state.activeId,flow.id,node.imgId);
    // desvincular hallazgos
    for(const m of (node.markers||[])){ const hz=resolveHz(m.hallazgoId); if(hz){ const rec={...hz}; delete rec.flujoId; delete rec.interaccionId; delete rec.interaccionTitulo; await store.saveHallazgo(state.activeId,rec); } }
    flow.nodes=(flow.nodes||[]).filter(n=>n.id!==node.id);
    await saveActiveFlow(); state.hallazgos=await store.listHallazgos(state.activeId);
    state.flowMode="editor"; state.activeNodeId=null; toast("Interacción eliminada"); render();
  });
}
function edgeModal(flow,edge){
  if(!edge)return;
  openModal("Conexión",`
    <div class="field"><label>Tipo de conexión</label>
      <div class="type-seg" id="edgeSeg">
        <button type="button" class="seg ${edge.tipo!=='desvio'?'on':''}" data-t="happy" style="${edge.tipo!=='desvio'?'border-color:var(--accent);color:var(--accent);background:var(--accent-soft)':''}">Happy path</button>
        <button type="button" class="seg ${edge.tipo==='desvio'?'on':''}" data-t="desvio" style="${edge.tipo==='desvio'?'border-color:var(--sev3);color:var(--sev3);background:var(--prob-soft)':''}">Desvío (error / decisión)</button>
      </div></div>
    <div class="field"><label>Etiqueta <span class="opt">opcional</span></label><input id="edgeLabel" value="${esc(edge.label||"")}" placeholder="Ej: si el pago falla, si elige 'más tarde'..."></div>
    <div style="display:flex"><button type="button" class="btn ghost danger sm" id="edgeDel">${trash()} Eliminar conexión</button></div>
  `,async()=>{
    edge.tipo=edgeSel; edge.label=document.getElementById("edgeLabel").value.trim();
    await saveActiveFlow(); toast("Conexión actualizada"); render(); return true;
  });
  let edgeSel=edge.tipo||"happy";
  const seg=document.getElementById("edgeSeg");
  seg.querySelectorAll(".seg").forEach(b=>b.onclick=()=>{edgeSel=b.dataset.t;seg.querySelectorAll(".seg").forEach(o=>{o.classList.toggle("on",o===b);o.removeAttribute("style");});b.setAttribute("style",edgeSel==="desvio"?"border-color:var(--sev3);color:var(--sev3);background:var(--prob-soft)":"border-color:var(--accent);color:var(--accent);background:var(--accent-soft)");});
  document.getElementById("edgeDel").onclick=async()=>{ flow.edges=(flow.edges||[]).filter(e=>e.id!==edge.id); await saveActiveFlow(); document.getElementById("modalRoot").innerHTML=""; toast("Conexión eliminada"); render(); };
}
