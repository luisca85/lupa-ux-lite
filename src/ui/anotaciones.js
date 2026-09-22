import { esc, uid } from "../core/util.js";
import { trash, x } from "./iconos.js";

/* ---- Motor de anotaciones ---- */
function imgFromDataUrl(url){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=url;});}
function hexA(hex,a){let h=(hex||"#e2483d").replace("#","");if(h.length===3)h=h.split("").map(c=>c+c).join("");const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return "rgba("+r+","+g+","+b+","+a+")";}
function distSeg(px,py,x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1,l2=dx*dx+dy*dy;if(!l2)return Math.hypot(px-x1,py-y1);let t=((px-x1)*dx+(py-y1)*dy)/l2;t=Math.max(0,Math.min(1,t));return Math.hypot(px-(x1+t*dx),py-(y1+t*dy));}
function annBbox(a){
  if(a.t==="pin")return{x:a.x-16,y:a.y-16,w:32,h:32};
  if(a.t==="text"){const w=(a.text||"").length*(a.size||18)*0.6,h=(a.size||18)*1.25;return{x:a.x,y:a.y,w,h};}
  if(a.t==="highlight")return{x:a.x,y:a.y,w:a.w,h:a.h};
  if(a.t==="arrow")return{x:Math.min(a.x1,a.x2),y:Math.min(a.y1,a.y2),w:Math.abs(a.x2-a.x1),h:Math.abs(a.y2-a.y1)};
  if(a.t==="pen"){const xs=a.points.map(p=>p[0]),ys=a.points.map(p=>p[1]),mnx=Math.min.apply(0,xs),mny=Math.min.apply(0,ys);return{x:mnx,y:mny,w:Math.max.apply(0,xs)-mnx,h:Math.max.apply(0,ys)-mny};}
  return{x:0,y:0,w:0,h:0};
}
function drawArrow(ctx,x1,y1,x2,y2,col,w){
  ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=w;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  const ang=Math.atan2(y2-y1,x2-x1),hl=Math.max(9,w*3.4);
  ctx.beginPath();ctx.moveTo(x2,y2);
  ctx.lineTo(x2-hl*Math.cos(ang-0.42),y2-hl*Math.sin(ang-0.42));
  ctx.lineTo(x2-hl*Math.cos(ang+0.42),y2-hl*Math.sin(ang+0.42));
  ctx.closePath();ctx.fill();
}
function drawAnnotations(ctx,anns,scale,selId){
  (anns||[]).forEach(a=>{
    ctx.save();
    const col=a.color||"#e2483d";
    if(a.t==="pen"){
      ctx.strokeStyle=col;ctx.lineWidth=(a.width||3)*scale;ctx.lineJoin="round";ctx.lineCap="round";
      ctx.beginPath();(a.points||[]).forEach((p,i)=>{const x=p[0]*scale,y=p[1]*scale;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
    } else if(a.t==="highlight"){
      ctx.fillStyle=hexA(col,0.30);ctx.fillRect(a.x*scale,a.y*scale,a.w*scale,a.h*scale);
      ctx.strokeStyle=hexA(col,0.9);ctx.lineWidth=1.5*scale;ctx.strokeRect(a.x*scale,a.y*scale,a.w*scale,a.h*scale);
    } else if(a.t==="arrow"){
      drawArrow(ctx,a.x1*scale,a.y1*scale,a.x2*scale,a.y2*scale,col,(a.width||3)*scale);
    } else if(a.t==="text"){
      const fs=(a.size||18)*scale;ctx.font="600 "+fs+"px 'IBM Plex Sans',system-ui,sans-serif";ctx.textBaseline="top";ctx.textAlign="left";
      ctx.lineWidth=Math.max(2,fs*0.16);ctx.strokeStyle=hexA("#ffffff",0.85);ctx.lineJoin="round";
      ctx.strokeText(a.text||"",a.x*scale,a.y*scale);ctx.fillStyle=col;ctx.fillText(a.text||"",a.x*scale,a.y*scale);
    } else if(a.t==="pin"){
      const r=15*scale,x=a.x*scale,y=a.y*scale;
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
      ctx.lineWidth=2*scale;ctx.strokeStyle="#fff";ctx.stroke();
      ctx.fillStyle=(col.toLowerCase()==="#ffffff"||col.toLowerCase()==="#fff")?"#111":"#fff";
      ctx.font="700 "+(14*scale)+"px 'IBM Plex Mono',monospace";ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillText(String(a.n),x,y);
    }
    if(selId&&a._id===selId){const b=annBbox(a);ctx.setLineDash([5,4]);ctx.strokeStyle="#2f80ed";ctx.lineWidth=1.5;ctx.strokeRect(b.x*scale-4,b.y*scale-4,b.w*scale+8,b.h*scale+8);}
    ctx.restore();
  });
}
export async function compositeDataUrl(d,quality){
  const im=await imgFromDataUrl(d.base);const w=d.w||im.width,h=d.h||im.height;
  const c=document.createElement("canvas");c.width=w;c.height=h;const ctx=c.getContext("2d");
  ctx.drawImage(im,0,0,w,h);drawAnnotations(ctx,d.ann||[],1,null);
  return c.toDataURL("image/jpeg",quality||0.85);
}
export async function compositeThumb(d,maxW){
  const im=await imgFromDataUrl(d.base);let w=d.w||im.width,h=d.h||im.height,s=1;
  if(w>maxW)s=maxW/w;
  const c=document.createElement("canvas");c.width=Math.round(w*s);c.height=Math.round(h*s);const ctx=c.getContext("2d");
  ctx.drawImage(im,0,0,c.width,c.height);drawAnnotations(ctx,d.ann||[],s,null);
  return c.toDataURL("image/jpeg",0.6);
}
function hitTest(anns,x,y){
  for(let i=anns.length-1;i>=0;i--){const a=anns[i];
    if(a.t==="pin"){if(Math.hypot(x-a.x,y-a.y)<=18)return a;}
    else if(a.t==="text"){const b=annBbox(a);if(x>=b.x-4&&x<=b.x+b.w+4&&y>=b.y-4&&y<=b.y+b.h+4)return a;}
    else if(a.t==="highlight"){if(x>=a.x-4&&x<=a.x+a.w+4&&y>=a.y-4&&y<=a.y+a.h+4)return a;}
    else if(a.t==="arrow"){if(distSeg(x,y,a.x1,a.y1,a.x2,a.y2)<9)return a;}
    else if(a.t==="pen"){for(const p of (a.points||[]))if(Math.hypot(x-p[0],y-p[1])<9)return a;}
  }
  return null;
}
function aIco(p){return '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>';}
function toolBtn(t,title,svg){return `<button data-t="${t}" title="${title}">${svg}</button>`;}
function undoIco(){return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg>';}
export async function mountAnnotator(container,img,opts){
  opts=opts||{}; const onChange=opts.onChange||function(){};
  const baseImg=await imgFromDataUrl(img.base).catch(()=>null);
  if(!baseImg){container.innerHTML='<div class="ev-loading">No se pudo abrir la imagen.</div>';return;}
  const natW=img.w||baseImg.width, natH=img.h||baseImg.height;
  let ann=(img.ann||[]).map(a=>({...a,_id:uid(),points:a.points?a.points.map(p=>[...p]):undefined}));
  let tool="pin", color="#e2483d", width=3, sel=null, draft=null;
  const COLORS=["#e2483d","#f5a623","#f2c200","#2ecc71","#2f80ed","#111111","#ffffff"];
  const dpr=window.devicePixelRatio||1;
  container.innerHTML=`<div class="ev-annotator">
    <div class="ann-toolbar">
      <div class="ann-tools" id="annTools">
        ${toolBtn("select","Seleccionar y mover",aIco('<path d="M4 3l7 17 2.5-7L20 10.5 4 3z"/>'))}
        ${toolBtn("pin","Pin numerado con comentario",aIco('<circle cx="12" cy="12" r="8"/><path d="M12 9v6M9 12h6" stroke-width="1.6"/>'))}
        ${toolBtn("arrow","Flecha",aIco('<path d="M5 19 19 5M11 5h8v8"/>'))}
        ${toolBtn("text","Texto",aIco('<path d="M5 5h14M12 5v14M9 19h6"/>'))}
        ${toolBtn("highlight","Resaltador",aIco('<path d="M4 20h6M14 4l6 6L9 21l-5 1 1-5L14 4z"/>'))}
        ${toolBtn("pen","Dibujo libre",aIco('<path d="M3 21c3-1 4-4 6-6M15 5l4 4-9 9-5 1 1-5 9-9z"/>'))}
      </div>
      <div class="ann-sep"></div>
      <div class="ann-colors" id="annColors">${COLORS.map(c=>`<button class="sw ${c===color?'on':''}" data-c="${c}" style="background:${c}" title="Color"></button>`).join("")}</div>
      <div class="ann-widths" id="annWidths">${[2,3,6].map(w=>`<button class="${w===width?'on':''}" data-w="${w}" title="Grosor"><span class="dot" style="width:${w+2}px;height:${w+2}px"></span></button>`).join("")}</div>
      <div class="ann-spacer"></div>
      <button type="button" class="btn ghost sm" id="annUndo" title="Deshacer">${undoIco()}</button>
      <button type="button" class="btn ghost sm" id="annClear">Limpiar</button>
    </div>
    <div class="ann-stage" id="annStage" tabindex="0"><canvas id="annCv"></canvas></div>
    <div class="ann-comments" id="annComments"></div>
  </div>`;
  const stage=container.querySelector("#annStage"), cv=container.querySelector("#annCv"), ctx=cv.getContext("2d");
  let scale=1,dispW=natW,dispH=natH;
  function layout(){
    const availW=Math.max(140,stage.clientWidth-24), availH=Math.max(140,stage.clientHeight-24);
    scale=Math.min(availW/natW,availH/natH,1); if(!isFinite(scale)||scale<=0)scale=1;
    dispW=Math.round(natW*scale);dispH=Math.round(natH*scale);
    cv.width=Math.round(dispW*dpr);cv.height=Math.round(dispH*dpr);cv.style.width=dispW+"px";cv.style.height=dispH+"px";
    ctx.setTransform(dpr,0,0,dpr,0,0);redraw();
  }
  function redraw(){ctx.clearRect(0,0,dispW,dispH);ctx.drawImage(baseImg,0,0,dispW,dispH);drawAnnotations(ctx,ann,scale,sel);if(draft)drawAnnotations(ctx,[draft],scale,null);}
  function changed(){onChange(ann.map(a=>{const c={...a};delete c._id;return c;}));}
  function nextNum(){return ann.filter(a=>a.t==="pin").reduce((m,a)=>Math.max(m,a.n),0)+1;}
  function renumber(){let i=1;ann.filter(a=>a.t==="pin").sort((a,b)=>a.n-b.n).forEach(a=>a.n=i++);}
  function removeAnn(a){ann=ann.filter(x=>x!==a);if(a.t==="pin")renumber();if(sel===a._id)sel=null;redraw();renderSide();changed();}
  function renderSide(){
    const box=container.querySelector("#annComments");
    const pins=ann.filter(a=>a.t==="pin").slice().sort((a,b)=>a.n-b.n);
    if(!pins.length){box.innerHTML=`<div class="ann-empty">Marcá puntos con el pin numerado y escribí acá el comentario de cada uno.</div>`;return;}
    box.innerHTML=pins.map(p=>`<div class="ann-comment" data-id="${p._id}"><span class="pn" style="background:${p.color||'#e2483d'}">${p.n}</span><textarea placeholder="Comentario del punto ${p.n}...">${esc(p.comment||"")}</textarea><button type="button" class="icon-btn sm del" title="Quitar punto" style="width:28px;height:28px">${trash()}</button></div>`).join("");
    box.querySelectorAll(".ann-comment").forEach(row=>{const p=ann.find(a=>a._id===row.dataset.id);row.querySelector("textarea").oninput=e=>{p.comment=e.target.value;changed();};row.querySelector(".del").onclick=()=>removeAnn(p);});
  }
  function setTool(t){tool=t;sel=null;container.querySelector("#annTools").querySelectorAll("button").forEach(b=>b.classList.toggle("on",b.dataset.t===t));cv.classList.toggle("sel",t==="select");redraw();}
  container.querySelector("#annTools").querySelectorAll("button").forEach(b=>b.onclick=()=>setTool(b.dataset.t));
  container.querySelector("#annColors").querySelectorAll(".sw").forEach(b=>b.onclick=()=>{color=b.dataset.c;container.querySelector("#annColors").querySelectorAll(".sw").forEach(s=>s.classList.toggle("on",s===b));if(sel){const a=ann.find(x=>x._id===sel);if(a){a.color=color;redraw();renderSide();changed();}}});
  container.querySelector("#annWidths").querySelectorAll("button").forEach(b=>b.onclick=()=>{width=+b.dataset.w;container.querySelector("#annWidths").querySelectorAll("button").forEach(s=>s.classList.toggle("on",s===b));if(sel){const a=ann.find(x=>x._id===sel);if(a&&(a.t==="arrow"||a.t==="pen")){a.width=width;redraw();changed();}}});
  container.querySelector("#annUndo").onclick=()=>{if(!ann.length)return;ann.pop();renumber();sel=null;redraw();renderSide();changed();};
  container.querySelector("#annClear").onclick=()=>{if(!ann.length)return;ann=[];sel=null;draft=null;redraw();renderSide();changed();};
  stage.addEventListener("keydown",e=>{if((e.key==="Delete"||e.key==="Backspace")&&sel){e.preventDefault();const a=ann.find(x=>x._id===sel);if(a)removeAnn(a);}});
  let dragging=false, dragLast=null, moved=false;
  function toNat(e){const r=cv.getBoundingClientRect();return [Math.max(0,Math.min(natW,(e.clientX-r.left)/scale)),Math.max(0,Math.min(natH,(e.clientY-r.top)/scale))];}
  function translate(a,dx,dy){if(a.t==="arrow"){a.x1+=dx;a.y1+=dy;a.x2+=dx;a.y2+=dy;}else if(a.t==="pen"){a.points.forEach(p=>{p[0]+=dx;p[1]+=dy;});}else{a.x+=dx;a.y+=dy;}}
  function placeTextInput(clientX,clientY,nx,ny){
    const inp=document.createElement("input");inp.className="ann-inline-input";inp.style.left=clientX+"px";inp.style.top=clientY+"px";inp.style.color=color;inp.placeholder="Escribí y Enter";
    document.body.appendChild(inp);inp.focus();
    let done=false;const commit=()=>{if(done)return;done=true;const v=inp.value.trim();if(v){ann.push({t:"text",x:nx,y:ny,text:v,size:18,color,_id:uid()});redraw();changed();}if(inp.parentNode)inp.remove();};
    inp.addEventListener("keydown",ev=>{if(ev.key==="Enter"){ev.preventDefault();commit();}else if(ev.key==="Escape"){done=true;inp.remove();}});
    inp.addEventListener("blur",commit);
  }
  cv.addEventListener("pointerdown",e=>{
    stage.focus();cv.setPointerCapture(e.pointerId);const [x,y]=toNat(e);moved=false;
    if(tool==="select"){const hit=hitTest(ann,x,y);sel=hit?hit._id:null;dragging=!!hit;dragLast=[x,y];redraw();renderSide();return;}
    if(tool==="pin"){const a={t:"pin",x,y,n:nextNum(),color,comment:"",_id:uid()};ann.push(a);sel=a._id;redraw();renderSide();changed();setTimeout(()=>{const r=container.querySelector('.ann-comment[data-id="'+a._id+'"] textarea');if(r)r.focus();},30);return;}
    if(tool==="text"){placeTextInput(e.clientX,e.clientY,x,y);return;}
    if(tool==="arrow"){draft={t:"arrow",x1:x,y1:y,x2:x,y2:y,color,width,_id:uid()};dragging=true;return;}
    if(tool==="highlight"){draft={t:"highlight",x,y,w:0,h:0,color,_id:uid(),_ox:x,_oy:y};dragging=true;return;}
    if(tool==="pen"){draft={t:"pen",points:[[x,y]],color,width,_id:uid()};dragging=true;return;}
  });
  cv.addEventListener("pointermove",e=>{
    if(!dragging)return;const [x,y]=toNat(e);moved=true;
    if(tool==="select"&&sel){const a=ann.find(z=>z._id===sel);if(a){translate(a,x-dragLast[0],y-dragLast[1]);dragLast=[x,y];redraw();}return;}
    if(!draft)return;
    if(draft.t==="arrow"){draft.x2=x;draft.y2=y;}
    else if(draft.t==="highlight"){draft.x=Math.min(x,draft._ox);draft.y=Math.min(y,draft._oy);draft.w=Math.abs(x-draft._ox);draft.h=Math.abs(y-draft._oy);}
    else if(draft.t==="pen"){draft.points.push([x,y]);}
    redraw();
  });
  cv.addEventListener("pointerup",()=>{
    if(tool==="select"){dragging=false;if(moved)changed();return;}
    if(draft){let keep=true;
      if(draft.t==="arrow"&&Math.hypot(draft.x2-draft.x1,draft.y2-draft.y1)<6)keep=false;
      if(draft.t==="highlight"&&(draft.w<6||draft.h<6))keep=false;
      if(draft.t==="pen"&&draft.points.length<2)keep=false;
      if(keep){delete draft._ox;delete draft._oy;ann.push(draft);changed();}
      draft=null;dragging=false;redraw();
    }
  });
  if(window._annResize)window.removeEventListener("resize",window._annResize);
  window._annResize=layout; window.addEventListener("resize",layout);
  requestAnimationFrame(()=>{layout();if(stage.clientWidth<40)setTimeout(layout,90);});
  setTool("pin");renderSide();
}
