import { goHome, openStudy, render, view } from "../app/render.js";
import { ESTADOS, PLATAFORMAS } from "../core/catalogo-base.js";
import { STUDY_TABS, activeStudy, state } from "../core/state.js";
import { esc, uid } from "../core/util.js";
import { store } from "../data/store.js";
import { renderFlujosInto } from "../flujos/flujos.js";
import { renderProyectoInto, renderReportesInto } from "../reportes/panel.js";
import { bigIco, pencil } from "../ui/iconos.js";
import { openConfirm, openModal, toast } from "../ui/modales.js";
import { renderHallazgosInto } from "./hallazgos.js";
import { renderHome } from "./home.js";
import { renderResumenInto } from "./resumen.js";

/* ============ Vista: Estudio (shell + submenú) ============ */
export function renderStudyShell(){
  const est=activeStudy();
  if(!est){ state.view="home"; return renderHome(); }
  const tab=STUDY_TABS.find(t=>t.id===state.studyTab)||STUDY_TABS[0];
  const navBtn=t=>`<button data-t="${t.id}" class="${tab.id===t.id?'on':''}" title="${t.label}"${tab.id===t.id?' aria-current="page"':''}>${bigIco(t.ico)}<span class="lb">${t.label}</span>${t.id==="hallazgos"?`<span class="cnt">${state.hallazgos.length}</span>`:""}</button>`;
  view.innerHTML=`
    <div class="proj">
    <header class="study-head">
      <nav class="sh-crumbs" aria-label="Ruta">
        <button class="icon-btn sh-backbtn" id="backArrow" title="Volver a estudios" aria-label="Volver a estudios"><span class="fig-ico ico-volver" aria-hidden="true"></span></button>
        <button class="sh-back sh-home" id="backHome" title="Volver al inicio (todos los estudios)"><span class="sh-mark" aria-hidden="true"><span class="fig-ico ico-view"></span></span>Estudios</button>
        <span class="sep" aria-hidden="true">/</span>
        <span class="cur">${esc(est.nombre)}</span>
        <span class="sep" aria-hidden="true">/</span>
        <span class="cur sec">${tab.label}</span>
      </nav>
      <div class="sh-row">
        <div class="sh-title">
          <h1>${esc(est.nombre)}</h1>
          <dl class="sh-meta">
            ${est.cliente?`<div class="mi"><dt>Cliente</dt><dd class="who">${esc(est.cliente)}</dd></div>`:""}
            ${est.plataforma?`<div class="mi"><dt>Plataforma</dt><dd>${esc(est.plataforma)}</dd></div>`:""}
            ${est.url?`<div class="mi"><dt>URL</dt><dd><a class="url" href="${esc(est.url)}" target="_blank" rel="noopener">${esc(est.url.replace(/^https?:\/\//,""))}</a></dd></div>`:""}
          </dl>
        </div>
        <div class="sh-side">
          ${est.estado?`<span class="sh-status" data-e="${esc(est.estado)}"><i aria-hidden="true"></i>${esc(est.estado)}</span>`:""}
          <button class="btn sm" id="editStudy">${pencil()} Editar estudio</button>
        </div>
      </div>
    </header>
      <div class="proj-body">
        <nav class="proj-tabs" id="psNav" aria-label="Secciones del proyecto">
          <div class="pt-group" role="group" aria-label="Proyecto">${STUDY_TABS.filter(t=>!t.grupo).map(navBtn).join("")}</div>
          <span class="pt-sep" aria-hidden="true"></span>
          <div class="pt-group" role="group" aria-label="Salida">${STUDY_TABS.filter(t=>t.grupo==="salida").map(navBtn).join("")}</div>
        </nav>
        <section class="proj-main" id="studyContent"></section>
      </div>
    </div>`;
  document.getElementById("backHome").onclick=goHome;
  document.getElementById("backArrow").onclick=goHome;
  document.getElementById("editStudy").onclick=()=>studyModal(est);
  document.getElementById("psNav").querySelectorAll("button").forEach(b=>b.onclick=()=>goStudyTab(b.dataset.t));
  const c=document.getElementById("studyContent");
  if(tab.id==="resumen") renderResumenInto(c,est);
  else if(tab.id==="hallazgos") renderHallazgosInto(c,est);
  else if(tab.id==="flujos") renderFlujosInto(c,est);
  else if(tab.id==="reportes") renderReportesInto(c,est);
  else if(tab.id==="proyecto") renderProyectoInto(c,est);
  else renderSoon(c,tab.id);
}
export function goStudyTab(t){ if(state.hzPage&&t==="hallazgos") closeHzPage(); state.studyTab=t; if(t==="flujos")state.flowMode="list"; render(); window.scrollTo(0,0); }
function renderSoon(c,tab){
  const info={
    flujos:["flow","Flujos","Evaluá recorridos por tarea o escenario, no solo pantallas sueltas. Vas a poder armar escenarios y revisar cada paso del recorrido."],
    protopersonas:["user","Protopersonas","Creá protopersonas a partir de la información del cliente para dar contexto a los hallazgos. Por ahora se cargan en Configuración."],
    metricas:["chart","Métricas","Métricas de usabilidad basadas en eficiencia y eficacia (tasa de éxito, tiempos, errores por tarea)."],
    reportes:["report","Reportes","Generá un reporte visual y textual con los hallazgos, oportunidades y recomendaciones del estudio."]
  }[tab];
  c.innerHTML=`<div class="empty soon-empty">${bigIco(info[0])}<span class="soon-badge">Próximamente</span><h3>${info[1]}</h3><p>${info[2]}</p></div>`;
}
export function studyModal(e){
  const isNew=!e; e=e||{};
  openModal(`${isNew?"Nuevo":"Editar"} estudio`,`
    <div class="field"><label>Nombre del estudio</label>
      <input id="f_nombre" value="${esc(e.nombre||"")}" placeholder="Ej: Onboarding app de ahorro"></div>
    <div class="row2">
      <div class="field"><label>Cliente <span class="opt">opcional</span></label>
        <input id="f_cliente" value="${esc(e.cliente||"")}" placeholder="Nombre del cliente"></div>
      <div class="field"><label>Plataforma</label>
        <select id="f_plat">${PLATAFORMAS.map(p=>`<option ${e.plataforma===p?'selected':''}>${p}</option>`).join("")}</select></div>
    </div>
    <div class="field"><label>URL o referencia <span class="opt">opcional</span></label>
      <input id="f_url" value="${esc(e.url||"")}" placeholder="https://..."></div>
    <div class="row2">
      <div class="field"><label>Estado</label>
        <select id="f_estado">${ESTADOS.map(s=>`<option ${e.estado===s?'selected':''}>${s}</option>`).join("")}</select></div>
      <div class="field"><label>Fecha</label>
        <input type="date" id="f_fecha" value="${esc(e.fecha||new Date().toISOString().slice(0,10))}"></div>
    </div>
    <div class="field"><label>Descripción / alcance <span class="opt">opcional</span></label>
      <textarea id="f_desc" placeholder="Objetivo del estudio, alcance, contexto del cliente...">${esc(e.descripcion||"")}</textarea></div>
  `,async()=>{
    const nombre=document.getElementById("f_nombre").value.trim();
    if(!nombre){ document.getElementById("f_nombre").focus(); return false; }
    const rec={ id:e.id||uid(), nombre,
      cliente:document.getElementById("f_cliente").value.trim(),
      plataforma:document.getElementById("f_plat").value,
      url:document.getElementById("f_url").value.trim(),
      estado:document.getElementById("f_estado").value,
      fecha:document.getElementById("f_fecha").value,
      descripcion:document.getElementById("f_desc").value.trim(),
      createdAt:e.createdAt||Date.now() };
    await store.saveEstudio(rec);
    state.estudios=await store.listEstudios();
    toast(isNew?"Estudio creado":"Estudio actualizado");
    if(isNew){ await openStudy(rec.id); } else { render(); }
    return true;
  });
  setTimeout(()=>document.getElementById("f_nombre").focus(),40);
}
export function confirmDelStudy(id){
  const e=state.estudios.find(s=>s.id===id);
  openConfirm(`Eliminar estudio`,`Se va a eliminar "<b>${esc(e.nombre)}</b>" y todos sus hallazgos. Esta acción no se puede deshacer.`,async()=>{
    await store.delEstudio(id);
    state.estudios=await store.listEstudios();
    if(state.activeId===id){ state.activeId=null; state.view="home"; }
    toast("Estudio eliminado"); render();
  });
}
