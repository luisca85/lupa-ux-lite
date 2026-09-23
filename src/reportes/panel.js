import { render } from "../app/render.js";
import { state } from "../core/state.js";
import { esc, uid } from "../core/util.js";
import { flowStore } from "../flujos/flujos.js";
import { openClientReport } from "./cliente.js";
import { brandStore, ensureReporte, marcaActual, saveReporte } from "./comun.js";
import { PROP_DESC, normalizePropuesta, propMoney, propPriceLine } from "./propuestas.js";
import { openPlainExport } from "./texto-plano.js";
import { BLOQUES, estaOculto, setOculto } from "./seleccion.js";
import { consentimientosDe, despublicarReporte, linkPublico, publicarReporte } from "./publicar.js";
import { generateSharePage } from "../share/compartir.js";
import { txtIco } from "../ui/descargas.js";
import { pencil, plus, trash } from "../ui/iconos.js";
import { loadBitmap, scaleImg } from "../ui/imagenes.js";
import { openConfirm, openModal, toast } from "../ui/modales.js";

export function renderReportesInto(c,est){
  if(state._flujosFor!==est.id){
    c.innerHTML=`<div class="ev-loading" style="min-height:200px">Cargando datos del estudio...</div>`;
    (async()=>{ state.flujos=await flowStore.list(est.id); state._flujosFor=est.id; render(); })();
    return;
  }
  const r=ensureReporte(est);
  c.innerHTML=`<div class="rpt-wrap2">
    <div class="rpt-toolbar">
      <button class="btn primary sm" id="rptShare">${txtIco()} Generar página para compartir</button>
      <button class="btn sm" id="rptCliPrev">Vista previa del reporte</button>
      <button class="btn sm" id="rptPlain">${txtIco()} Exportar en texto plano</button>
      <button class="btn ghost sm" id="rptBrand">${pencil()} Marca</button>
      <span class="grow"></span>
      <span id="rptCliMsg" class="hint"></span>
    </div>
    <div class="rpt-cols2">
      <div class="rpt-group rpt-pub"><h4>Link público</h4><div id="rptPub"></div></div>
      <div class="rpt-group rpt-sel"><h4>Qué ve el cliente</h4>
        <p class="rhint">Prendé o apagá secciones y elegí ítem por ítem. Lo que ocultes no se incluye en la vista previa, la página para compartir ni el link público. Lo nuevo aparece visible.</p>
        <div id="rptSel"></div>
        <p class="rhint" style="margin-top:10px">La información del proyecto (resumen, diagnóstico, protopersonas, propuestas y muestra) se carga en la pestaña <b>Proyecto</b>.</p></div>
    </div>
  </div>`;
  c.querySelector("#rptBrand").onclick=()=>brandModal();
  c.querySelector("#rptPlain").onclick=()=>openPlainExport(est);
  renderSeleccion(c.querySelector("#rptSel"),est,r);
  renderPublico(c.querySelector("#rptPub"),est,r);
  c.querySelector("#rptCliPrev").onclick=()=>openClientReport(est.id);
  c.querySelector("#rptShare").onclick=e=>generateSharePage(est,e.currentTarget);
  window._rptSchedule=null;
}
/* Link público con PIN (foto del reporte; volver a publicar la actualiza). */
function renderPublico(box,est,r){
  const pub=r.publico, fecha=pub?new Date(pub.publicadoAt).toLocaleString("es-AR",{dateStyle:"medium",timeStyle:"short"}):"";
  box.innerHTML=pub?`
    <p class="rhint">Cualquiera con el link y el PIN ve el reporte en modo lectura, sin cuenta. Muestra la foto del ${esc(fecha)}: si cambiás algo, actualizá la publicación.</p>
    <div class="pub-row"><label class="rlab">Link</label><div class="pub-val"><code id="pubLink">${esc(linkPublico(pub))}</code><button type="button" class="btn ghost sm" data-copy="pubLink">Copiar</button></div></div>
    <div class="pub-row"><label class="rlab">PIN</label><div class="pub-val"><code id="pubPinVal" class="pub-pin">${esc(pub.pin)}</code><button type="button" class="btn ghost sm" data-copy="pubPinVal">Copiar</button></div></div>
    <div class="pub-consent"><span class="rlab">Consentimientos</span><div id="pubCons" class="hint">Cargando...</div></div>
    <div class="pub-acts">
      <button type="button" class="btn primary sm" id="pubUpd">Actualizar publicación</button>
      <button type="button" class="btn sm" id="pubPinNew">Generar PIN nuevo</button>
      <button type="button" class="btn ghost sm danger" id="pubOff">Despublicar</button>
      <span class="hint" id="pubMsg"></span>
    </div>`:`
    <p class="rhint">Generá un link para que el cliente vea el reporte en modo lectura con un PIN de 6 dígitos, sin crear cuenta. Se publica una foto de lo que elegiste abajo.</p>
    <div class="pub-acts"><button type="button" class="btn primary sm" id="pubOn">Publicar reporte</button><span class="hint" id="pubMsg"></span></div>`;
  const msg=box.querySelector("#pubMsg");
  const run=async(btn,fn,ok)=>{
    btn.disabled=true; msg.textContent="Publicando..."; msg.className="hint";
    try{ await fn(); renderPublico(box,est,r); toast(ok); }
    catch(e){ console.error("publicar",e); msg.textContent="No se pudo: "+((e&&e.message)||e); btn.disabled=false; }
  };
  const on=box.querySelector("#pubOn"); if(on) on.onclick=()=>run(on,()=>publicarReporte(est),"Reporte publicado");
  const upd=box.querySelector("#pubUpd"); if(upd) upd.onclick=()=>run(upd,()=>publicarReporte(est),"Publicación actualizada");
  const pn=box.querySelector("#pubPinNew"); if(pn) pn.onclick=()=>openConfirm("Generar PIN nuevo","El PIN actual deja de funcionar. Vas a tener que compartir el nuevo.",()=>run(pn,()=>publicarReporte(est,{nuevoPIN:true}),"PIN nuevo generado"),"Generar");
  const off=box.querySelector("#pubOff"); if(off) off.onclick=()=>openConfirm("Despublicar reporte","El link deja de funcionar para todos. Podés volver a publicar después (con un link nuevo).",()=>run(off,()=>despublicarReporte(est),"Reporte despublicado"),"Despublicar");
  const cons=box.querySelector("#pubCons");
  if(cons) consentimientosDe(est).then(l=>{
    cons.innerHTML=l.length?`<ul class="pub-cons-list">${l.slice().reverse().map(c=>`<li><b>${esc(c.nombre)}</b> · ${esc(new Date(c.fecha).toLocaleString("es-AR",{dateStyle:"medium",timeStyle:"short"}))}</li>`).join("")}</ul>`:"Todavía nadie abrió el link.";
  }).catch(()=>{ cons.textContent="No se pudieron cargar."; });
  box.querySelectorAll("[data-copy]").forEach(b=>b.onclick=async()=>{ const t=box.querySelector("#"+b.dataset.copy).textContent; try{ await navigator.clipboard.writeText(t); toast("Copiado"); }catch(_){ toast("No se pudo copiar"); } });
}
/* Qué ve el cliente: secciones (r.online) e ítems ocultos (r.ocultos). */
function renderSeleccion(box,est,r){
  const flows=state.flujos.filter(f=>f.tipo!=="User Journey"), jrs=state.flujos.filter(f=>f.tipo==="User Journey");
  const secs=[
    {on:null,tipo:"bloques",label:"Inicio (información del proyecto)",items:BLOQUES.map(([k,l])=>({id:k,t:l}))},
    {on:"hallazgos",tipo:"hallazgos",label:"Hallazgos",items:state.hallazgos.map(h=>({id:h.id,t:h.titulo||"(sin título)",sub:h.tipo+(h.severidad!=null&&h.severidad!==""?" · Sev "+h.severidad:"")}))},
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
  const redo=()=>{ saveReporte(est); renderSeleccion(box,est,r); };
  box.querySelectorAll("[data-sec]").forEach(cb=>cb.onchange=()=>{ r.online[cb.dataset.sec]=cb.checked; redo(); });
  box.querySelectorAll("[data-tog]").forEach(b=>b.onclick=()=>{ const i=+b.dataset.tog; open.has(i)?open.delete(i):open.add(i); renderSeleccion(box,est,r); });
  box.querySelectorAll("input[data-id]").forEach(cb=>cb.onchange=()=>{ setOculto(r,cb.dataset.t,cb.dataset.id,!cb.checked); redo(); });
  const all=(i,oculto)=>{ const sec=secs[i]; sec.items.forEach(it=>setOculto(r,sec.tipo,it.id,oculto)); redo(); };
  box.querySelectorAll("[data-all]").forEach(b=>b.onclick=()=>all(+b.dataset.all,false));
  box.querySelectorAll("[data-none]").forEach(b=>b.onclick=()=>all(+b.dataset.none,true));
}
/* Información general del proyecto (vive en estudio.reporte; se edita en la pestaña Proyecto). */
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
function brandModal(){
  const m=marcaActual();
  openModal("Marca del reporte",`
    <div class="field"><label>Imagen de encabezado <span class="opt">esquina superior derecha de cada hoja</span></label><input type="file" id="br_head" accept="image/*">
      ${m.headerImg?`<div class="hint" style="display:flex;align-items:center;gap:8px"><img src="${m.headerImg}" style="max-height:28px;max-width:120px;object-fit:contain;background:#fff;border:1px solid var(--line);border-radius:4px;padding:2px"><label style="display:inline-flex;align-items:center;gap:5px;margin:0;font-weight:normal"><input type="checkbox" id="br_head_del" style="width:auto"> Quitar imagen</label></div>`:`<div class="hint">Sin imagen: el espacio queda vacío en el reporte.</div>`}</div>
    <div class="field"><label>Logotipo de portada <span class="opt">opcional, reemplaza el texto</span></label><input type="file" id="br_logo" accept="image/*">
      ${m.logo?`<div class="hint">Hay un logo cargado. Subí otro para reemplazarlo.</div>`:`<div class="hint">Sin logo: se usa el texto de marca.</div>`}</div>
    <div class="field"><label>Texto de marca <span class="opt">si no hay logo</span></label><input id="br_wm" value="${esc(m.wordmark)}"></div>
    <div class="field"><label>Nombre</label><input id="br_n" value="${esc(m.nombre)}"></div>
    <div class="field"><label>Rol</label><input id="br_r" value="${esc(m.rol)}"></div>
    <div class="row2"><div class="field"><label>Sitio</label><input id="br_s" value="${esc(m.sitio)}"></div>
      <div class="field"><label>Año</label><input id="br_a" value="${esc(m.anio)}"></div></div>
    <div class="row2"><div class="field"><label>Email de contacto</label><input id="br_email" value="${esc(m.email||"")}" placeholder="hola@uxuaria.com"></div>
      <div class="field"><label>Teléfono / WhatsApp</label><input id="br_tel" value="${esc(m.tel||"")}" placeholder="+54 ..."></div></div>
    <div class="field"><label>Perfil de LinkedIn <span class="opt">para pedir una recomendación en el reporte</span></label><input id="br_li" value="${esc(m.linkedin||"")}" placeholder="https://www.linkedin.com/in/tu-perfil"></div>
    <div class="field"><label>Texto de bienvenida del reporte <span class="opt">vacío = texto por defecto</span></label><textarea id="br_bien" rows="3" placeholder="¡Hola! Gracias por tu tiempo y por el interés en este diagnóstico...">${esc(m.bienvenida||"")}</textarea></div>
    <div class="field"><label>Aclaración "Hecho por una persona" <span class="opt">vacío = texto por defecto</span></label><textarea id="br_nia" rows="3" placeholder="Este diagnóstico no fue generado por una herramienta automática de IA...">${esc(m.notaIA||"")}</textarea></div>
    <div class="field"><label>Aclaración "Diagnóstico inicial" <span class="opt">vacío = texto por defecto</span></label><textarea id="br_nini" rows="3" placeholder="Está basado en la información que compartieron y en lo que pude explorar...">${esc(m.notaInicial||"")}</textarea></div>
    <div class="field"><label>Servicio destacado <span class="opt">para el CTA del reporte online</span></label>
      <div class="row2"><input id="br_svcn" value="${esc(m.servicioNombre||"")}" placeholder="MV Rescue"><input id="br_svcu" value="${esc(m.servicioUrl||"")}" placeholder="URL del servicio (opcional)"></div>
      <textarea id="br_svcd" rows="2" placeholder="Qué es y a quién ayuda (editá con tus palabras)">${esc(m.servicioDesc||"")}</textarea></div>
  `,async()=>{
    const rec={ wordmark:document.getElementById("br_wm").value.trim()||"uxuaria", nombre:document.getElementById("br_n").value.trim(),
      rol:document.getElementById("br_r").value.trim(), sitio:document.getElementById("br_s").value.trim(),
      anio:document.getElementById("br_a").value.trim(), logo:m.logo||null, headerImg:m.headerImg||null, color:m.color||"",
      email:document.getElementById("br_email").value.trim(), tel:document.getElementById("br_tel").value.trim(),
      servicioNombre:document.getElementById("br_svcn").value.trim(), servicioUrl:document.getElementById("br_svcu").value.trim(),
      servicioDesc:document.getElementById("br_svcd").value.trim(),
      linkedin:document.getElementById("br_li").value.trim(), bienvenida:document.getElementById("br_bien").value.trim(),
      notaIA:document.getElementById("br_nia").value.trim(), notaInicial:document.getElementById("br_nini").value.trim() };
    const f=document.getElementById("br_logo").files[0];
    if(f){ try{ const im=await loadBitmap(f); rec.logo=scaleImg(im,480,0.85,0).dataUrl; if(im.close)im.close(); }catch(e){} }
    const hf=document.getElementById("br_head").files[0];
    const hdel=document.getElementById("br_head_del");
    if(hf){ try{ const im=await loadBitmap(hf); rec.headerImg=scaleImg(im,600,0.9,0).dataUrl; if(im.close)im.close(); }catch(e){} }
    else if(hdel&&hdel.checked){ rec.headerImg=null; }
    state.marca=rec; await brandStore.save(rec); toast("Marca guardada"); if(window._rptSchedule)window._rptSchedule(); return true;
  });
}
