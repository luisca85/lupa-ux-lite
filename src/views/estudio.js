import { goHome, openStudy, render, view } from "../app/render.js";
import { ESTADOS, PLATAFORMAS } from "../core/catalogo-base.js";
import { STUDY_TABS, activeStudy, state } from "../core/state.js";
import { LS, esc, uid } from "../core/util.js";
import { store } from "../data/store.js";
import { renderFlujosInto } from "../flujos/flujos.js";
import { renderProyectoInto } from "../reportes/configuracion.js";
import { renderReportesInto } from "../reportes/panel.js";
import { bigIco, pencil } from "../ui/iconos.js";
import { openConfirm, openModal, toast } from "../ui/modales.js";
import { renderHallazgosInto } from "./hallazgos.js";
import { renderHome } from "./home.js";
import { renderResumenInto } from "./resumen.js";

/* ============ Vista: Estudio (shell + submenú) ============ */
export function renderStudyShell(){
  const est=activeStudy();
  if(!est){ state.view="home"; return renderHome(); }
  const tab=STUDY_TABS.find(t=>t.id===state.studyTab&&!t.oculta)||STUDY_TABS[0];
  const navBtn=t=>`<button data-t="${t.id}" class="${tab.id===t.id?'on':''}" title="${t.label}${proximamente(t.id)?" · Próximamente":""}"${tab.id===t.id?' aria-current="page"':''}>${bigIco(t.ico)}<span class="lb">${t.label}</span>${t.id==="hallazgos"?`<span class="cnt">${state.hallazgos.length}</span>`:""}${proximamente(t.id)?`<span class="pronto">Pronto</span>`:""}</button>`;
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
          <div class="pt-group" role="group" aria-label="Salida">${STUDY_TABS.filter(t=>t.grupo==="salida"&&!t.oculta).map(navBtn).join("")}</div>
        </nav>
        <section class="proj-main" id="studyContent"></section>
      </div>
    </div>`;
  document.getElementById("backHome").onclick=goHome;
  document.getElementById("backArrow").onclick=goHome;
  document.getElementById("editStudy").onclick=()=>studyModal(est);
  document.getElementById("psNav").querySelectorAll("button").forEach(b=>b.onclick=()=>goStudyTab(b.dataset.t));
  const c=document.getElementById("studyContent");
  if(proximamente(tab.id)) renderProximamente(c,tab.id);
  else if(tab.id==="resumen") renderResumenInto(c,est);
  else if(tab.id==="hallazgos") renderHallazgosInto(c,est);
  else if(tab.id==="flujos") renderFlujosInto(c,est);
  else if(tab.id==="reportes") renderReportesInto(c,est);
  else if(tab.id==="proyecto") renderProyectoInto(c,est);
  else renderSoon(c,tab.id);
}
export function goStudyTab(t){ if(state.hzPage&&t==="hallazgos") closeHzPage(); state.studyTab=t; if(t==="flujos")state.flowMode="list"; render(); window.scrollTo(0,0); }
/* Secciones deshabilitadas provisionalmente: el código sigue, solo se muestra un aviso.
   Para habilitarlas en desarrollo o en las pruebas: localStorage "lupa:habilitar" = ["flujos", …]. */
const PROXIMAMENTE=["flujos","protopersonas"];
export const proximamente=id=>PROXIMAMENTE.includes(id)&&!(LS.get("lupa:habilitar",[])||[]).includes(id);
const ilustraFlujos=`<svg viewBox="0 0 320 180" fill="none" aria-hidden="true">
  <rect x="8" y="58" width="74" height="54" rx="8" class="il-card"/><rect x="18" y="68" width="54" height="22" rx="4" class="il-soft"/><rect x="18" y="96" width="34" height="6" rx="3" class="il-line"/>
  <rect x="124" y="20" width="74" height="54" rx="8" class="il-card"/><rect x="134" y="30" width="54" height="22" rx="4" class="il-soft"/><rect x="134" y="58" width="40" height="6" rx="3" class="il-line"/>
  <rect x="124" y="108" width="74" height="54" rx="8" class="il-card il-dash"/><rect x="134" y="118" width="54" height="22" rx="4" class="il-soft"/><rect x="134" y="146" width="28" height="6" rx="3" class="il-line"/>
  <rect x="238" y="58" width="74" height="54" rx="8" class="il-card"/><rect x="248" y="68" width="54" height="22" rx="4" class="il-soft"/><rect x="248" y="96" width="46" height="6" rx="3" class="il-line"/>
  <path d="M82 80 C104 80 104 47 124 47" class="il-path"/><path d="M82 92 C104 92 104 135 124 135" class="il-path il-dash"/><path d="M198 47 C218 47 218 80 238 80" class="il-path"/><path d="M198 135 C218 135 218 92 238 92" class="il-path il-dash"/>
  <circle cx="188" cy="30" r="9" class="il-pin"/><text x="188" y="34" class="il-pin-t">1</text>
  <circle cx="188" cy="118" r="9" class="il-pin il-pin2"/><text x="188" y="122" class="il-pin-t">2</text>
</svg>`;
const ilustraProto=`<svg viewBox="0 0 320 180" fill="none" aria-hidden="true">
  <rect x="58" y="14" width="204" height="152" rx="12" class="il-card"/>
  <circle cx="104" cy="62" r="26" class="il-soft"/><circle cx="104" cy="54" r="10" class="il-line"/><path d="M86 80c3-11 11-16 18-16s15 5 18 16" class="il-line-s"/>
  <rect x="142" y="42" width="90" height="10" rx="5" class="il-ink"/><rect x="142" y="60" width="64" height="7" rx="3.5" class="il-line"/><rect x="142" y="74" width="76" height="7" rx="3.5" class="il-line"/>
  <rect x="78" y="104" width="52" height="18" rx="9" class="il-chip"/><rect x="136" y="104" width="44" height="18" rx="9" class="il-chip il-chip2"/><rect x="186" y="104" width="56" height="18" rx="9" class="il-chip il-chip3"/>
  <rect x="78" y="134" width="164" height="7" rx="3.5" class="il-line"/><rect x="78" y="148" width="120" height="7" rx="3.5" class="il-line"/>
  <circle cx="262" cy="22" r="16" class="il-pin"/><path d="M255 22h14M262 15v14" class="il-plus"/>
</svg>`;
function renderProximamente(c,tab){
  const info={
    flujos:{ico:"flow",titulo:"Flujos",ilustra:ilustraFlujos,
      lead:"Próximamente vas a poder diagramar aquí los recorridos de las personas usuarias, paso a paso, y ver en qué punto se rompe la experiencia.",
      items:[["flow","User Flows","Armá cada tarea pantalla a pantalla, con el camino ideal y sus desvíos."],
             ["flag","Hallazgos en cada paso","Ubicá los hallazgos sobre cada interacción para mostrar dónde aparecen los problemas."],
             ["chart","User Journeys","Mapeá la experiencia por etapas, con la curva emocional, los touchpoints y los puntos de dolor."]],
      nota:"Los flujos y journeys que ya cargaste se conservan y siguen apareciendo en el reporte del cliente."},
    protopersonas:{ico:"user",titulo:"Protopersonas",ilustra:ilustraProto,
      lead:"Próximamente vas a poder crear aquí las protopersonas del estudio: hipótesis de quiénes usan el producto, armadas a partir de lo que sabés del cliente.",
      items:[["user","Perfil","Nombre, edad, ocupación, foto y una bio breve para darle cara a cada persona."],
             ["grid","Objetivos, necesidades y dolores","Lo que cada persona busca y lo que hoy le complica, para leer los hallazgos con contexto."],
             ["report","En el reporte","Se suman al reporte del cliente para explicar a quién afecta cada problema."]],
      nota:"Mientras tanto podés cargarlas en Configuración y ya aparecen en el reporte."}
  }[tab];
  c.innerHTML=`<section class="soon-page" aria-labelledby="soonT">
    <div class="soon-ilu">${info.ilustra}</div>
    <span class="soon-badge">Próximamente</span>
    <h2 id="soonT">${info.titulo}</h2>
    <p class="soon-lead">${info.lead}</p>
    <ul class="soon-list">${info.items.map(([i,t,d])=>`<li><span class="soon-ico">${bigIco(i)}</span><span><b>${t}</b><span>${d}</span></span></li>`).join("")}</ul>
    <p class="soon-nota">${info.nota}</p>
  </section>`;
}
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
