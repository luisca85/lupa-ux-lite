import { state } from "../core/state.js";
import { LS } from "../core/util.js";
import { prepararEstudio } from "../data/pantallas.js";
import { store } from "../data/store.js";
import { jrCleanupPop } from "../journey/journey.js";
import { JSIDE, closeJrSide } from "../journey/relaciones.js";
import { renderCatalogo } from "../views/catalogo.js";
import { renderStudyShell } from "../views/estudio.js";
import { closeHzPage } from "../views/hallazgos.js";
import { renderHome } from "../views/home.js";
import { renderLegal } from "../views/legal.js";
import { renderPie } from "../ui/pie.js";
import { toast } from "../ui/modales.js";

/* ============ Render raíz ============ */
export const view=document.getElementById("view");
export function goHome(){ state.view="home"; render(); }
function goCatalogo(){ state.view="catalogo"; render(); }
export async function openStudy(id){
  state.activeId=id; LS.set("lupa:active",id);
  state.view="study"; state.studyTab="resumen"; closeHzPage();
  Object.assign(state,{hzGroup:null,hzQuick:null,hzForm:null,hzFormNuevo:false,hzSevF:"todas",hzPanel:"lista",hzSel:null});
  state.hzTipo="todos"; state.hzSev="todos"; state.hzHeur="todos"; state.hzQuery="";
  const est=state.estudios.find(e=>e.id===id);
  if(est){
    const r=await prepararEstudio(est);
    state.hallazgos=r.hallazgos; state.pantallas=r.pantallas;
    if(r.migracion&&r.migracion.error) toast("No se pudo actualizar el estudio al modelo de pantallas: "+r.migracion.error);
    else if(r.migracion&&r.migracion.pantallas) toast(`Estudio actualizado: ${r.migracion.pantallas} pantallas creadas a partir de la evidencia`);
  } else { state.hallazgos=await store.listHallazgos(id); state.pantallas=[]; }
  render();
}
function renderTopbar(){
  const nav=document.getElementById("topNav");
  const items=[["home","Estudios","ico-estudios"],["catalogo","Catálogo","ico-catalogo"]];
  const section = state.view==="study" ? "home" : state.view;
  nav.innerHTML=items.map(i=>`<button data-v="${i[0]}" class="${section===i[0]?'on':''}"><span class="fig-ico ${i[2]}" aria-hidden="true"></span>${i[1]}</button>`).join("");
  nav.querySelectorAll("button").forEach(b=>b.onclick=()=>{ b.dataset.v==="home"?goHome():goCatalogo(); });
  // Buscador de la barra: filtra los estudios de la home (y lleva a ella si hace falta).
  const q=document.getElementById("topSearch");
  if(q){
    if(q.value!==state.homeQuery) q.value=state.homeQuery;
    q.oninput=()=>{ state.homeQuery=q.value; if(state.view!=="home"){ state.view="home"; } render(); q.focus(); };
  }
}
function flowCleanup(){
  jrCleanupPop();
  if(typeof JSIDE!=="undefined"&&JSIDE&&(state.studyTab!=="flujos"||state.flowMode!=="journey"))closeJrSide();
  if(window._flowMove){window.removeEventListener("pointermove",window._flowMove);window._flowMove=null;}
  if(window._flowUp){window.removeEventListener("pointerup",window._flowUp);window._flowUp=null;}
  if(window._ndPaste){document.removeEventListener("paste",window._ndPaste);window._ndPaste=null;}
  if(window._ndMove){window.removeEventListener("pointermove",window._ndMove);window._ndMove=null;}
  if(window._ndUp){window.removeEventListener("pointerup",window._ndUp);window._ndUp=null;}
  if(window._ndKey){window.removeEventListener("keydown",window._ndKey);window._ndKey=null;}
}
export function render(){
  flowCleanup();
  // La página de alta de hallazgo vive solo dentro de la sección Hallazgos.
  if(state.hzPage&&!(state.view==="study"&&state.studyTab==="hallazgos")) closeHzPage();
  renderTopbar();
  renderPie();
  document.body.classList.toggle("in-study",state.view==="study");
  document.body.classList.toggle("in-home",state.view==="home");
  document.body.classList.toggle("in-legal",state.view==="legal");
  const top=document.querySelector("header.top"); if(top) document.documentElement.style.setProperty("--top-h",top.offsetHeight+"px");
  if(state.view==="catalogo") return renderCatalogo();
  if(state.view==="study") return renderStudyShell();
  if(state.view==="legal") return renderLegal();
  return renderHome();
}
