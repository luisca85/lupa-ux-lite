import { state } from "../core/state.js";
import { LS } from "../core/util.js";
import { USE_DB } from "../data/backend.js";
import { store } from "../data/store.js";
import { jrCleanupPop } from "../journey/journey.js";
import { JSIDE, closeJrSide } from "../journey/relaciones.js";
import { renderCatalogo } from "../views/catalogo.js";
import { renderStudyShell } from "../views/estudio.js";
import { renderHome } from "../views/home.js";

/* ============ Render raíz ============ */
export const view=document.getElementById("view");
export function goHome(){ state.view="home"; render(); }
function goCatalogo(){ state.view="catalogo"; render(); }
export async function openStudy(id){
  state.activeId=id; LS.set("lupa:active",id);
  state.view="study"; state.studyTab="hallazgos";
  state.hzTipo="todos"; state.hzSev="todos"; state.hzHeur="todos"; state.hzQuery="";
  state.hallazgos=await store.listHallazgos(id);
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
  renderTopbar();
  document.getElementById("footNote").textContent = USE_DB
    ? "Lupa UX · cada estudio agrupa sus hallazgos, flujos, protopersonas, métricas y reportes. Los datos se guardan de forma persistente."
    : "Lupa UX · vista de trabajo local: los datos se guardan en este navegador. Publicada, guarda de forma persistente.";
  if(state.view==="catalogo") return renderCatalogo();
  if(state.view==="study") return renderStudyShell();
  return renderHome();
}
