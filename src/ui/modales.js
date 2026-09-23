import { esc } from "../core/util.js";
import { x } from "./iconos.js";

/* ============ Modales / util ============ */
export function openModal(title,bodyHtml,onSave,extraClass="",onClose=null){
  const root=document.getElementById("modalRoot");
  root.innerHTML=`<div class="modal-bg"><div class="modal ${extraClass}">
    <div class="modal-h"><h3>${esc(title)}</h3><button class="icon-btn" id="mClose" style="width:32px;height:32px">${x()}</button></div>
    <div class="modal-b">${bodyHtml}</div>
    <div class="modal-f"><button class="btn ghost" id="mCancel">Cancelar</button><button class="btn primary" id="mSave">Guardar</button></div>
  </div></div>`;
  const close=()=>{root.innerHTML="";document.removeEventListener("keydown",onKey);if(onClose)onClose();};
  const onKey=e=>{if(e.key==="Escape")close();};
  document.addEventListener("keydown",onKey);
  root.querySelector(".modal-bg").onclick=e=>{if(e.target===root.querySelector(".modal-bg"))close();};
  document.getElementById("mClose").onclick=close;
  document.getElementById("mCancel").onclick=close;
  document.getElementById("mSave").onclick=async()=>{
    const btn=document.getElementById("mSave"); btn.disabled=true;
    // Si onSave falla, el modal queda abierto con lo cargado para poder reintentar.
    let ok;
    try{ ok=await onSave(); }
    catch(e){ console.error("openModal",e); toast((e&&e.message)||"No se pudo guardar. Probá de nuevo."); ok=false; }
    if(ok!==false)close(); else btn.disabled=false;
  };
}
export function openConfirm(title,msg,onYes){
  const root=document.getElementById("modalRoot");
  root.innerHTML=`<div class="modal-bg"><div class="modal" style="max-width:420px">
    <div class="modal-h"><h3>${esc(title)}</h3></div>
    <div class="modal-b"><p style="margin:0;color:var(--muted)">${msg}</p></div>
    <div class="modal-f"><button class="btn ghost" id="cNo">Cancelar</button><button class="btn primary danger" id="cYes" style="background:var(--prob);border-color:var(--prob)">Eliminar</button></div>
  </div></div>`;
  const close=()=>root.innerHTML="";
  root.querySelector(".modal-bg").onclick=e=>{if(e.target===root.querySelector(".modal-bg"))close();};
  document.getElementById("cNo").onclick=close;
  document.getElementById("cYes").onclick=async()=>{await onYes();close();};
}
let toastT;
export function toast(msg){
  const t=document.getElementById("toast"); t.textContent=msg; t.classList.add("show");
  clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove("show"),1900);
}
export function emptyInline(msg){return `<div style="grid-column:1/-1;color:var(--faint);padding:26px;text-align:center;font-size:13.5px">${esc(msg)}</div>`;}
