import { render } from "../app/render.js";
import { state } from "../core/state.js";
import { esc } from "../core/util.js";
import { flowStore } from "../flujos/flujos.js";
import { openClientReport } from "./cliente.js";
import { ensureReporte, saveReporte } from "./comun.js";
import { BLOQUES, estaOculto, setOculto } from "./seleccion.js";
import { actividadDe, despublicarReporte, firmaReporte, linkPublico, publicarReporte } from "./publicar.js";
import { buildShareHtml, collectShareData } from "../share/compartir.js";
import { toast } from "../ui/modales.js";

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
        <p class="rhint" style="margin-top:10px">El contenido del proyecto (muestra, resumen, diagnóstico y propuestas) y la marca se cargan en <b>Configuración</b>.</p></div></section>
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
