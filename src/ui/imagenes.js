import { state } from "../core/state.js";
import { store } from "../data/store.js";
import { compositeDataUrl } from "./anotaciones.js";
import { x } from "./iconos.js";

/* ---- Imágenes: procesamiento, miniaturas y visor ---- */
export function loadBitmap(blob){
  if(window.createImageBitmap) return createImageBitmap(blob).catch(()=>loadViaImg(blob));
  return loadViaImg(blob);
}
function loadViaImg(blob){
  return new Promise((res,rej)=>{const url=URL.createObjectURL(blob);const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=url;});
}
export function scaleImg(src,maxW,quality,maxChars){
  let w=src.width,h=src.height;
  if(w>maxW){h=Math.round(h*maxW/w);w=maxW;}
  const c=document.createElement("canvas");c.width=w;c.height=h;
  c.getContext("2d").drawImage(src,0,0,w,h);
  let q=quality,url=c.toDataURL("image/jpeg",q);
  while(maxChars&&url.length>maxChars&&q>0.4){q-=0.1;url=c.toDataURL("image/jpeg",q);}
  while(maxChars&&url.length>maxChars&&w>420){w=Math.round(w*0.85);h=Math.round(h*0.85);c.width=w;c.height=h;c.getContext("2d").drawImage(src,0,0,w,h);url=c.toDataURL("image/jpeg",q);}
  return {dataUrl:url,w,h};
}
export async function processImage(blob){
  const bmp=await loadBitmap(blob);
  const full=scaleImg(bmp,1280,0.72,240000);
  const thumb=scaleImg(bmp,220,0.6,0);
  if(bmp.close)bmp.close();
  return {full,thumb};
}
export function hzThumbs(h){
  const max=5, shown=h.imgs.slice(0,max), extra=h.imgs.length-max;
  return `<div class="hz-thumbs">${shown.map(im=>`<div class="t"><img src="${im.thumb}" alt="Evidencia"></div>`).join("")}${extra>0?`<div class="more">+${extra}</div>`:""}</div>`;
}
export function openHzLightbox(hid,start){
  const h=state.hallazgos.find(x=>x.id===hid); if(!h||!h.imgs||!h.imgs.length)return;
  const sid=state.activeId;
  const items=h.imgs.map(im=>({id:im.id,load:async()=>{const d=await store.getImg(sid,hid,im.id);return d?await compositeDataUrl(d,0.85):null;}}));
  openLightbox(items,start||0);
}
function openLightbox(items,start){
  let i=start||0;
  const root=document.getElementById("modalRoot2")||(()=>{const d=document.createElement("div");d.id="modalRoot2";document.body.appendChild(d);return d;})();
  const close=()=>{root.innerHTML="";document.removeEventListener("keydown",key);};
  const go=d=>{i=(i+d+items.length)%items.length;draw();};
  const key=e=>{if(e.key==="Escape")close();else if(e.key==="ArrowLeft")go(-1);else if(e.key==="ArrowRight")go(1);};
  function draw(){
    root.innerHTML=`<div class="lb-bg"><button class="lb-close" id="lbClose">${x()}</button>
      <div class="lb-loading" id="lbImg">Cargando...</div>
      <div class="lb-bar">
        <button id="lbPrev" ${items.length<2?'style="visibility:hidden"':''}>&#8249;</button>
        <span class="cnt">${i+1} / ${items.length}</span>
        <button id="lbNext" ${items.length<2?'style="visibility:hidden"':''}>&#8250;</button>
      </div></div>`;
    root.querySelector(".lb-bg").onclick=e=>{if(e.target===root.querySelector(".lb-bg"))close();};
    document.getElementById("lbClose").onclick=close;
    const p=document.getElementById("lbPrev"),n=document.getElementById("lbNext");
    if(p)p.onclick=()=>go(-1); if(n)n.onclick=()=>go(1);
    const cur=i;
    Promise.resolve(items[i].load()).then(url=>{
      if(cur!==i)return; const el=document.getElementById("lbImg"); if(!el)return;
      if(url){const img=document.createElement("img");img.id="lbImg";img.src=url;img.alt="Evidencia";el.replaceWith(img);}
      else el.textContent="No se pudo cargar la imagen.";
    }).catch(()=>{const el=document.getElementById("lbImg");if(el)el.textContent="No se pudo cargar la imagen.";});
  }
  document.addEventListener("keydown",key);
  draw();
}
