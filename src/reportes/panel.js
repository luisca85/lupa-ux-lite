import { render } from "../app/render.js";
import { state } from "../core/state.js";
import { esc, uid } from "../core/util.js";
import { flowStore } from "../flujos/flujos.js";
import { openClientReport } from "./cliente.js";
import { brandStore, ensureReporte, marcaActual, saveReporte } from "./comun.js";
import { PROP_DESC, normalizePropuesta, propMoney, propPriceLine } from "./propuestas.js";
import { BLOQUES, estaOculto, setOculto } from "./seleccion.js";
import { actividadDe, despublicarReporte, firmaReporte, linkPublico, publicarReporte } from "./publicar.js";
import { buildShareHtml, collectShareData } from "../share/compartir.js";
import { pencil, plus, trash } from "../ui/iconos.js";
import { loadBitmap, scaleImg } from "../ui/imagenes.js";
import { openModal, toast } from "../ui/modales.js";

/* ============ Reportes: panel de configuración (izquierda) + vista previa en vivo (derecha) ============
   La vista previa es la MISMA página autónoma que recibe el cliente (SR_boot), en un iframe:
   aislada de la app y actualizada cada vez que cambia la configuración. */
export function renderReportesInto(c,est){
  if(state._flujosFor!==est.id){
    c.innerHTML=`<div class="ev-loading" style="min-height:200px">Cargando datos del estudio...</div>`;
    (async()=>{ state.flujos=await flowStore.list(est.id); state._flujosFor=est.id; render(); })();
    return;
  }
  const r=ensureReporte(est);
  c.classList.add("hz-ws-host");
  c.innerHTML=`<div class="rp-ws">
    <aside class="rp-panel" aria-label="Configuración del reporte">
      <div class="rp-head"><h2>Reporte</h2><p>Elegí lo que ve tu cliente y compartilo. La vista previa se actualiza sola.</p></div>
      <div class="rp-share" id="rptShareCard"></div>
      <section class="rp-sec rp-sel" aria-labelledby="rpSelT"><div class="rp-sec-h"><b id="rpSelT">Qué ve el cliente</b><small>Secciones e ítems visibles</small></div>
        <div class="rp-body"><p class="rhint">Prendé o apagá secciones y elegí ítem por ítem. Lo que ocultes no aparece en la vista previa ni en el link. Lo nuevo aparece visible.</p><div id="rptSel"></div>
        <p class="rhint" style="margin-top:10px">El contenido del proyecto (resumen, diagnóstico, protopersonas, propuestas), la muestra y la marca se cargan en <b>Configuración</b>.</p></div></section>
    </aside>
    <section class="rp-preview" aria-label="Vista previa del reporte">
      <div class="rp-prev-bar"><span>Vista previa · así lo ve tu cliente</span><span class="rp-estado" id="rpEstado">Actualizando…</span><span class="grow"></span>
        <button class="btn-q" id="rptFull" title="Ver la vista previa a pantalla completa">Pantalla completa</button></div>
      <div class="rp-frame-wrap"><iframe id="rpFrame" title="Vista previa del reporte del cliente"></iframe></div>
    </section>
  </div>`;
  c.querySelector("#rptFull").onclick=()=>openClientReport(est.id);
  renderSeleccion(c.querySelector("#rptSel"),est,r);
  const card=c.querySelector("#rptShareCard"), ctx={firma:null};
  renderCompartir(card,est,r,ctx);
  // Vista previa en vivo: se reconstruye con un pequeño retraso después de cada cambio. De paso
  // calcula la huella de lo que ve el cliente para saber si la publicación quedó desactualizada.
  let t=null, gen=0;
  const refrescar=async()=>{
    const fr=document.getElementById("rpFrame"); if(!fr) return;
    const yo=++gen, est0=document.getElementById("rpEstado"); if(est0){ est0.textContent="Actualizando…"; est0.classList.remove("ok"); }
    let estado=null, scroll=0;
    try{ const w=fr.contentWindow; if(w&&w.__SRV){ const v=w.__SRV; estado={section:v.section,hzOpen:v.hzOpen,hzFiltro:v.hzFiltro,sbCol:v.sbCol,reserva:v.reserva,liVisto:v.liVisto}; scroll=(w.document.scrollingElement||w.document.documentElement).scrollTop; } }catch(_){}
    try{
      const D=await collectShareData(est); if(yo!==gen) return;
      firmaReporte(D).then(f=>{ if(yo===gen){ ctx.firma=f; pintarEstado(card,r,ctx); } });
      fr.onload=()=>{ try{ (fr.contentDocument.scrollingElement||fr.contentDocument.documentElement).scrollTop=scroll; }catch(_){} const e=document.getElementById("rpEstado"); if(e){ e.textContent="Al día"; e.classList.add("ok"); } };
      fr.srcdoc=buildShareHtml({...D,preview:true,estado});
    }catch(err){ console.error("vista previa",err); const e=document.getElementById("rpEstado"); if(e) e.textContent="No se pudo actualizar la vista previa"; }
  };
  window._rptSchedule=()=>{ clearTimeout(t); t=setTimeout(refrescar,350); };
  // Se muestra siempre como en escritorio: con poco ancho, el reporte se dibuja a 1024 px y se escala.
  const wrap=c.querySelector(".rp-frame-wrap"), frEl=c.querySelector("#rpFrame"), ANCHO=1024;
  const ajustar=()=>{ const w=wrap.clientWidth, h=wrap.clientHeight, k=w<ANCHO?w/ANCHO:1;
    frEl.style.width=(w/k)+"px"; frEl.style.height=(h/k)+"px"; frEl.style.transform=k<1?`scale(${k})`:""; };
  new ResizeObserver(ajustar).observe(wrap); ajustar();
  refrescar();
}
/* Compartir: tarjeta fija con el botón, la etiqueta de estado y la ayuda. Compartir publica o
   actualiza solo si hace falta (mismo link y PIN) y abre el modal con el link y el PIN. */
const fechaCorta=ts=>new Date(ts).toLocaleString("es-AR",{dateStyle:"medium",timeStyle:"short"});
function estadoPub(r,ctx){
  const pub=r.publico; if(!pub) return "no";
  if(!pub.firma||!ctx.firma) return pub.firma?"ok":"desconocido";
  return pub.firma===ctx.firma?"ok":"cambios";
}
function pintarEstado(card,r,ctx){
  const tag=card.querySelector("#rpTag"); if(!tag) return;
  const e=estadoPub(r,ctx), pub=r.publico;
  const [cls,txt]={no:["no","Sin publicar"],ok:["ok","Publicado"],desconocido:["ok","Publicado"],cambios:["warn","Cambios sin publicar"]}[e];
  tag.className="rp-tag "+cls; tag.textContent=txt;
  const sub=card.querySelector("#rpTagSub");
  if(sub) sub.textContent=e==="no"?"Compartir genera un link con PIN para tu cliente."
    :e==="cambios"?"Tu cliente todavía ve la foto del "+fechaCorta(pub.publicadoAt)+" (al compartir se actualiza sola)"
    :"Foto del "+fechaCorta(pub.publicadoAt);
}
function renderCompartir(card,est,r,ctx){
  card.innerHTML=`<div class="rp-share-row">
      <button type="button" class="rp-share-btn" id="rpShare"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>Compartir</button>
      <span class="rp-tag" id="rpTag" role="status"></span><span class="grow"></span>
      <button type="button" class="rp-help-btn" id="rpHelp" aria-label="Cómo funciona el link y el PIN" aria-expanded="false" aria-controls="rpHelpPop">?</button>
    </div>
    <p class="rp-share-sub" id="rpTagSub"></p>
    <div class="rp-help-pop" id="rpHelpPop" role="dialog" aria-label="Ayuda del link público" hidden></div>`;
  pintarEstado(card,r,ctx);
  const btn=card.querySelector("#rpShare");
  btn.onclick=async()=>{
    const e=estadoPub(r,ctx);
    if(e!=="ok"){
      btn.disabled=true; const tag=card.querySelector("#rpTag"); tag.className="rp-tag"; tag.textContent=r.publico?"Actualizando…":"Publicando…";
      try{ await publicarReporte(est); ctx.firma=r.publico.firma; }
      catch(err){ console.error("publicar",err); toast("No se pudo publicar: "+((err&&err.message)||err)); btn.disabled=false; pintarEstado(card,r,ctx); return; }
      btn.disabled=false; pintarEstado(card,r,ctx);
    }
    abrirModalCompartir(est,r,()=>{ renderCompartir(card,est,r,ctx); });
  };
  const help=card.querySelector("#rpHelp"), pop=card.querySelector("#rpHelpPop");
  const cerrar=()=>{ pop.hidden=true; help.setAttribute("aria-expanded","false"); document.removeEventListener("mousedown",fuera); document.removeEventListener("keydown",esc_); };
  const fuera=e=>{ if(!pop.contains(e.target)&&e.target!==help) cerrar(); };
  const esc_=e=>{ if(e.key==="Escape"){ cerrar(); help.focus(); } };
  help.onclick=()=>{ if(!pop.hidden) return cerrar();
    pop.hidden=false; help.setAttribute("aria-expanded","true"); pintarAyuda(pop,est,r);
    document.addEventListener("mousedown",fuera); document.addEventListener("keydown",esc_); };
}
function pintarAyuda(pop,est,r){
  pop.innerHTML=`<h4>Cómo funciona el link y el PIN</h4><ol>
      <li><b>Compartir</b> guarda una foto del reporte tal como se ve en la vista previa y te da un link y un PIN de 6 dígitos. Si cambiaste algo, la foto se actualiza sola en el mismo link.</li>
      <li><b>Mandá el link y el PIN por canales distintos</b>, por ejemplo el link por correo y el PIN por WhatsApp. Así nadie entra con solo uno de los dos.</li>
      <li><b>Tu cliente abre el link</b>, escribe el PIN, su nombre y acepta las condiciones. Lo ve en modo lectura, sin crear cuenta.</li>
      <li><b>Si reserva una propuesta</b> en "Trabajemos juntos", te llega un correo y queda en la lista de reservas.</li>
      <li><b>Seguridad:</b> con 5 PIN incorrectos el acceso se bloquea 15 minutos. "Generar PIN nuevo" invalida el anterior y "Despublicar" desactiva el link.</li>
    </ol>
    <div class="rp-act"><span class="rlab">Reservas</span><div id="hpRes" class="hint">${r.publico?"Cargando...":"Todavía no publicaste el reporte."}</div></div>
    <div class="rp-act"><span class="rlab">Consentimientos</span><div id="hpCons" class="hint">${r.publico?"Cargando...":"—"}</div></div>`;
  if(!r.publico) return;
  actividadDe(est).then(({consentimientos,reservas})=>{
    const res=pop.querySelector("#hpRes"), cons=pop.querySelector("#hpCons"); if(!res) return;
    res.innerHTML=reservas.length?`<ul class="pub-cons-list">${reservas.slice().reverse().map(x=>`<li><b>${esc(x.nombre)}</b> reservó ${esc(x.propuesta&&x.propuesta.titulo||"")} · ${esc(fechaCorta(x.fecha))}</li>`).join("")}</ul>`:"Todavía no hay reservas.";
    cons.innerHTML=consentimientos.length?`<ul class="pub-cons-list">${consentimientos.slice().reverse().map(x=>`<li><b>${esc(x.nombre)}</b> · ${esc(fechaCorta(x.fecha))}</li>`).join("")}</ul>`:"Todavía nadie abrió el link.";
  }).catch(()=>{ const res=pop.querySelector("#hpRes"); if(res) res.textContent="No se pudo cargar la actividad."; });
}
function abrirModalCompartir(est,r,alCerrar){
  const root=document.getElementById("modalRoot"), pub=r.publico; if(!pub) return;
  root.innerHTML=`<div class="modal-bg"><div class="modal sh-modal" role="dialog" aria-modal="true" aria-labelledby="shT">
    <div class="modal-h"><h3 id="shT">Compartir reporte</h3><button class="icon-btn" id="shX" aria-label="Cerrar" style="width:32px;height:32px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>
    <div class="modal-b">
      <div class="pub-ok"><span class="pub-dot" aria-hidden="true"></span>Publicado y al día · foto del ${esc(fechaCorta(pub.publicadoAt))}</div>
      <div class="pub-row"><label class="rlab" for="shLink">Link</label><div class="pub-val"><code id="shLink">${esc(linkPublico(pub))}</code><button type="button" class="btn-q" data-copy="shLink">Copiar</button></div></div>
      <div class="pub-row"><label class="rlab" for="shPin">PIN</label><div class="pub-val"><code id="shPin" class="pub-pin">${esc(pub.pin)}</code><button type="button" class="btn-q" data-copy="shPin">Copiar</button></div></div>
      <p class="rhint">Mandá el link y el PIN por canales distintos.</p>
      <div class="pub-confirm" id="shConfirm" hidden></div>
      <span class="hint" id="shMsg"></span>
    </div>
    <div class="modal-f sh-f"><button type="button" class="btn-q" id="shPinNew">Generar PIN nuevo</button><button type="button" class="btn-q pub-danger" id="shOff">Despublicar</button><span class="grow"></span><button type="button" class="btn-q sel" id="shOk">Listo</button></div>
  </div></div>`;
  const onKey=e=>{ if(e.key==="Escape") close(); };
  const close=()=>{ root.innerHTML=""; document.removeEventListener("keydown",onKey); alCerrar&&alCerrar(); };
  document.addEventListener("keydown",onKey);
  const bg=root.querySelector(".modal-bg"); bg.onclick=e=>{ if(e.target===bg) close(); };
  root.querySelector("#shX").onclick=close; root.querySelector("#shOk").onclick=close;
  root.querySelectorAll("[data-copy]").forEach(b=>b.onclick=async()=>{ const t=root.querySelector("#"+b.dataset.copy).textContent; try{ await navigator.clipboard.writeText(t); toast("Copiado"); }catch(_){ toast("No se pudo copiar"); } });
  const msg=root.querySelector("#shMsg");
  const confirmar=(texto,si,fn)=>{ const cf=root.querySelector("#shConfirm"); cf.hidden=false;
    cf.innerHTML=`<p>${texto}</p><div class="pub-acts"><button type="button" class="btn-q pub-danger" id="cfSi">${si}</button><button type="button" class="btn-q" id="cfNo">Cancelar</button></div>`;
    cf.querySelector("#cfNo").onclick=()=>{ cf.hidden=true; cf.innerHTML=""; };
    cf.querySelector("#cfSi").onclick=async e=>{ e.currentTarget.disabled=true; msg.textContent="Un momento…";
      try{ await fn(); }catch(err){ console.error("compartir",err); msg.textContent="No se pudo: "+((err&&err.message)||err); e.currentTarget.disabled=false; } };
    cf.querySelector("#cfSi").focus(); };
  root.querySelector("#shPinNew").onclick=()=>confirmar("El PIN actual deja de funcionar. Vas a tener que compartir el nuevo.","Generar PIN nuevo",async()=>{ await publicarReporte(est,{nuevoPIN:true}); toast("PIN nuevo generado"); abrirModalCompartir(est,r,alCerrar); });
  root.querySelector("#shOff").onclick=()=>confirmar("El link deja de funcionar para todos. Podés volver a compartir después (con un link nuevo).","Despublicar",async()=>{ await despublicarReporte(est); toast("Reporte despublicado"); close(); });
  root.querySelector("#shOk").focus();
}
/* Qué ve el cliente: secciones (r.online) e ítems ocultos (r.ocultos). */
function renderSeleccion(box,est,r){
  const flows=state.flujos.filter(f=>f.tipo!=="User Journey"), jrs=state.flujos.filter(f=>f.tipo==="User Journey");
  const secs=[
    {on:null,tipo:"bloques",label:"Inicio (información del proyecto)",items:BLOQUES.map(([k,l])=>({id:k,t:l}))},
    {on:"hallazgos",tipo:"hallazgos",label:"Hallazgos",items:state.hallazgos.map(h=>({id:h.id,t:h.titulo||"(sin título)",sub:(h.severidad!=null&&h.severidad!==""?"Sev "+h.severidad:"")}))},
    {on:"flujos",tipo:"flujos",label:"Flujos",items:flows.map(f=>({id:f.id,t:f.nombre}))},
    {on:"journeys",tipo:"journeys",label:"User Journeys",items:jrs.map(f=>({id:f.id,t:f.nombre}))},
    {on:"protopersonas",tipo:"protopersonas",label:"Protopersonas",items:r.protopersonas.map(p=>({id:p.id,t:p.nombre||"(sin nombre)"}))},
    {on:"diagnostico",tipo:null,label:"Diagnóstico estratégico",items:null},
    {on:"propuestas",tipo:"propuestas",label:"Propuestas de trabajo",items:r.propuestas.map(p=>({id:p.id,t:p.titulo||"(sin título)"}))},
    {on:"contacto",tipo:null,label:"Contacto / servicios",items:null}
  ];
  const open=box._open||(box._open=new Set());
  box.innerHTML=secs.map((sec,i)=>{
    const secOn=sec.on?r.online[sec.on]!==false:true;
    const items=sec.items||[], vis=items.filter(it=>!estaOculto(r,sec.tipo,it.id)).length;
    const count=sec.items?(items.length?`${vis} de ${items.length}`:"vacío"):"";
    return `<div class="sel-sec ${secOn?"":"off"}" data-i="${i}">
      <div class="sel-row">
        ${sec.on?`<label class="chk"><input type="checkbox" data-sec="${sec.on}" ${secOn?"checked":""}> ${esc(sec.label)}</label>`:`<span class="sel-fixed">${esc(sec.label)}</span>`}
        <span class="sel-count">${count}</span>
        ${items.length?`<button type="button" class="btn ghost sm sel-tog" data-tog="${i}" aria-expanded="${open.has(i)}">${open.has(i)?"Ocultar":"Elegir"}</button>`:""}
      </div>
      ${items.length&&open.has(i)?`<div class="sel-items">
        <div class="sel-all"><button type="button" class="btn ghost sm" data-all="${i}">Todos</button><button type="button" class="btn ghost sm" data-none="${i}">Ninguno</button></div>
        ${items.map(it=>`<label class="chk sel-item"><input type="checkbox" data-t="${sec.tipo}" data-id="${esc(it.id)}" ${estaOculto(r,sec.tipo,it.id)?"":"checked"} ${secOn?"":"disabled"}> <span>${esc(it.t)}${it.sub?` <small>${esc(it.sub)}</small>`:""}</span></label>`).join("")}
      </div>`:""}
    </div>`;
  }).join("");
  const redo=()=>{ saveReporte(est); renderSeleccion(box,est,r); if(window._rptSchedule) window._rptSchedule(); };
  box.querySelectorAll("[data-sec]").forEach(cb=>cb.onchange=()=>{ r.online[cb.dataset.sec]=cb.checked; redo(); });
  box.querySelectorAll("[data-tog]").forEach(b=>b.onclick=()=>{ const i=+b.dataset.tog; open.has(i)?open.delete(i):open.add(i); renderSeleccion(box,est,r); });
  box.querySelectorAll("input[data-id]").forEach(cb=>cb.onchange=()=>{ setOculto(r,cb.dataset.t,cb.dataset.id,!cb.checked); redo(); });
  const all=(i,oculto)=>{ const sec=secs[i]; sec.items.forEach(it=>setOculto(r,sec.tipo,it.id,oculto)); redo(); };
  box.querySelectorAll("[data-all]").forEach(b=>b.onclick=()=>all(+b.dataset.all,false));
  box.querySelectorAll("[data-none]").forEach(b=>b.onclick=()=>all(+b.dataset.none,true));
}
/* Información general del proyecto (vive en estudio.reporte; se edita en Configuración, antes pestaña Proyecto). */
export function renderProyectoInto(c,est){
  const r=ensureReporte(est);
  c.innerHTML=`<div class="rpt-wrap2">
    <div class="rpt-cols2">
      <div class="rpt-group"><h4>Resumen ejecutivo</h4>
        <label class="rlab">Título del informe</label><textarea data-f="subtitulo" rows="2" placeholder="Subtítulo del informe">${esc(r.subtitulo)}</textarea>
        <label class="rlab">Introducción</label><textarea data-f="resumen" rows="3" placeholder="Panorama del informe...">${esc(r.resumen)}</textarea>
        <label class="rlab">Objetivos <span>una línea por ítem</span></label><textarea data-f="objetivos" rows="3">${esc(r.objetivos)}</textarea>
        <label class="rlab">Alcance <span>una línea por ítem</span></label><textarea data-f="alcance" rows="3">${esc(r.alcance)}</textarea>
        <label class="rlab">Métricas y metas <span>una línea por ítem</span></label><textarea data-f="metricas" rows="2">${esc(r.metricas)}</textarea></div>
      <div class="rpt-group"><h4>Diagnóstico estratégico</h4>
        <label class="rlab">Introducción</label><textarea data-f="diagIntro" rows="3">${esc(r.diagIntro)}</textarea>
        <label class="rlab">Hallazgos clave <button class="btn ghost sm" id="rptAddHc">${plus()}</button></label><div id="rptHcList" class="rpt-list"></div>
        <label class="rlab">Recomendaciones prioritarias <button class="btn ghost sm" id="rptAddRec">${plus()}</button></label><div id="rptRecList" class="rpt-list"></div></div>
      <div class="rpt-group"><h4>Protopersonas <button class="btn ghost sm" id="rptAddPp">${plus()}</button></h4>
        <div id="rptPpList" class="rpt-list"></div></div>
      <div class="rpt-group"><h4>Propuestas de trabajo <button class="btn ghost sm" id="rptAddProp">${plus()}</button></h4>
        <p class="rhint">Se muestran al cliente. Reordenalas arrastrando o con las flechas.</p>
        <div id="rptPropList" class="rpt-list"></div></div>
      <div class="rpt-group rpt-marca"><h4>Marca</h4><p class="rhint">Logo, datos de contacto y textos del reporte. Valen para todos los estudios.</p><div id="rptMarca"></div></div>
      <div class="rpt-group"><h4>Muestra inicial</h4>
        <label class="chk"><input type="checkbox" id="rptMuestraOn" ${r.muestra.on?"checked":""}> Mostrar aviso de "muestra inicial"</label>
        <textarea id="rptMuestraTxt" rows="3" style="margin-top:8px">${esc(r.muestra.texto||"")}</textarea></div>
    </div>
  </div>`;
  c.querySelectorAll("textarea[data-f]").forEach(ta=>ta.oninput=()=>{ r[ta.dataset.f]=ta.value; saveReporte(est); });
  c.querySelector("#rptAddPp").onclick=()=>protopersonaModal(est,null);
  c.querySelector("#rptAddHc").onclick=()=>diagBlockModal(est,"hallazgosClave","Hallazgo clave",null);
  c.querySelector("#rptAddRec").onclick=()=>diagBlockModal(est,"recomendaciones","Recomendación prioritaria",null);
  c.querySelector("#rptAddProp").onclick=()=>propuestaModal(est,null);
  c.querySelector("#rptMuestraOn").onchange=e=>{ r.muestra.on=e.target.checked; saveReporte(est); };
  c.querySelector("#rptMuestraTxt").oninput=e=>{ r.muestra.texto=e.target.value; saveReporte(est); };
  window._rptSchedule=null;
  renderMarca(c.querySelector("#rptMarca"),est);
  renderPpList(est,c); renderDiagList(est,c,"hallazgosClave","#rptHcList"); renderDiagList(est,c,"recomendaciones","#rptRecList"); renderPropList(est,c);
}
function renderPpList(est,c){
  const r=est.reporte, box=c.querySelector("#rptPpList");
  box.innerHTML=r.protopersonas.length?r.protopersonas.map((p,i)=>`<div class="rpt-item" data-i="${i}"><span>${esc(p.nombre||"Protopersona")}</span><span class="ri-acts"><button class="icon-btn sm e" style="width:26px;height:26px">${pencil()}</button><button class="icon-btn sm d" style="width:26px;height:26px">${trash()}</button></span></div>`).join(""):`<span class="rhint">Sin protopersonas.</span>`;
  box.querySelectorAll(".rpt-item").forEach(it=>{ it.querySelector(".e").onclick=()=>protopersonaModal(est,+it.dataset.i); it.querySelector(".d").onclick=()=>{r.protopersonas.splice(+it.dataset.i,1);saveReporte(est);renderPpList(est,c);if(window._rptSchedule)window._rptSchedule();}; });
}
function renderDiagList(est,c,key,sel){
  const r=est.reporte, box=c.querySelector(sel);
  box.innerHTML=r[key].length?r[key].map((b,i)=>`<div class="rpt-item" data-i="${i}"><span>${esc(b.titulo||"(sin título)")}</span><span class="ri-acts"><button class="icon-btn sm e" style="width:26px;height:26px">${pencil()}</button><button class="icon-btn sm d" style="width:26px;height:26px">${trash()}</button></span></div>`).join(""):`<span class="rhint">Vacío.</span>`;
  const label=key==="recomendaciones"?"Recomendación prioritaria":(key==="propuestas"?"Propuesta de trabajo":"Hallazgo clave");
  box.querySelectorAll(".rpt-item").forEach(it=>{ it.querySelector(".e").onclick=()=>diagBlockModal(est,key,label,+it.dataset.i); it.querySelector(".d").onclick=()=>{r[key].splice(+it.dataset.i,1);saveReporte(est);renderDiagList(est,c,key,sel);if(window._rptSchedule)window._rptSchedule();}; });
}
function protopersonaModal(est,idx){
  const r=est.reporte; const p=idx==null?{}:r.protopersonas[idx];
  openModal(`${idx==null?"Nueva":"Editar"} protopersona`,`
    <div class="row2"><div class="field"><label>Nombre</label><input id="pp_n" value="${esc(p.nombre||"")}"></div>
      <div class="field"><label>Edad <span class="opt">opcional</span></label><input id="pp_e" value="${esc(p.edad||"")}"></div></div>
    <div class="field"><label>Título / arquetipo <span class="opt">ej: La curiosa consciente</span></label><input id="pp_t" value="${esc(p.titulo||"")}"></div>
    <div class="row2"><div class="field"><label>Ubicación</label><input id="pp_u" value="${esc(p.ubicacion||"")}"></div>
      <div class="field"><label>Ocupación</label><input id="pp_o" value="${esc(p.ocupacion||"")}"></div></div>
    <div class="field"><label>Bio</label><textarea id="pp_bio">${esc(p.bio||"")}</textarea></div>
    <div class="field"><label>Necesidades <span class="opt">una por línea</span></label><textarea id="pp_nec">${esc((p.necesidades||[]).join("\n"))}</textarea></div>
    <div class="field"><label>Objetivos <span class="opt">una por línea</span></label><textarea id="pp_obj">${esc((p.objetivos||[]).join("\n"))}</textarea></div>
    <div class="field"><label>Dolores / problemas <span class="opt">una por línea</span></label><textarea id="pp_dol">${esc((p.dolores||[]).join("\n"))}</textarea></div>
    <div class="field"><label>Foto <span class="opt">opcional</span></label><input type="file" id="pp_foto" accept="image/*"><div class="hint">Se recorta y comprime.</div></div>
  `,async()=>{
    const rec={ id:p.id||uid(), nombre:document.getElementById("pp_n").value.trim(), edad:document.getElementById("pp_e").value.trim(),
      titulo:document.getElementById("pp_t").value.trim(), ubicacion:document.getElementById("pp_u").value.trim(),
      ocupacion:document.getElementById("pp_o").value.trim(), bio:document.getElementById("pp_bio").value.trim(),
      necesidades:document.getElementById("pp_nec").value.split("\n").map(s=>s.trim()).filter(Boolean),
      objetivos:document.getElementById("pp_obj").value.split("\n").map(s=>s.trim()).filter(Boolean),
      dolores:document.getElementById("pp_dol").value.split("\n").map(s=>s.trim()).filter(Boolean),
      foto:(idx!=null?p.foto:null)||null };
    if(!rec.nombre){document.getElementById("pp_n").focus();return false;}
    const f=document.getElementById("pp_foto").files[0];
    if(f){ try{ const im=await loadBitmap(f); rec.foto=scaleImg(im,320,0.72,0).dataUrl; if(im.close)im.close(); }catch(e){} }
    if(idx==null) r.protopersonas.push(rec); else r.protopersonas[idx]=rec;
    saveReporte(est); const c=document.getElementById("view"); renderPpList(est,c); if(window._rptSchedule)window._rptSchedule(); return true;
  });
}
function diagBlockModal(est,key,label,idx){
  const r=est.reporte; const b=idx==null?{}:r[key][idx]; const isRec=key==="recomendaciones";
  openModal(`${idx==null?"Nuevo":"Editar"} ${label.toLowerCase()}`,`
    <div class="field"><label>Título</label><input id="db_t" value="${esc(b.titulo||"")}"></div>
    <div class="field"><label>Texto</label><textarea id="db_x" rows="4">${esc(b.texto||"")}</textarea></div>
    ${isRec?`<div class="field"><label>Acciones <span class="opt">una por línea</span></label><textarea id="db_b" rows="3">${esc((b.bullets||[]).join("\n"))}</textarea></div>
    <div class="field"><label>Impacto esperado <span class="opt">opcional</span></label><textarea id="db_i" rows="2">${esc(b.impacto||"")}</textarea></div>`:""}
  `,async()=>{
    const rec={ titulo:document.getElementById("db_t").value.trim(), texto:document.getElementById("db_x").value.trim() };
    if(isRec){ rec.bullets=document.getElementById("db_b").value.split("\n").map(s=>s.trim()).filter(Boolean); rec.impacto=document.getElementById("db_i").value.trim(); }
    if(!rec.titulo){document.getElementById("db_t").focus();return false;}
    if(idx==null) r[key].push(rec); else r[key][idx]=rec;
    saveReporte(est); const c=document.getElementById("view"); renderDiagList(est,c,key,key==="recomendaciones"?"#rptRecList":"#rptHcList"); if(window._rptSchedule)window._rptSchedule(); return true;
  });
}
function chevUp(){return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg>';}
function chevDown(){return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';}
function gripIco(){return '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>';}
function renderPropList(est,c){
  const r=est.reporte, box=c.querySelector("#rptPropList");
  const n=r.propuestas.length;
  box.innerHTML=n?r.propuestas.map((p,i)=>{
    const price=p.precioModo==="adefinir"?"a definir":propPriceLine(p);
    return `<div class="rpt-item" data-i="${i}" draggable="true"><span class="ri-grip" title="Arrastrar para reordenar" style="cursor:grab;color:var(--faint);flex:none;margin-right:2px">${gripIco()}</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.titulo||"(sin título)")} <span style="color:var(--faint);font-family:var(--mono);font-size:11px">· ${esc(price)}</span></span><span class="ri-acts"><button class="icon-btn sm u" style="width:26px;height:26px" title="Subir" ${i===0?"disabled":""}>${chevUp()}</button><button class="icon-btn sm dn" style="width:26px;height:26px" title="Bajar" ${i===n-1?"disabled":""}>${chevDown()}</button><button class="icon-btn sm e" style="width:26px;height:26px" title="Editar">${pencil()}</button><button class="icon-btn sm d" style="width:26px;height:26px" title="Eliminar">${trash()}</button></span></div>`;
  }).join(""):`<span class="rhint">Sin propuestas.</span>`;
  const refresh=()=>{ saveReporte(est); renderPropList(est,c); if(window._rptSchedule)window._rptSchedule(); };
  const move=(i,j)=>{ if(j<0||j>=r.propuestas.length)return; const a=r.propuestas; const t=a[i]; a.splice(i,1); a.splice(j,0,t); refresh(); };
  box.querySelectorAll(".rpt-item").forEach(it=>{
    const i=+it.dataset.i;
    it.querySelector(".e").onclick=()=>propuestaModal(est,i);
    it.querySelector(".d").onclick=()=>{r.propuestas.splice(i,1);refresh();};
    it.querySelector(".u").onclick=()=>move(i,i-1);
    it.querySelector(".dn").onclick=()=>move(i,i+1);
    it.ondragstart=e=>{ e.dataTransfer.effectAllowed="move"; e.dataTransfer.setData("text/plain",String(i)); it.style.opacity=".45"; };
    it.ondragend=()=>{ it.style.opacity=""; };
    it.ondragover=e=>{ e.preventDefault(); e.dataTransfer.dropEffect="move"; it.style.borderColor="var(--accent)"; };
    it.ondragleave=()=>{ it.style.borderColor=""; };
    it.ondrop=e=>{ e.preventDefault(); it.style.borderColor=""; const from=+e.dataTransfer.getData("text/plain"); if(!isNaN(from)&&from!==i)move(from,i); };
  });
}
function propuestaModal(est,idx){
  const r=est.reporte; const p=idx==null?normalizePropuesta({}):normalizePropuesta(Object.assign({},r.propuestas[idx]));
  const monedas=[["USD","US$ (dólar)"],["ARS","$ (peso arg.)"],["EUR","€ (euro)"]];
  const descField=([k,label])=>`<div class="field" style="flex:1;min-width:120px"><label style="font-size:11.5px">${label} <span class="opt">%</span></label><input id="pr_d_${k}" type="number" min="0" max="100" step="1" value="${p.descuentos[k]!=null&&p.descuentos[k]!==""?esc(p.descuentos[k]):""}" placeholder="0"></div>`;
  openModal(`${idx==null?"Nueva":"Editar"} propuesta`,`
    <div class="field"><label>Título</label><input id="pr_t" value="${esc(p.titulo||"")}" placeholder="Ej: Plan mensual con fee fijo"></div>
    <div class="field"><label>Tipo de propuesta</label>
      <div class="type-seg" id="pr_tipo">
        <div class="seg ${p.tipo==="fixed"?"on":""}" data-t="fixed">Precio fijo</div>
        <div class="seg ${p.tipo==="mensual"?"on":""}" data-t="mensual">Plan fijo mensual</div>
      </div></div>
    <div class="field"><label>Descripción / beneficios</label><textarea id="pr_x" rows="3" placeholder="Qué gana el cliente con esta propuesta...">${esc(p.texto||"")}</textarea></div>
    <div class="field"><label>Qué incluye <span class="opt">una por línea</span></label><textarea id="pr_b" rows="4" placeholder="Bloque fijo de horas por mes&#10;Reuniones de seguimiento&#10;Prioridad en la agenda">${esc((p.bullets||[]).join("\n"))}</textarea></div>
    <div class="field"><label>Precio</label>
      <div class="type-seg" id="pr_modo" style="margin-bottom:8px">
        <div class="seg ${p.precioModo==="monto"?"on":""}" data-m="monto">Monto</div>
        <div class="seg ${p.precioModo==="adefinir"?"on":""}" data-m="adefinir">A definir</div>
      </div>
      <div class="row2" id="pr_montoWrap" style="${p.precioModo==="adefinir"?"display:none":""}">
        <div class="field"><label style="font-size:11.5px">Moneda</label><select id="pr_moneda">${monedas.map(m=>`<option value="${m[0]}" ${p.moneda===m[0]?"selected":""}>${m[1]}</option>`).join("")}</select></div>
        <div class="field"><label style="font-size:11.5px">Monto <span class="opt" id="pr_perMes" style="${p.tipo==="mensual"?"":"display:none"}">por mes</span></label><input id="pr_precio" type="number" min="0" step="1" value="${p.precio!=null&&p.precio!==""?esc(p.precio):""}" placeholder="0"></div>
      </div>
      <div id="pr_lanzWrap" style="${p.precioModo==="adefinir"?"display:none":"margin-top:12px"}">
        <label class="chk" style="margin-bottom:6px"><input type="checkbox" id="pr_lanz_on" ${p.lanz&&p.lanz.on?"checked":""}> Mostrar precio de lanzamiento (descuento)</label>
        <div class="row2" id="pr_lanzFields" style="${p.lanz&&p.lanz.on?"":"display:none"}">
          <div class="field"><label style="font-size:11.5px">Descuento <span class="opt">%</span></label><input id="pr_lanz_pct" type="number" min="1" max="99" step="1" value="${p.lanz&&p.lanz.pct!=null?esc(p.lanz.pct):20}"></div>
          <div class="field"><label style="font-size:11.5px">Cómo se ve</label><div class="hint" id="pr_lanz_prev" style="padding-top:8px;line-height:1.4"></div></div>
        </div>
        <div class="hint">El monto de arriba es el precio final, ya con el descuento aplicado. El precio "antes" se calcula solo y se redondea.</div>
      </div>
    </div>
    <div class="field"><label>Descuentos por pago adelantado <span class="opt">opcional</span></label>
      <div style="display:flex;flex-wrap:wrap;gap:10px">${PROP_DESC.map(descField).join("")}</div>
      <div class="hint" id="pr_descHint">${p.tipo==="mensual"?"Para el plan mensual se calcula el total de cada período con su descuento.":"Se muestra el porcentaje de descuento por pagar por adelantado."}</div>
    </div>
  `,async()=>{
    const rec=normalizePropuesta({
      id:p.id||uid(),
      titulo:document.getElementById("pr_t").value.trim(),
      tipo:document.querySelector("#pr_tipo .seg.on")?.dataset.t||"fixed",
      texto:document.getElementById("pr_x").value.trim(),
      bullets:document.getElementById("pr_b").value.split("\n").map(s=>s.trim()).filter(Boolean),
      precioModo:document.querySelector("#pr_modo .seg.on")?.dataset.m||"adefinir",
      moneda:document.getElementById("pr_moneda").value,
      precio:document.getElementById("pr_precio").value!==""?Number(document.getElementById("pr_precio").value):null,
      lanz:{on:document.getElementById("pr_lanz_on").checked,pct:document.getElementById("pr_lanz_pct").value!==""?Number(document.getElementById("pr_lanz_pct").value):20},
      descuentos:PROP_DESC.reduce((o,[k])=>{ const v=document.getElementById("pr_d_"+k).value; o[k]=v!==""?Number(v):null; return o; },{})
    });
    if(!rec.titulo){document.getElementById("pr_t").focus();return false;}
    if(idx==null) r.propuestas.push(rec); else r.propuestas[idx]=rec;
    saveReporte(est); const c=document.getElementById("view"); renderPropList(est,c); if(window._rptSchedule)window._rptSchedule(); return true;
  });
  // interacciones del modal
  const seg=(sel,attr,cb)=>{ document.querySelectorAll(sel+" .seg").forEach(s=>s.onclick=()=>{ document.querySelectorAll(sel+" .seg").forEach(y=>y.classList.remove("on")); s.classList.add("on"); cb&&cb(s.dataset[attr]); }); };
  const curTipo=()=>document.querySelector("#pr_tipo .seg.on")?.dataset.t||"fixed";
  function updLanzPrev(){
    const prev=document.getElementById("pr_lanz_prev"); if(!prev)return;
    const precio=Number(document.getElementById("pr_precio").value), pct=Number(document.getElementById("pr_lanz_pct").value), mon=document.getElementById("pr_moneda").value, per=curTipo()==="mensual"?" /mes":"";
    if(!precio||!pct||pct<=0||pct>=100){ prev.innerHTML='<span style="color:var(--faint)">Cargá monto y %</span>'; return; }
    const antes=Math.round((precio/(1-pct/100))/5)*5;
    prev.innerHTML='<span style="text-decoration:line-through;color:var(--faint)">'+esc(propMoney(mon,antes)+per)+'</span> <b style="color:var(--prob)">'+esc(propMoney(mon,precio)+per)+'</b>';
  }
  seg("#pr_tipo","t",v=>{ document.getElementById("pr_perMes").style.display=v==="mensual"?"":"none"; document.getElementById("pr_descHint").textContent=v==="mensual"?"Para el plan mensual se calcula el total de cada período con su descuento.":"Se muestra el porcentaje de descuento por pagar por adelantado."; updLanzPrev(); });
  seg("#pr_modo","m",v=>{ document.getElementById("pr_montoWrap").style.display=v==="adefinir"?"none":""; document.getElementById("pr_lanzWrap").style.display=v==="adefinir"?"none":"block"; });
  document.getElementById("pr_lanz_on").onchange=e=>{ document.getElementById("pr_lanzFields").style.display=e.target.checked?"":"none"; updLanzPrev(); };
  document.getElementById("pr_lanz_pct").oninput=updLanzPrev;
  document.getElementById("pr_precio").addEventListener("input",updLanzPrev);
  document.getElementById("pr_moneda").addEventListener("change",updLanzPrev);
  updLanzPrev();
}
/* Marca del reporte: formulario dentro del panel, con guardado automático (antes era un modal). */
function renderMarca(box,est){
  const m=marcaActual();
  box.innerHTML=`<div class="pf-stack">
    <div class="pf"><label>Imagen de encabezado <span class="hint">esquina superior derecha de cada hoja</span></label>
      <div class="br-img">${m.headerImg?`<img src="${m.headerImg}" alt="Encabezado actual">`:`<span class="hint">Sin imagen</span>`}<label class="btn-q">Subir<input type="file" id="br_head" accept="image/*" hidden></label>${m.headerImg?`<button type="button" class="btn-q" id="br_head_del">Quitar</button>`:""}</div></div>
    <div class="pf"><label>Logotipo de portada <span class="hint">opcional, reemplaza el texto de marca</span></label>
      <div class="br-img">${m.logo?`<img src="${m.logo}" alt="Logo actual">`:`<span class="hint">Sin logo</span>`}<label class="btn-q">Subir<input type="file" id="br_logo" accept="image/*" hidden></label>${m.logo?`<button type="button" class="btn-q" id="br_logo_del">Quitar</button>`:""}</div></div>
    <div class="pf"><label for="br_wm">Texto de marca</label><input id="br_wm" data-k="wordmark" value="${esc(m.wordmark)}"></div>
    <div class="pf-row"><div class="pf"><label for="br_n">Nombre</label><input id="br_n" data-k="nombre" value="${esc(m.nombre)}"></div><div class="pf"><label for="br_r">Rol</label><input id="br_r" data-k="rol" value="${esc(m.rol)}"></div></div>
    <div class="pf-row"><div class="pf"><label for="br_s">Sitio</label><input id="br_s" data-k="sitio" value="${esc(m.sitio)}"></div><div class="pf"><label for="br_a">Año</label><input id="br_a" data-k="anio" value="${esc(m.anio)}"></div></div>
    <div class="pf-row"><div class="pf"><label for="br_email">Email de contacto</label><input id="br_email" data-k="email" value="${esc(m.email||"")}" placeholder="hola@uxuaria.com"></div><div class="pf"><label for="br_tel">Teléfono / WhatsApp</label><input id="br_tel" data-k="tel" value="${esc(m.tel||"")}" placeholder="+54 ..."></div></div>
    <div class="pf"><label for="br_li">Perfil de LinkedIn <span class="hint">para pedir una recomendación</span></label><input id="br_li" data-k="linkedin" value="${esc(m.linkedin||"")}" placeholder="https://www.linkedin.com/in/tu-perfil"></div>
    <div class="pf"><label for="br_bien">Texto de bienvenida <span class="hint">vacío = texto por defecto</span></label><textarea id="br_bien" data-k="bienvenida" placeholder="¡Hola! Gracias por tu tiempo y por el interés en este diagnóstico...">${esc(m.bienvenida||"")}</textarea></div>
    <div class="pf"><label for="br_nia">Aclaración "Hecho por una persona"</label><textarea id="br_nia" data-k="notaIA" placeholder="Este diagnóstico no fue generado por una herramienta automática de IA...">${esc(m.notaIA||"")}</textarea></div>
    <div class="pf"><label for="br_nini">Aclaración "Diagnóstico inicial"</label><textarea id="br_nini" data-k="notaInicial" placeholder="Está basado en la información que compartieron y en lo que pude explorar...">${esc(m.notaInicial||"")}</textarea></div>
    <div class="pf-row"><div class="pf"><label for="br_svcn">Servicio destacado</label><input id="br_svcn" data-k="servicioNombre" value="${esc(m.servicioNombre||"")}" placeholder="MV Rescue"></div><div class="pf"><label for="br_svcu">URL del servicio</label><input id="br_svcu" data-k="servicioUrl" value="${esc(m.servicioUrl||"")}" placeholder="https://..."></div></div>
    <div class="pf"><label for="br_svcd">Descripción del servicio</label><textarea id="br_svcd" data-k="servicioDesc" placeholder="Qué es y a quién ayuda">${esc(m.servicioDesc||"")}</textarea></div>
    <span class="hint" id="brMsg">Los cambios se guardan solos.</span>
  </div>`;
  let t=null;
  const guardar=async(cambios)=>{ const rec={...marcaActual(),...cambios}; if(!rec.wordmark) rec.wordmark="uxuaria"; state.marca=rec;
    const msg=box.querySelector("#brMsg"); if(msg) msg.textContent="Guardando…";
    try{ await brandStore.save(rec); if(msg) msg.textContent="Guardado"; if(window._rptSchedule) window._rptSchedule(); }
    catch(e){ console.error("marca",e); if(msg) msg.textContent="No se pudo guardar la marca."; } };
  box.querySelectorAll("[data-k]").forEach(inp=>inp.oninput=()=>{ clearTimeout(t); const k=inp.dataset.k, v=inp.value.trim(); t=setTimeout(()=>guardar({[k]:v}),500); });
  const subir=async(f,clave,maxW,q)=>{ try{ const im=await loadBitmap(f); const url=scaleImg(im,maxW,q,0).dataUrl; if(im.close)im.close(); await guardar({[clave]:url}); renderMarca(box,est); }catch(e){ toast("No se pudo procesar la imagen"); } };
  const hf=box.querySelector("#br_head"); hf.onchange=()=>{ if(hf.files[0]) subir(hf.files[0],"headerImg",600,0.9); };
  const lf=box.querySelector("#br_logo"); lf.onchange=()=>{ if(lf.files[0]) subir(lf.files[0],"logo",480,0.85); };
  const hd=box.querySelector("#br_head_del"); if(hd) hd.onclick=async()=>{ await guardar({headerImg:null}); renderMarca(box,est); };
  const ld=box.querySelector("#br_logo_del"); if(ld) ld.onclick=async()=>{ await guardar({logo:null}); renderMarca(box,est); };
}
