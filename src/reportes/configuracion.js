import { state } from "../core/state.js";
import { esc, uid } from "../core/util.js";
import { brandStore, ensureReporte, marcaActual, saveReporte, cuentaBeta } from "./comun.js";
import { BOTON_RESERVA, PROP_DESC, TJ_TEXTOS, fechaLarga, normalizePropuesta, propMoney, propPriceLine } from "./propuestas.js";
import { openClientReport } from "./cliente.js";
import { plus, trash } from "../ui/iconos.js";
import { loadBitmap, scaleImg } from "../ui/imagenes.js";
import { toast } from "../ui/modales.js";

/* ============ Configuración: menú a la izquierda + contenido del ítem a la derecha ============
   Mismo esquema que Reportes. Ítems: Datos del proyecto (muestra inicial, resumen ejecutivo y
   diagnóstico estratégico), Marca y Propuestas de trabajo. Los bloques del diagnóstico y las
   propuestas se editan en el mismo panel (sin modales) con "Atrás" y "Guardar". */
const SECCIONES=[
  {id:"datos",label:"Datos del proyecto",sub:"Muestra, resumen y diagnóstico",ico:'<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'},
  {id:"marca",label:"Marca",sub:"Logo, contacto y textos",ico:'<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18M3 12h18"/>'},
  {id:"propuestas",label:"Propuestas de trabajo",sub:"Lo que ofrecés al cliente",ico:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>'}
];
const ico=(p,w=16)=>`<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const chevL=ico('<path d="m15 6-6 6 6 6"/>',15), chevR=ico('<path d="m9 6 6 6-6 6"/>',15);
const cfg=()=>state.cfg||(state.cfg={sec:"datos",edit:null});

export function renderProyectoInto(c,est){
  ensureReporte(est);
  const st=cfg(); if(!SECCIONES.some(s=>s.id===st.sec)) st.sec="datos";
  window._rptSchedule=null;
  c.classList.add("hz-ws-host");
  c.innerHTML=`<div class="rp-ws cf-ws">
    <aside class="rp-panel cf-panel" aria-label="Secciones de configuración">
      <div class="rp-head"><h2>Configuración</h2><p>Lo que cargues acá aparece en el reporte del cliente.</p></div>
      <nav class="cf-menu" aria-label="Configuración">${SECCIONES.map(s=>`<button type="button" class="cf-item${st.sec===s.id?" on":""}" data-sec="${s.id}"${st.sec===s.id?' aria-current="page"':""}>
        <span class="cf-ico">${ico(s.ico)}</span><span class="cf-txt"><b>${s.label}</b><small>${s.sub}</small></span>${chevR}</button>`).join("")}</nav>
    </aside>
    <section class="cf-main" id="cfMain" aria-live="polite"></section>
  </div>`;
  c.querySelectorAll(".cf-item").forEach(b=>b.onclick=()=>{ st.sec=b.dataset.sec; st.edit=null; renderProyectoInto(c,est); });
  pintar(c,est);
}
function pintar(c,est){
  const st=cfg(), main=c.querySelector("#cfMain"), volver=()=>{ st.edit=null; pintar(c,est); main.scrollTop=0; };
  if(st.sec==="datos") st.edit?editorBloque(main,est,st.edit,volver):datos(main,est,c);
  else if(st.sec==="marca") marca(main);
  else st.edit?editorPropuesta(main,est,st.edit,volver):propuestas(main,est,c);
}
const cabecera=(t,p)=>`<header class="cf-h"><h2>${t}</h2>${p?`<p>${p}</p>`:""}</header>`;
const atras=label=>`<button type="button" class="cf-back" id="cfBack">${chevL} ${label}</button>`;

/* ---- Datos del proyecto ---- */
function datos(main,est,c){
  const r=est.reporte, st=cfg();
  const ta=(f,label,rows,hint,ph)=>`<div class="pf"><label for="cf_${f}">${label}${hint?` <span class="hint">${hint}</span>`:""}</label><textarea id="cf_${f}" data-f="${f}" rows="${rows}"${ph?` placeholder="${ph}"`:""}>${esc(r[f])}</textarea></div>`;
  const lista=(key,label,vacio)=>`<div class="pf"><div class="cf-lh"><label>${label}</label><button type="button" class="btn-q" data-add="${key}">${plus()} Agregar</button></div>
    <div class="cf-list">${r[key].length?r[key].map((b,i)=>`<button type="button" class="cf-li" data-key="${key}" data-i="${i}"><span>${esc(b.titulo||"(sin título)")}</span>${chevR}</button>`).join(""):`<span class="rhint">${vacio}</span>`}</div></div>`;
  main.innerHTML=`<div class="cf-wrap">${cabecera("Datos del proyecto","Se guardan solos mientras escribís.")}
    <section class="cf-card"><h3>Muestra inicial</h3>
      <label class="chk"><input type="checkbox" id="cfMuestraOn" ${r.muestra.on?"checked":""}> Mostrar aviso de "muestra inicial"</label>
      <div class="pf"><label for="cfMuestraTxt">Texto del aviso</label><textarea id="cfMuestraTxt" rows="3">${esc(r.muestra.texto||"")}</textarea></div></section>
    <section class="cf-card"><h3>Resumen ejecutivo</h3>
      ${ta("subtitulo","Título del informe",2,"","Subtítulo del informe")}${ta("resumen","Introducción",3,"","Panorama del informe...")}
      ${ta("objetivos","Objetivos",3,"una línea por ítem")}${ta("alcance","Alcance",3,"una línea por ítem")}${ta("metricas","Métricas y metas",2,"una línea por ítem")}</section>
    <section class="cf-card"><h3>Diagnóstico estratégico</h3>
      ${ta("diagIntro","Introducción",3)}
      ${lista("hallazgosClave","Hallazgos clave","Sin hallazgos clave.")}
      ${lista("recomendaciones","Recomendaciones prioritarias","Sin recomendaciones.")}</section>
  </div>`;
  main.querySelectorAll("textarea[data-f]").forEach(t=>t.oninput=()=>{ r[t.dataset.f]=t.value; saveReporte(est); });
  main.querySelector("#cfMuestraOn").onchange=e=>{ r.muestra.on=e.target.checked; saveReporte(est); };
  main.querySelector("#cfMuestraTxt").oninput=e=>{ r.muestra.texto=e.target.value; saveReporte(est); };
  main.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{ st.edit={key:b.dataset.add,idx:null}; pintar(c,est); });
  main.querySelectorAll(".cf-li").forEach(b=>b.onclick=()=>{ st.edit={key:b.dataset.key,idx:+b.dataset.i}; pintar(c,est); });
}
function editorBloque(main,est,{key,idx},volver){
  const r=est.reporte, b=idx==null?{}:(r[key][idx]||{}), isRec=key==="recomendaciones";
  const nombre=isRec?"recomendación prioritaria":"hallazgo clave";
  main.innerHTML=`<div class="cf-wrap">${atras("Datos del proyecto")}${cabecera((idx==null?(isRec?"Nueva ":"Nuevo "):"Editar ")+nombre)}
    <section class="cf-card">
      <div class="pf"><label for="db_t">Título</label><input id="db_t" value="${esc(b.titulo||"")}"></div>
      <div class="pf"><label for="db_x">Texto</label><textarea id="db_x" rows="4">${esc(b.texto||"")}</textarea></div>
      ${isRec?`<div class="pf"><label for="db_b">Acciones <span class="hint">una por línea</span></label><textarea id="db_b" rows="3">${esc((b.bullets||[]).join("\n"))}</textarea></div>
      <div class="pf"><label for="db_i">Impacto esperado <span class="hint">opcional</span></label><textarea id="db_i" rows="2">${esc(b.impacto||"")}</textarea></div>`:""}
    </section>
    ${barra(idx!=null)}</div>`;
  main.querySelector("#cfBack").onclick=volver; main.querySelector("#cfCancel").onclick=volver;
  main.querySelector("#db_t").focus();
  main.querySelector("#cfSave").onclick=()=>{
    const rec={ titulo:main.querySelector("#db_t").value.trim(), texto:main.querySelector("#db_x").value.trim() };
    if(isRec){ rec.bullets=main.querySelector("#db_b").value.split("\n").map(s=>s.trim()).filter(Boolean); rec.impacto=main.querySelector("#db_i").value.trim(); }
    if(!rec.titulo){ main.querySelector("#db_t").focus(); return toast("Poné un título"); }
    if(idx==null) r[key].push(rec); else r[key][idx]=rec;
    saveReporte(est); toast("Guardado"); volver();
  };
  eliminar(main,`¿Eliminar este ${isRec?"bloque":"hallazgo clave"}?`,()=>{ r[key].splice(idx,1); saveReporte(est); toast("Eliminado"); volver(); });
}
// Acciones del editor: Guardar / Cancelar y, si ya existe, Eliminar con confirmación en línea.
const barra=existe=>`<div class="cf-acts">${existe?`<button type="button" class="btn-q pub-danger" id="cfDel">${trash()} Eliminar</button>`:""}<span class="grow"></span>
  <button type="button" class="btn-q" id="cfCancel">Cancelar</button><button type="button" class="btn-q sel" id="cfSave">Guardar</button></div>
  <div class="pub-confirm" id="cfConfirm" hidden></div>`;
function eliminar(main,texto,fn){
  const del=main.querySelector("#cfDel"); if(!del) return;
  del.onclick=()=>{ const cf=main.querySelector("#cfConfirm"); cf.hidden=false;
    cf.innerHTML=`<p>${texto} No se puede deshacer.</p><div class="pub-acts"><button type="button" class="btn-q pub-danger" id="cfSi">Eliminar</button><button type="button" class="btn-q" id="cfNo">Cancelar</button></div>`;
    cf.querySelector("#cfNo").onclick=()=>{ cf.hidden=true; cf.innerHTML=""; };
    cf.querySelector("#cfSi").onclick=fn; cf.querySelector("#cfSi").focus(); };
}

/* ---- Marca (vale para todos los estudios; guardado automático) ---- */
function marca(main){
  main.innerHTML=`<div class="cf-wrap">${cabecera("Marca","Logo, datos de contacto y textos del reporte. Valen para todos los estudios y se guardan solos.")}<section class="cf-card" id="rptMarca"></section></div>`;
  renderMarca(main.querySelector("#rptMarca"));
}
function renderMarca(box){
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
    <div class="pf-row"><div class="pf"><label for="br_svcn">Servicio destacado</label><input id="br_svcn" data-k="servicioNombre" value="${esc(m.servicioNombre||"")}" placeholder="Ej: Auditoría UX"></div><div class="pf"><label for="br_svcu">URL del servicio</label><input id="br_svcu" data-k="servicioUrl" value="${esc(m.servicioUrl||"")}" placeholder="https://..."></div></div>
    <div class="pf"><label for="br_svcd">Descripción del servicio</label><textarea id="br_svcd" data-k="servicioDesc" placeholder="Qué es y a quién ayuda">${esc(m.servicioDesc||"")}</textarea></div>
    <span class="hint" id="brMsg">Los cambios se guardan solos.</span>
  </div>`;
  let t=null;
  const guardar=async(cambios)=>{ const rec={...marcaActual(),...cambios}; if(!rec.wordmark&&!cuentaBeta()) rec.wordmark="uxuaria"; state.marca=rec;
    const msg=box.querySelector("#brMsg"); if(msg) msg.textContent="Guardando…";
    try{ await brandStore.save(rec); if(msg) msg.textContent="Guardado"; }
    catch(e){ console.error("marca",e); if(msg) msg.textContent="No se pudo guardar la marca."; } };
  box.querySelectorAll("[data-k]").forEach(inp=>inp.oninput=()=>{ clearTimeout(t); const k=inp.dataset.k, v=inp.value.trim(); t=setTimeout(()=>guardar({[k]:v}),500); });
  const subir=async(f,clave,maxW,q)=>{ try{ const im=await loadBitmap(f); const url=scaleImg(im,maxW,q,0).dataUrl; if(im.close)im.close(); await guardar({[clave]:url}); renderMarca(box); }catch(e){ toast("No se pudo procesar la imagen"); } };
  const hf=box.querySelector("#br_head"); hf.onchange=()=>{ if(hf.files[0]) subir(hf.files[0],"headerImg",600,0.9); };
  const lf=box.querySelector("#br_logo"); lf.onchange=()=>{ if(lf.files[0]) subir(lf.files[0],"logo",480,0.85); };
  const hd=box.querySelector("#br_head_del"); if(hd) hd.onclick=async()=>{ await guardar({headerImg:null}); renderMarca(box); };
  const ld=box.querySelector("#br_logo_del"); if(ld) ld.onclick=async()=>{ await guardar({logo:null}); renderMarca(box); };
}

/* ---- Propuestas de trabajo: grilla de cards; cada una se edita en el mismo panel ---- */
function propuestas(main,est,c){
  const r=est.reporte, st=cfg(), n=r.propuestas.length, tj=r.tj;
  main.innerHTML=`<div class="cf-wrap cf-wide">${cabecera("Propuestas de trabajo","El cliente las ve en \"Trabajemos juntos\", en este orden. Tocá una para editarla.")}
    <section class="cf-card cf-tj"><div class="cf-lh"><h3>Textos de "Trabajemos juntos"</h3><button type="button" class="btn-q" id="cfTjPrev"${n?"":" disabled"}>Vista previa</button></div>
      <div class="pf-row"><div class="pf"><label for="tj_k">Antetítulo</label><input id="tj_k" data-tj="kicker" value="${esc(tj.kicker)}" placeholder="${esc(TJ_TEXTOS.kicker)}"></div>
        <div class="pf"><label for="tj_rec">Plan recomendado</label><select id="tj_rec"><option value="">Ninguno</option>${r.propuestas.map(p=>`<option value="${esc(p.id)}" ${tj.recomendada===p.id?"selected":""}>${esc(p.titulo||"(sin título)")}</option>`).join("")}</select></div></div>
      <div class="pf"><label for="tj_t">Título</label><input id="tj_t" data-tj="titulo" value="${esc(tj.titulo)}" placeholder="${esc(TJ_TEXTOS.titulo)}"></div>
      <div class="pf"><label for="tj_x">Descripción</label><textarea id="tj_x" data-tj="texto" rows="2" placeholder="${esc(TJ_TEXTOS.texto)}">${esc(tj.texto)}</textarea></div>
      <p class="rhint">Se guardan solos. El recomendado lleva la etiqueta "Recomendado" y queda destacado; con "Ninguno", todos se ven iguales.</p></section>
    <div class="cf-grid" id="rptPropList">
      ${r.propuestas.map((p,i)=>{ const inc=(p.bullets||[]).slice(0,3);
        return `<div class="cf-prop${tj.recomendada===p.id?" rec":""}"><button type="button" class="cf-prop-open" data-i="${i}" aria-label="Editar ${esc(p.titulo||"propuesta")}">
          ${tj.recomendada===p.id?`<span class="cf-prop-rec">Recomendado</span>`:""}<span class="cf-prop-tag">${p.tipo==="mensual"?"Plan fijo mensual":"Precio fijo"}</span>
          <b class="cf-prop-t">${esc(p.titulo||"(sin título)")}</b>
          <span class="cf-prop-price">${esc(p.precioModo==="adefinir"?"A definir":propPriceLine(p))}</span>
          ${inc.length?`<ul>${inc.map(x=>`<li>${esc(x)}</li>`).join("")}${(p.bullets||[]).length>3?`<li class="mas">+${p.bullets.length-3} más</li>`:""}</ul>`:""}
        </button>
        <div class="cf-prop-ord"><span>${i+1} de ${n}</span><button type="button" class="icon-btn sm" data-mv="-1" data-i="${i}" aria-label="Mover antes" ${i===0?"disabled":""}>${chevL}</button><button type="button" class="icon-btn sm" data-mv="1" data-i="${i}" aria-label="Mover después" ${i===n-1?"disabled":""}>${chevR}</button></div></div>`; }).join("")}
      <button type="button" class="cf-prop-new" id="rptAddProp"><span class="cf-plus">${plus()}</span><b>Nueva propuesta</b><small>Precio fijo o plan mensual</small></button>
    </div></div>`;
  main.querySelector("#rptAddProp").onclick=()=>{ st.edit={idx:null}; pintar(c,est); };
  main.querySelectorAll("[data-tj]").forEach(inp=>inp.oninput=()=>{ tj[inp.dataset.tj]=inp.value; saveReporte(est); });
  main.querySelector("#tj_rec").onchange=e=>{ tj.recomendada=e.target.value; saveReporte(est); pintar(c,est); };
  main.querySelector("#cfTjPrev").onclick=()=>openClientReport(est.id,{tjOpen:true});
  main.querySelectorAll(".cf-prop-open").forEach(b=>b.onclick=()=>{ st.edit={idx:+b.dataset.i}; pintar(c,est); });
  main.querySelectorAll("[data-mv]").forEach(b=>b.onclick=()=>{ const i=+b.dataset.i, j=i+(+b.dataset.mv), a=r.propuestas; if(j<0||j>=a.length) return;
    const [x]=a.splice(i,1); a.splice(j,0,x); saveReporte(est); pintar(c,est);
    const foco=main.querySelector(`[data-mv="${b.dataset.mv}"][data-i="${j}"]`); if(foco&&!foco.disabled) foco.focus(); });
}
function editorPropuesta(main,est,{idx},volver){
  const r=est.reporte, p=normalizePropuesta(idx==null?{}:Object.assign({},r.propuestas[idx]));
  const monedas=[["USD","US$ (dólar)"],["ARS","$ (peso arg.)"],["EUR","€ (euro)"]];
  const descField=([k,label])=>`<div class="pf" style="flex:1;min-width:120px"><label for="pr_d_${k}">${label} <span class="hint">%</span></label><input id="pr_d_${k}" type="number" min="0" max="100" step="1" value="${p.descuentos[k]!=null&&p.descuentos[k]!==""?esc(p.descuentos[k]):""}" placeholder="0"></div>`;
  const seg=(id,attr,opts,cur)=>`<div class="type-seg" id="${id}" role="radiogroup">${opts.map(([v,l])=>`<button type="button" class="seg ${cur===v?"on":""}" data-${attr}="${v}" role="radio" aria-checked="${cur===v}">${l}</button>`).join("")}</div>`;
  main.innerHTML=`<div class="cf-wrap">${atras("Propuestas de trabajo")}${cabecera(idx==null?"Nueva propuesta":"Editar propuesta")}
    <section class="cf-card">
      <div class="pf"><label for="pr_t">Título</label><input id="pr_t" value="${esc(p.titulo||"")}" placeholder="Ej: Plan mensual con fee fijo"></div>
      <div class="pf"><label>Tipo de propuesta</label>${seg("pr_tipo","t",[["fixed","Precio fijo"],["mensual","Plan fijo mensual"]],p.tipo)}</div>
      <div class="pf"><label for="pr_x">Descripción / beneficios</label><textarea id="pr_x" rows="3" placeholder="Qué gana el cliente con esta propuesta...">${esc(p.texto||"")}</textarea></div>
      <div class="pf"><label for="pr_b">Qué incluye <span class="hint">una por línea</span></label><textarea id="pr_b" rows="4" placeholder="Bloque fijo de horas por mes&#10;Reuniones de seguimiento&#10;Prioridad en la agenda">${esc((p.bullets||[]).join("\n"))}</textarea></div>
      <label class="chk"><input type="checkbox" id="pr_cta" ${p.cta===false?"":"checked"}> Mostrar el botón de reserva</label>
      <div class="pf" id="pr_btnWrap" ${p.cta===false?"hidden":""}><label for="pr_btn">Texto del botón</label><input id="pr_btn" maxlength="60" value="${esc(p.boton||"")}" placeholder="${esc(BOTON_RESERVA)}"></div>
    </section>
    <section class="cf-card"><div class="cf-lh"><h3>Preguntas frecuentes <span class="hint">opcional</span></h3><button type="button" class="btn-q" id="pr_faqAdd">${plus()} Agregar pregunta</button></div>
      <p class="rhint">Se ven debajo de las propuestas cuando el cliente elige esta.</p>
      <div class="cf-faq" id="pr_faq"></div></section>
    <section class="cf-card"><h3>Precio</h3>
      ${seg("pr_modo","m",[["monto","Monto"],["adefinir","A definir"]],p.precioModo)}
      <div class="pf-row" id="pr_montoWrap" ${p.precioModo==="adefinir"?"hidden":""}>
        <div class="pf"><label for="pr_moneda">Moneda</label><select id="pr_moneda">${monedas.map(m=>`<option value="${m[0]}" ${p.moneda===m[0]?"selected":""}>${m[1]}</option>`).join("")}</select></div>
        <div class="pf"><label for="pr_precio">Monto <span class="hint" id="pr_perMes" ${p.tipo==="mensual"?"":"hidden"}>por mes</span></label><input id="pr_precio" type="number" min="0" step="1" value="${p.precio!=null&&p.precio!==""?esc(p.precio):""}" placeholder="0"></div>
      </div>
      <div id="pr_lanzWrap" ${p.precioModo==="adefinir"?"hidden":""}>
        <label class="chk"><input type="checkbox" id="pr_lanz_on" ${p.lanz&&p.lanz.on?"checked":""}> Mostrar descuento o promoción</label>
        <div id="pr_lanzFields" ${p.lanz&&p.lanz.on?"":"hidden"}>
          <div class="pf-row">
            <div class="pf"><label for="pr_lanz_antes">Precio anterior <span class="hint">opcional</span></label><input id="pr_lanz_antes" type="number" min="0" step="1" value="${p.lanz&&p.lanz.antes!=null?esc(p.lanz.antes):""}" placeholder="0"></div>
            <div class="pf"><label for="pr_lanz_hasta">Válido hasta <span class="hint">opcional</span></label><input id="pr_lanz_hasta" type="date" value="${esc(p.lanz&&p.lanz.hasta||"")}"></div>
            <div class="pf"><label>Cómo se ve</label><div class="hint" id="pr_lanz_prev" style="padding-top:8px;line-height:1.4"></div></div>
          </div>
          <p class="rhint">El monto de arriba es el precio final. Cargá un precio anterior <b>solo si lo cobraste de verdad</b>: mostrar un precio tachado que no existió puede considerarse publicidad engañosa. Con fecha, el cliente ve hasta cuándo vale y, pasada esa fecha, el descuento deja de mostrarse.</p>
        </div>
      </div>
    </section>
    <section class="cf-card"><h3>Descuentos por pago adelantado <span class="hint">opcional</span></h3>
      <div style="display:flex;flex-wrap:wrap;gap:10px">${PROP_DESC.map(descField).join("")}</div>
      <p class="rhint" id="pr_descHint"></p>
    </section>
    ${barra(idx!=null)}</div>`;
  const $=s=>main.querySelector(s);
  $("#cfBack").onclick=volver; $("#cfCancel").onclick=volver;
  const curTipo=()=>$("#pr_tipo .seg.on")?.dataset.t||"fixed";
  const updLanzPrev=()=>{ const prev=$("#pr_lanz_prev");
    const precio=Number($("#pr_precio").value), antes=Number($("#pr_lanz_antes").value), hasta=$("#pr_lanz_hasta").value, mon=$("#pr_moneda").value, per=curTipo()==="mensual"?" /mes":"";
    if(!precio){ prev.innerHTML='<span style="color:var(--faint)">Cargá el monto</span>'; return; }
    const tachado=antes>precio?'<span style="text-decoration:line-through;color:var(--faint)">'+esc(propMoney(mon,antes)+per)+'</span> ':"";
    const aviso=$("#pr_lanz_antes").value!==""&&!(antes>precio)?'<br><span style="color:var(--prob)">El precio anterior tiene que ser mayor que el monto.</span>':"";
    prev.innerHTML=tachado+'<b>'+esc(propMoney(mon,precio)+per)+'</b>'+(antes>precio?' <span>-'+Math.round((1-precio/antes)*100)+'%</span>':"")+(hasta?'<br>Válido hasta el '+esc(fechaLarga(hasta)):"")+aviso; };
  const updTipo=()=>{ const m=curTipo()==="mensual"; $("#pr_perMes").hidden=!m;
    $("#pr_descHint").textContent="Se muestra el total de cada período con su descuento y, si es de más de un mes, su valor por mes."; updLanzPrev(); };
  const segs=(sel,cb)=>main.querySelectorAll(sel+" .seg").forEach(s=>s.onclick=()=>{ main.querySelectorAll(sel+" .seg").forEach(y=>{ y.classList.remove("on"); y.setAttribute("aria-checked","false"); }); s.classList.add("on"); s.setAttribute("aria-checked","true"); cb(); });
  segs("#pr_tipo",updTipo);
  segs("#pr_modo",()=>{ const ad=$("#pr_modo .seg.on").dataset.m==="adefinir"; $("#pr_montoWrap").hidden=ad; $("#pr_lanzWrap").hidden=ad; });
  $("#pr_lanz_on").onchange=e=>{ $("#pr_lanzFields").hidden=!e.target.checked; updLanzPrev(); };
  $("#pr_lanz_antes").oninput=updLanzPrev; $("#pr_lanz_hasta").oninput=updLanzPrev; $("#pr_precio").oninput=updLanzPrev; $("#pr_moneda").onchange=updLanzPrev;
  $("#pr_cta").onchange=e=>{ $("#pr_btnWrap").hidden=!e.target.checked; };
  updTipo(); $("#pr_t").focus();
  // Preguntas frecuentes: pares pregunta/respuesta, con subir, bajar y quitar.
  const faq=(p.faq||[]).map(f=>({...f}));
  const pintarFaq=()=>{ const box=$("#pr_faq");
    box.innerHTML=faq.length?faq.map((f,i)=>`<div class="cf-faq-i"><div class="cf-faq-h"><span>Pregunta ${i+1}</span><span class="grow"></span>
        <button type="button" class="icon-btn sm" data-fmv="-1" data-fi="${i}" aria-label="Subir" ${i===0?"disabled":""}>${chevL}</button><button type="button" class="icon-btn sm" data-fmv="1" data-fi="${i}" aria-label="Bajar" ${i===faq.length-1?"disabled":""}>${chevR}</button>
        <button type="button" class="icon-btn sm" data-fdel="${i}" aria-label="Quitar pregunta ${i+1}">${trash()}</button></div>
      <div class="pf"><input data-fq="${i}" value="${esc(f.q)}" placeholder="¿Cuánto tarda?" aria-label="Pregunta ${i+1}"></div>
      <div class="pf"><textarea data-fa="${i}" rows="2" placeholder="Respuesta" aria-label="Respuesta ${i+1}">${esc(f.a)}</textarea></div></div>`).join("")
      :`<span class="rhint">Sin preguntas frecuentes.</span>`;
    box.querySelectorAll("[data-fq]").forEach(x=>x.oninput=()=>{ faq[+x.dataset.fq].q=x.value; });
    box.querySelectorAll("[data-fa]").forEach(x=>x.oninput=()=>{ faq[+x.dataset.fa].a=x.value; });
    box.querySelectorAll("[data-fdel]").forEach(b=>b.onclick=()=>{ faq.splice(+b.dataset.fdel,1); pintarFaq(); });
    box.querySelectorAll("[data-fmv]").forEach(b=>b.onclick=()=>{ const i=+b.dataset.fi, j=i+(+b.dataset.fmv); [faq[i],faq[j]]=[faq[j],faq[i]]; pintarFaq(); }); };
  $("#pr_faqAdd").onclick=()=>{ faq.push({q:"",a:""}); pintarFaq(); const ins=$("#pr_faq").querySelectorAll("[data-fq]"); ins[ins.length-1].focus(); };
  pintarFaq();
  $("#cfSave").onclick=()=>{
    const rec=normalizePropuesta({
      id:p.id||uid(), titulo:$("#pr_t").value.trim(), tipo:curTipo(), texto:$("#pr_x").value.trim(),
      bullets:$("#pr_b").value.split("\n").map(s=>s.trim()).filter(Boolean),
      boton:$("#pr_btn").value.trim(), cta:$("#pr_cta").checked, faq:faq.map(f=>({q:f.q.trim(),a:f.a.trim()})),
      precioModo:$("#pr_modo .seg.on")?.dataset.m||"adefinir", moneda:$("#pr_moneda").value,
      precio:$("#pr_precio").value!==""?Number($("#pr_precio").value):null,
      lanz:{on:$("#pr_lanz_on").checked,antes:$("#pr_lanz_antes").value!==""?Number($("#pr_lanz_antes").value):null,hasta:$("#pr_lanz_hasta").value||""},
      descuentos:PROP_DESC.reduce((o,[k])=>{ const v=$("#pr_d_"+k).value; o[k]=v!==""?Number(v):null; return o; },{})
    });
    if(!rec.titulo){ $("#pr_t").focus(); return toast("Poné un título"); }
    if(idx==null) r.propuestas.push(rec); else r.propuestas[idx]=rec;
    saveReporte(est); toast(idx==null?"Propuesta creada":"Propuesta guardada"); volver();
  };
  eliminar(main,"¿Eliminar esta propuesta?",()=>{ const [x]=r.propuestas.splice(idx,1); if(x&&r.tj&&r.tj.recomendada===x.id) r.tj.recomendada=""; saveReporte(est); toast("Propuesta eliminada"); volver(); });
}
