import { render } from "../app/render.js";
import { SEVERIDAD } from "../core/catalogo-base.js";
import { state } from "../core/state.js";
import { esc, uid } from "../core/util.js";
import { store } from "../data/store.js";
import { targetIco } from "./diagrama.js";
import { flowStore, resolveHz, saveActiveFlow, tipoColorVar } from "./flujos.js";
import { camIco, chevL, pencil, trash, x } from "../ui/iconos.js";
import { processImage } from "../ui/imagenes.js";
import { openConfirm, openModal, toast } from "../ui/modales.js";
import { hzModal, renderHzList } from "../views/hallazgos.js";

/* ---- Detalle de interacción (imagen + hallazgos) ---- */
export function renderNodeDetail(c,flow,node){
  const idx=(flow.nodes||[]).findIndex(n=>n.id===node.id);
  c.innerHTML=`
    <div class="flow-bar">
      <button class="btn ghost sm" id="ndBack">${chevL()} Diagrama</button>
      <div class="fl-title"><span class="fnode-n" style="position:static">${idx+1}</span><h3>${esc(node.titulo||"Interacción")}</h3></div>
      <button class="btn ghost sm" id="ndEdit">${pencil()} Editar interacción</button>
    </div>
    <div class="nd-grid">
      <div class="nd-left">
        <div class="nd-work-bar">
          <div class="fl-zoom"><button id="ndZOut" title="Alejar">−</button><button id="ndZFit" title="Ajustar a pantalla">100%</button><button id="ndZIn" title="Acercar">+</button></div>
          <div class="spacer"></div>
          <button class="btn primary sm" id="ndAddHz" ${node.imgId?"":"disabled"}>${targetIco()} Marcar hallazgo</button>
        </div>
        <div class="nd-stage" id="ndStage" tabindex="0"><div class="ev-loading">Cargando...</div></div>
      </div>
      <div class="nd-right">
        <div class="nd-fields">
          ${node.ve?`<div class="nd-f"><b>Ve</b><span>${esc(node.ve)}</span></div>`:""}
          ${node.hace?`<div class="nd-f"><b>Hace</b><span>${esc(node.hace)}</span></div>`:""}
          ${(!node.ve&&!node.hace)?`<div class="nd-f" style="color:var(--faint)">Sin descripción todavía. Usá "Editar interacción".</div>`:""}
        </div>
        <div class="nd-hz-head"><h4>Hallazgos de esta interacción</h4></div>
        <div class="nd-hz-list" id="ndHzList"></div>
      </div>
    </div>`;
  c.querySelector("#ndBack").onclick=()=>{state.flowMode="editor";state.activeNodeId=null;state.ndVP=null;render();};
  c.querySelector("#ndEdit").onclick=()=>nodeFieldsModal(flow,node);
  const stage=c.querySelector("#ndStage"), hzList=c.querySelector("#ndHzList"), addBtn=c.querySelector("#ndAddHz");
  let vp=state.ndVP||{x:20,y:20,k:1};
  let addMode=false, natW=0, natH=0, imgEl=null, canvasEl=null, pinsEl=null;
  function pinColor(hz){ if(!hz)return "var(--faint)"; if(hz.severidad!=null&&hz.severidad!=="")return "var("+SEVERIDAD[hz.severidad].v+")"; return "var("+tipoColorVar(hz.tipo)+")"; }
  function applyVP(){ if(!canvasEl)return; canvasEl.style.transform=`translate(${vp.x}px,${vp.y}px) scale(${vp.k})`; canvasEl.style.setProperty("--pk",1/vp.k); const zf=c.querySelector("#ndZFit"); if(zf)zf.textContent=Math.round(vp.k*100)+"%"; state.ndVP=vp; }
  function fitView(){ if(!natW)return; const sw=stage.clientWidth-24, sh=stage.clientHeight-24; let k=Math.min(sw/natW,sh/natH,1); if(!isFinite(k)||k<=0)k=1; vp={k, x:(stage.clientWidth-natW*k)/2, y:(stage.clientHeight-natH*k)/2}; applyVP(); }
  function zoomAt(clientX,clientY,f){ const r=stage.getBoundingClientRect(),mx=clientX-r.left,my=clientY-r.top,k2=Math.min(5,Math.max(.15,vp.k*f)); const cx=(mx-vp.x)/vp.k,cy=(my-vp.y)/vp.k; vp.x=mx-cx*k2; vp.y=my-cy*k2; vp.k=k2; applyVP(); }
  function setAdd(v){ if(!node.imgId)return; addMode=v; stage.classList.toggle("adding",v); addBtn.classList.toggle("primary",!v); addBtn.classList.toggle("on-add",v); addBtn.innerHTML=v?"Hacé clic en la imagen · Esc cancela":`${targetIco()} Marcar hallazgo`; }
  function renderPins(){ if(!pinsEl)return; pinsEl.innerHTML=(node.markers||[]).map((m,i)=>{const hz=resolveHz(m.hallazgoId);return `<button class="nd-imgpin" data-hz="${m.hallazgoId}" style="left:${m.x*100}%;top:${m.y*100}%;background:${pinColor(hz)}" title="${hz?esc(hz.titulo):'Hallazgo'}">${i+1}</button>`;}).join(""); pinsEl.querySelectorAll(".nd-imgpin").forEach(p=>p.onclick=e=>{e.stopPropagation();if(addMode)return;const hz=resolveHz(p.dataset.hz);if(hz)hzModal(hz);}); }
  function renderHzList(){
    const ms=(node.markers||[]);
    if(!ms.length){hzList.innerHTML=`<div class="ann-empty">Activá "Marcar hallazgo" y hacé clic sobre la imagen para registrar un hallazgo en ese punto.</div>`;return;}
    hzList.innerHTML=ms.map((m,i)=>{const hz=resolveHz(m.hallazgoId);
      return `<div class="nd-hz" data-hz="${m.hallazgoId}" data-mid="${m.id}"><span class="nd-pin" style="background:${pinColor(hz)}">${i+1}</span>
        <div class="nd-hz-b">${hz?`<div class="nd-hz-t">${esc(hz.titulo)}</div><div class="nd-hz-m"><span class="type-chip type-${esc(hz.tipo)}">${esc(hz.tipo)}</span>${(hz.severidad!=null&&hz.severidad!=="")?`<span class="sev-chip" style="background:var(${SEVERIDAD[hz.severidad].v})">Sev ${hz.severidad}</span>`:""}</div>`:`<div class="nd-hz-t" style="color:var(--faint)">Hallazgo eliminado</div>`}</div>
        <button class="icon-btn sm unlink" title="Quitar del flujo" style="width:28px;height:28px">${x()}</button></div>`;
    }).join("");
    hzList.querySelectorAll(".nd-hz").forEach(row=>{
      row.querySelector(".nd-hz-b").onclick=()=>{const hz=resolveHz(row.dataset.hz);if(hz)hzModal(hz);};
      row.querySelector(".unlink").onclick=async()=>{node.markers=(node.markers||[]).filter(m=>m.id!==row.dataset.mid);await saveActiveFlow();renderPins();renderHzList();toast("Hallazgo desvinculado del flujo");};
    });
  }
  function placePin(clientX,clientY){
    if(!imgEl)return; const r=imgEl.getBoundingClientRect();
    const fx=(clientX-r.left)/r.width, fy=(clientY-r.top)/r.height;
    if(fx<0||fx>1||fy<0||fy>1)return;
    setAdd(false);
    hzModal({tipo:"Problema",severidad:3,pantalla:node.titulo,heuristicas:[],sesgos:[],tags:[],flujoId:flow.id,interaccionId:node.id,interaccionTitulo:node.titulo},
      {onSaved:async(hid)=>{ node.markers=node.markers||[]; node.markers.push({id:uid(),x:fx,y:fy,hallazgoId:hid}); await saveActiveFlow(); }});
  }
  async function setImage(blob){
    try{ const r=await processImage(blob); const imgId=node.imgId||uid();
      await flowStore.putImg(state.activeId,flow.id,imgId,{full:r.full.dataUrl,w:r.full.w,h:r.full.h});
      node.imgId=imgId; node.imgThumb=r.thumb.dataUrl; node.imgW=r.full.w; node.imgH=r.full.h; state.ndVP=null;
      await saveActiveFlow(); toast("Imagen agregada"); render();
    }catch(e){toast("No se pudo procesar la imagen");}
  }
  function buildStage(){
    if(!node.imgId){
      stage.innerHTML=`<div class="ev-drop" id="ndDrop" tabindex="0">${camIco()}<div class="pz-main">Pegá una captura con <kbd>Ctrl/Cmd</kbd> + <kbd>V</kbd></div><div class="pz-sub">o arrastrala, o hacé clic para elegir un archivo</div><input type="file" id="ndFile" accept="image/*" hidden></div>`;
      const drop=stage.querySelector("#ndDrop"), file=stage.querySelector("#ndFile");
      drop.onclick=()=>file.click();
      file.onchange=async e=>{const f=e.target.files[0];if(f&&f.type.indexOf("image")===0)await setImage(f);};
      drop.ondragover=e=>{e.preventDefault();drop.classList.add("drag");}; drop.ondragleave=()=>drop.classList.remove("drag");
      drop.ondrop=async e=>{e.preventDefault();drop.classList.remove("drag");const f=e.dataTransfer.files[0];if(f&&f.type.indexOf("image")===0)await setImage(f);};
      return;
    }
    stage.innerHTML=`<div class="nd-canvas" id="ndCanvas"><img id="ndImg" draggable="false" alt=""><div class="nd-pins" id="ndPins"></div><button class="nd-imgdel" id="ndImgDel" title="Quitar imagen">${trash()}</button></div>`;
    canvasEl=stage.querySelector("#ndCanvas"); imgEl=stage.querySelector("#ndImg"); pinsEl=stage.querySelector("#ndPins");
    stage.querySelector("#ndImgDel").onclick=e=>{ e.stopPropagation(); openConfirm("Quitar imagen","Se quita la imagen de esta interacción. Los hallazgos vinculados se conservan pero pierden su marca de posición.",async()=>{ await flowStore.delImg(state.activeId,flow.id,node.imgId); node.imgId=null;node.imgThumb=null;node.markers=[];state.ndVP=null; await saveActiveFlow(); render(); }); };
    (async()=>{
      const d=await flowStore.getImg(state.activeId,flow.id,node.imgId);
      if(!d){stage.innerHTML=`<div class="ev-loading">No se pudo cargar la imagen.</div>`;return;}
      imgEl.onload=()=>{ natW=imgEl.naturalWidth||node.imgW||800; natH=imgEl.naturalHeight||node.imgH||600; canvasEl.style.width=natW+"px"; canvasEl.style.height=natH+"px"; if(state.ndVP){vp=state.ndVP;applyVP();}else{requestAnimationFrame(fitView);} renderPins(); };
      imgEl.src=d.full;
    })();
    // interacción: zoom, pan, marcar
    stage.addEventListener("wheel",e=>{e.preventDefault();zoomAt(e.clientX,e.clientY,e.deltaY<0?1.12:0.89);},{passive:false});
    let down=false,moved=false,startPan=null;
    stage.addEventListener("pointerdown",e=>{ if(e.target.closest(".nd-imgdel"))return; if(e.target.closest(".nd-imgpin")&&!addMode)return; down=true;moved=false;startPan=[e.clientX,e.clientY,vp.x,vp.y]; });
    const move=e=>{ if(!down)return; const dx=e.clientX-startPan[0],dy=e.clientY-startPan[1]; if(Math.abs(dx)>3||Math.abs(dy)>3)moved=true; if(moved){vp.x=startPan[2]+dx;vp.y=startPan[3]+dy;applyVP();} };
    const up=e=>{ if(!down)return; down=false; if(!moved&&addMode)placePin(e.clientX,e.clientY); };
    window._ndMove=move; window._ndUp=up; window.addEventListener("pointermove",move); window.addEventListener("pointerup",up);
  }
  c.querySelector("#ndBack") && (c.querySelector("#ndBack").title="Volver al diagrama");
  addBtn.onclick=()=>setAdd(!addMode);
  c.querySelector("#ndZIn").onclick=()=>{const r=stage.getBoundingClientRect();zoomAt(r.left+r.width/2,r.top+r.height/2,1.2);};
  c.querySelector("#ndZOut").onclick=()=>{const r=stage.getBoundingClientRect();zoomAt(r.left+r.width/2,r.top+r.height/2,1/1.2);};
  c.querySelector("#ndZFit").onclick=()=>fitView();
  const onKey=e=>{ if(e.key==="Escape"&&addMode)setAdd(false); };
  window._ndKey=onKey; window.addEventListener("keydown",onKey);
  const onPaste=async e=>{const items=e.clipboardData&&e.clipboardData.items;if(!items)return;for(const it of items){if(it.type&&it.type.indexOf("image")===0){e.preventDefault();const b=it.getAsFile();if(b)await setImage(b);break;}}};
  window._ndPaste=onPaste; document.addEventListener("paste",onPaste);
  buildStage(); renderHzList();
}
function nodeFieldsModal(flow,node){
  openModal("Editar interacción",`
    <div class="field"><label>Título</label><input id="nd_tit" value="${esc(node.titulo||"")}" placeholder="Ej: Pantalla de login"></div>
    <div class="field"><label>¿Qué ve el usuario?</label><textarea id="nd_ve" placeholder="La pantalla, los elementos, la información visible...">${esc(node.ve||"")}</textarea></div>
    <div class="field"><label>¿Qué hace el usuario?</label><textarea id="nd_hace" placeholder="La acción: toca, escribe, elige, desliza...">${esc(node.hace||"")}</textarea></div>
  `,async()=>{
    const t=document.getElementById("nd_tit").value.trim(); if(!t){document.getElementById("nd_tit").focus();return false;}
    node.titulo=t; node.ve=document.getElementById("nd_ve").value.trim(); node.hace=document.getElementById("nd_hace").value.trim();
    // propagar título a hallazgos vinculados
    for(const m of (node.markers||[])){ const hz=resolveHz(m.hallazgoId); if(hz&&hz.interaccionTitulo!==t){ await store.saveHallazgo(state.activeId,{...hz,interaccionTitulo:t}); } }
    await saveActiveFlow(); state.hallazgos=await store.listHallazgos(state.activeId); toast("Interacción actualizada"); render(); return true;
  });
  setTimeout(()=>document.getElementById("nd_tit").focus(),40);
}
export function flagIco(){return '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 3.5L16 11H5"/></svg>';}
