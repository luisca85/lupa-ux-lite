import { render } from "../app/render.js";
import { SEVERIDAD, TIPOS } from "../core/catalogo-base.js";
import { allHeur, allSesgos, heurById, state } from "../core/state.js";
import { esc, uid } from "../core/util.js";
import { store } from "../data/store.js";
import { flowStore } from "../flujos/flujos.js";
import { compositeThumb, mountAnnotator } from "../ui/anotaciones.js";
import { bigIco, camIco, chevL, plus, trash, x } from "../ui/iconos.js";
import { processImage } from "../ui/imagenes.js";
import { openConfirm, openModal, toast } from "../ui/modales.js";

/* ============ Vista: Hallazgos ============ */
export function renderHallazgosInto(c,est){
  if(state.hzPage) return renderHzPage(c);
  // Área de trabajo (pantallas con pines: todavía sin modelo) + panel derecho de hallazgos.
  c.classList.add("hz-ws-host");
  c.innerHTML=`<div class="hz-ws">
    <section class="hz-stage" aria-label="Área de trabajo">
      <div class="hz-stage-bar"><div class="spacer"></div><button class="btn sel" id="newHz">${plus()} Agregar hallazgo</button></div>
      <div class="empty hz-stage-empty">${bigIco("report")}
        <div><h3>Este estudio todavía no tiene pantallas</h3>
        <p>Empezá cargando la primera pantalla del sitio o de la app, acá abajo o con el botón + de arriba. Después hacés clic sobre la imagen para ubicar cada hallazgo con un pin.</p></div>
        <button class="btn" id="hzUpload">Subir imagen</button>
      </div>
    </section>
    <aside class="hz-panel" id="hzPanel" aria-label="Panel de hallazgos"></aside>
  </div>`;
  document.getElementById("newHz").onclick=()=>openHzPage(null);
  document.getElementById("hzUpload").onclick=()=>openHzPage(null);
  renderHzPanel();
}
const PANEL_TIPOS=[["todos","Todas"],["Problema","Problemas"],["Oportunidad","Oportunidades"],["Observación","Observaciones"]];
function hzMeta(h){ const x=(h.heuristicas||[]).map(heurById).find(Boolean); return [h.tipo,h.severidad!=null&&h.severidad!==""?`Sev. ${h.severidad}`:"",x?x.nombre:""].filter(Boolean).join("  ·  "); }
function renderHzPanel(){
  const el=document.getElementById("hzPanel"); if(!el) return;
  if(state.hzPanel==="catalogo") return renderPanelCatalogo(el);
  const all=state.hallazgos;
  const list=all.filter(h=>state.hzTipo==="todos"||h.tipo===state.hzTipo);
  if(!list.some(h=>h.id===state.hzSel)) state.hzSel=list[0]?list[0].id:null;
  const sel=list.find(h=>h.id===state.hzSel)||null;
  const n=list.indexOf(sel)+1;
  el.innerHTML=`<div class="hp-top">
      <div><h2>Hallazgos</h2><p>${all.length} en el estudio</p></div>
      <button class="btn-sec" id="hpCat">Catálogo <span class="fig-ico ico-ir" aria-hidden="true"></span></button>
    </div>
    <div class="hp-filters" role="group" aria-label="Filtrar por tipo">${PANEL_TIPOS.map(([v,l])=>`<button class="chip-f ${state.hzTipo===v?'on':''}" data-f="${v}" aria-pressed="${state.hzTipo===v}">${l}</button>`).join("")}</div>
    ${!all.length?`<div class="hp-empty"><b>Sin hallazgos todavía</b><span>Cuando agregues una pantalla, tus hallazgos aparecerán acá.</span></div>`
      :!list.length?`<div class="hp-empty"><span>Ningún hallazgo de este tipo.</span></div>`
      :`<div class="hp-list scroll">${list.map((h,i)=>`<button class="hp-card ${h.id===state.hzSel?'on':''}" data-hz="${h.id}"><span class="hp-pin">${i+1}</span><span class="hp-det"><span class="t">${esc(h.titulo||"(sin título)")}</span><span class="m">${esc(hzMeta(h))}</span></span></button>`).join("")}</div>`}
    ${sel?`<form class="hp-edit" id="hpEdit">
      <div class="hp-edit-h"><h3>Editar hallazgo ${n}</h3><span>${esc(sel.pantalla||"")}</span></div>
      <div class="pf"><label for="hpTit">Título</label><input id="hpTit" value="${esc(sel.titulo||"")}"></div>
      <div class="pf"><label for="hpDesc">Descripción</label><textarea id="hpDesc">${esc(sel.descripcion||"")}</textarea></div>
      <div class="pf"><label>Severidad · 0 a 4</label><div class="sev-scale" id="hpSev">${[0,1,2,3,4].map(v=>`<button type="button" class="${sel.severidad===v?'on':''}" data-s="${v}" title="${SEVERIDAD[v].label}">${v}</button>`).join("")}</div></div>
      <div class="pf-row">
        <div class="pf"><label for="hpTipo">Tipo</label><select id="hpTipo">${TIPOS.map(t=>`<option ${sel.tipo===t?'selected':''}>${t}</option>`).join("")}</select></div>
        <div class="pf"><label for="hpPant">Pantalla</label><input id="hpPant" value="${esc(sel.pantalla||"")}" placeholder="Ej: Landing page"></div>
      </div>
      <div class="pf"><label for="hpHeur">Entradas del catálogo</label><select id="hpHeur"><option value="">Sin heurística</option>${allHeur().map(x=>`<option value="${x.id}" ${(sel.heuristicas||[])[0]===x.id?'selected':''}>${esc(x.nombre)}</option>`).join("")}</select></div>
      <div class="hp-acts"><button type="submit" class="btn sel" id="hpSave">Guardar cambios</button><button type="button" class="btn" id="hpCancel">Cancelar</button><div class="spacer"></div><button type="button" class="btn ghost sm" id="hpMore">Más campos</button><button type="button" class="icon-btn hp-del" id="hpDel" title="Eliminar hallazgo" aria-label="Eliminar hallazgo">${trash()}</button></div>
    </form>`:""}`;
  document.getElementById("hpCat").onclick=()=>{state.hzPanel="catalogo";renderHzPanel();};
  el.querySelectorAll(".chip-f").forEach(b=>b.onclick=()=>{state.hzTipo=b.dataset.f;state.hzSev="todos";renderHzPanel();});
  el.querySelectorAll(".hp-card").forEach(b=>b.onclick=()=>{state.hzSel=b.dataset.hz;renderHzPanel();});
  if(!sel) return;
  let sev=sel.severidad??null;
  el.querySelectorAll("#hpSev button").forEach(b=>b.onclick=()=>{sev=(String(sev)===b.dataset.s)?null:Number(b.dataset.s);el.querySelectorAll("#hpSev button").forEach(x=>x.classList.toggle("on",String(sev)===x.dataset.s));});
  document.getElementById("hpCancel").onclick=()=>renderHzPanel();
  document.getElementById("hpMore").onclick=()=>hzModal(sel);
  document.getElementById("hpDel").onclick=()=>confirmDelHz(sel.id);
  document.getElementById("hpEdit").onsubmit=async e=>{
    e.preventDefault();
    const titulo=document.getElementById("hpTit").value.trim(); if(!titulo){document.getElementById("hpTit").focus();return;}
    const heur=document.getElementById("hpHeur").value;
    const rec={...sel,titulo,descripcion:document.getElementById("hpDesc").value.trim(),severidad:sev,tipo:document.getElementById("hpTipo").value,pantalla:document.getElementById("hpPant").value.trim(),
      heuristicas:heur?[heur,...(sel.heuristicas||[]).filter(x=>x!==heur)]:(sel.heuristicas||[]).slice(1)};
    const btn=document.getElementById("hpSave"); btn.disabled=true;
    try{ await store.saveHallazgo(state.activeId,rec); state.hallazgos=await store.listHallazgos(state.activeId); toast("Hallazgo actualizado"); renderHzPanel(); }
    catch(err){ console.error("hpSave",err); toast("No se pudo guardar. Probá de nuevo."); btn.disabled=false; }
  };
}
function renderPanelCatalogo(el){
  const tab=state.hzCatTab||"heur";
  const items=tab==="heur"?allHeur().map(h=>({t:`${h.num}. ${h.nombre}`,d:h.desc,src:h.src})):allSesgos().map(x=>({t:x.nombre,d:x.desc,src:x.categoria||(x.custom?"Propio":"")}));
  el.innerHTML=`<div class="hp-top">
      <div class="hp-back-row"><button class="icon-btn sh-backbtn" id="hpBack" title="Volver a hallazgos" aria-label="Volver a hallazgos"><span class="fig-ico ico-volver" aria-hidden="true"></span></button><div><h2>Catálogo</h2><p>Heurísticas y sesgos para fundamentar los hallazgos</p></div></div>
    </div>
    <div class="hp-filters" role="group" aria-label="Sección del catálogo"><button class="chip-f ${tab==="heur"?'on':''}" data-c="heur">Heurísticas</button><button class="chip-f ${tab==="sesgo"?'on':''}" data-c="sesgo">Sesgos y patrones</button></div>
    <div class="hp-list">${items.map(i=>`<div class="hp-card static"><span class="hp-det"><span class="t">${esc(i.t)}</span><span class="m">${esc(i.d||"")}</span>${i.src?`<span class="s">${esc(i.src)}</span>`:""}</span></div>`).join("")}</div>`;
  document.getElementById("hpBack").onclick=()=>{state.hzPanel="lista";renderHzPanel();};
  el.querySelectorAll("[data-c]").forEach(b=>b.onclick=()=>{state.hzCatTab=b.dataset.c;renderPanelCatalogo(el);});
}
export function hzModal(h,ctx){
  const ed=hzEditor(h,ctx);
  openModal(`${ed.isNew?"Nuevo":"Editar"} hallazgo`,ed.body,ed.save,"hz-modal",ed.cleanup);
  ed.bind();
}
/* Alta de hallazgo como página dentro del panel de trabajo (no modal). */
export function openHzPage(h){ state.hzPage={h:h||null}; state.studyTab="hallazgos"; render(); window.scrollTo(0,0); }
export function closeHzPage(){ if(window._hzPageCleanup){ window._hzPageCleanup(); window._hzPageCleanup=null; } state.hzPage=null; }
function renderHzPage(c){
  const ed=hzEditor(state.hzPage.h,{page:true});
  c.innerHTML=`<div class="hz-page">
    <div class="hzp-head">
      <button class="sh-back" id="hzpBack">${chevL()} Hallazgos</button>
      <div class="hzp-title"><h2>${ed.isNew?"Nuevo":"Editar"} hallazgo</h2><p>Registrá qué se observó, su severidad y la evidencia.</p></div>
    </div>
    <div class="hzp-card">${ed.body}</div>
    <div class="hzp-bar"><span class="hzp-hint">Pegá capturas con <kbd>Ctrl/Cmd</kbd> + <kbd>V</kbd> en cualquier momento.</span><div class="spacer"></div>
      <button class="btn ghost" id="hzpCancel">Cancelar</button><button class="btn primary" id="hzpSave">Guardar hallazgo</button></div>
  </div>`;
  window._hzPageCleanup=ed.cleanup;
  const salir=()=>{ closeHzPage(); render(); window.scrollTo(0,0); };
  document.getElementById("hzpBack").onclick=salir;
  document.getElementById("hzpCancel").onclick=salir;
  document.getElementById("hzpSave").onclick=async()=>{
    const btn=document.getElementById("hzpSave"); btn.disabled=true;
    let ok;
    try{ ok=await ed.save(); }
    catch(e){ console.error("hzPage",e); toast((e&&e.message)||"No se pudo guardar. Probá de nuevo."); ok=false; }
    if(ok===false) btn.disabled=false;
  };
  ed.bind();
}
function hzEditor(h,ctx){
  ctx=ctx||null;
  const isNew=!h; h=h||{tipo:"Problema",severidad:3,heuristicas:[],sesgos:[],tags:[]};
  const sel={tipo:h.tipo,sev:(h.severidad??""),heur:new Set(h.heuristicas||[]),sesgos:new Set(h.sesgos||[])};
  let imgs=(h.imgs||[]).map(im=>({...im})); let removed=[]; let pasteHandler=null; let act=-1; const MAXI=8;
  const origIds=new Set((h.imgs||[]).map(im=>im.id));
  const hzId=h.id||uid(); // fijo al abrir: si guardar falla y se reintenta, no se duplica
  const left=`
    <div class="field"><label>Tipo de hallazgo</label>
      <div class="type-seg" id="typeSeg">${TIPOS.map(t=>`<button type="button" class="seg ${sel.tipo===t?'on':''}" data-t="${t}">${t}</button>`).join("")}</div></div>
    <div class="field"><label>Título</label><input id="z_tit" value="${esc(h.titulo||"")}" placeholder="Resumen del hallazgo en una línea"></div>
    <div class="row2">
      <div class="field"><label>Pantalla o paso <span class="opt">opcional</span></label><input id="z_pant" value="${esc(h.pantalla||"")}" placeholder="Ej: Paso 2 · Datos personales"></div>
      <div class="field"><label>Etiquetas <span class="opt">separadas por coma</span></label><input id="z_tags" value="${esc((h.tags||[]).join(", "))}" placeholder="formulario, mobile, conversión"></div>
    </div>
    <div class="field" id="sevField"><label>Severidad <span class="opt">escala de Nielsen</span></label>
      <div class="sev-picker" id="sevPick">${SEVERIDAD.map(s=>`<button type="button" class="sev-opt ${String(sel.sev)===String(s.n)?'on':''}" data-s="${s.n}" style="--c:var(${s.v})" title="${s.desc}"><div class="sn">${s.n}</div><div class="sl">${s.label}</div></button>`).join("")}</div></div>
    <div class="field"><label>Descripción</label><textarea id="z_desc" placeholder="Qué se observó y por qué es relevante...">${esc(h.descripcion||"")}</textarea></div>
    <div class="field"><label>Recomendación <span class="opt">opcional</span></label><textarea id="z_reco" placeholder="Qué se propone hacer...">${esc(h.recomendacion||"")}</textarea></div>
    <div class="field"><label>Heurísticas relacionadas</label>
      <div class="multi" id="mHeur">${allHeur().map(x=>`<button type="button" class="mchip ${sel.heur.has(x.id)?'on':''}" data-id="${x.id}">${x.num}. ${esc(x.nombre)}</button>`).join("")}</div></div>
    <div class="field"><label>Sesgos y patrones relacionados</label>
      <div class="multi" id="mSesgo">${allSesgos().map(x=>`<button type="button" class="mchip s ${sel.sesgos.has(x.id)?'on':''}" data-id="${x.id}">${esc(x.nombre)}</button>`).join("")}</div></div>`;
  const body=`<div class="hz-2col">
    <div class="hz-left">${left}</div>
    <div class="hz-right">
      <div class="hz-ev-head">
        <div class="hz-strip" id="evStrip"></div>
        <button type="button" class="btn ghost sm" id="evAdd">${plus()} Imagen</button>
        <input type="file" id="pasteFile" accept="image/*" multiple hidden>
      </div>
      <div class="hz-ev-body" id="evBody"></div>
    </div>
  </div>`;
  const save=async()=>{
    const titulo=document.getElementById("z_tit").value.trim();
    if(!titulo){document.getElementById("z_tit").focus();return false;}
    const rec={ id:hzId, tipo:sel.tipo, titulo,
      pantalla:document.getElementById("z_pant").value.trim(),
      severidad:sel.sev===""?null:Number(sel.sev),
      descripcion:document.getElementById("z_desc").value.trim(),
      recomendacion:document.getElementById("z_reco").value.trim(),
      tags:document.getElementById("z_tags").value.split(",").map(t=>t.trim()).filter(Boolean),
      heuristicas:[...sel.heur], sesgos:[...sel.sesgos],
      createdAt:h.createdAt||Date.now() };
    if(h.flujoId){rec.flujoId=h.flujoId;rec.interaccionId=h.interaccionId;rec.interaccionTitulo=h.interaccionTitulo;}
    const sid=state.activeId, hid=rec.id;
    for(const im of imgs){ if(im._full){ if(!im.thumb||im._dirty){ try{im.thumb=await compositeThumb({base:im._full,w:im.w,h:im.h,ann:im.ann||[]},220);}catch(e){} } await store.putFull(sid,hid,im.id,{full:im._full,w:im.w,h:im.h,ann:im.ann||[],createdAt:Date.now()}); } }
    for(const rid of removed){ await store.delFull(sid,hid,rid); }
    rec.imgs=imgs.map(im=>({id:im.id,thumb:im.thumb,w:im.w,h:im.h}));
    await store.saveHallazgo(sid,rec);
    state.hallazgos=await store.listHallazgos(sid);
    if(ctx&&ctx.onSaved)await ctx.onSaved(rec.id);
    if(ctx&&ctx.page){ closeHzPage(); window.scrollTo(0,0); }
    toast(isNew?"Hallazgo registrado":"Hallazgo actualizado"); render(); return true;
  };
  const cleanup=()=>{if(pasteHandler)document.removeEventListener("paste",pasteHandler);if(window._annResize){window.removeEventListener("resize",window._annResize);window._annResize=null;}};
  const bind=()=>{
  // interacciones columna izquierda
  const seg=document.getElementById("typeSeg");
  seg.querySelectorAll(".seg").forEach(b=>b.onclick=()=>{sel.tipo=b.dataset.t;seg.querySelectorAll(".seg").forEach(x=>x.classList.toggle("on",x===b));});
  document.getElementById("sevPick").querySelectorAll(".sev-opt").forEach(b=>b.onclick=()=>{
    const v=b.dataset.s;
    if(String(sel.sev)===String(v)){sel.sev="";b.classList.remove("on");}
    else{sel.sev=v;document.getElementById("sevPick").querySelectorAll(".sev-opt").forEach(x=>x.classList.toggle("on",x===b));}
  });
  document.getElementById("mHeur").querySelectorAll(".mchip").forEach(b=>b.onclick=()=>{const id=b.dataset.id;sel.heur.has(id)?sel.heur.delete(id):sel.heur.add(id);b.classList.toggle("on");});
  document.getElementById("mSesgo").querySelectorAll(".mchip").forEach(b=>b.onclick=()=>{const id=b.dataset.id;sel.sesgos.has(id)?sel.sesgos.delete(id):sel.sesgos.add(id);b.classList.toggle("on");});
  // panel de evidencia (columna derecha)
  const evStrip=document.getElementById("evStrip"), evBody=document.getElementById("evBody"), fileInput=document.getElementById("pasteFile");
  function renderStrip(){
    evStrip.innerHTML=imgs.map((im,idx)=>`<button type="button" class="ev-tab ${idx===act?'on':''}" data-i="${idx}"><img src="${im.thumb}" alt="Evidencia ${idx+1}"><span class="rm" data-rm="${idx}" title="Quitar">${x()}</span></button>`).join("")
      || `<span class="ev-strip-empty">Sin imágenes</span>`;
    evStrip.querySelectorAll(".ev-tab").forEach(b=>b.onclick=e=>{if(e.target.closest(".rm"))return;selectImage(+b.dataset.i);});
    evStrip.querySelectorAll(".rm").forEach(b=>b.onclick=e=>{e.stopPropagation();const idx=+b.dataset.rm;const im=imgs[idx];if(im&&origIds.has(im.id))removed.push(im.id);imgs.splice(idx,1);if(act>=imgs.length)act=imgs.length-1;if(act<0){renderStrip();renderEmpty();}else selectImage(act);});
  }
  function renderEmpty(){
    evBody.innerHTML=`<div class="ev-drop" id="evDrop" tabindex="0">${camIco()}
      <div class="pz-main">Pegá una captura con <kbd>Ctrl/Cmd</kbd> + <kbd>V</kbd></div>
      <div class="pz-sub">o arrastrala acá, o hacé clic para elegir un archivo</div></div>`;
    const drop=document.getElementById("evDrop");
    drop.onclick=()=>fileInput.click();
    drop.ondragover=e=>{e.preventDefault();drop.classList.add("drag");};
    drop.ondragleave=()=>drop.classList.remove("drag");
    drop.ondrop=async e=>{e.preventDefault();drop.classList.remove("drag");const fs=e.dataTransfer&&e.dataTransfer.files;if(fs)for(const f of fs){if(f.type.indexOf("image")===0)await addImage(f);}};
  }
  function selectImage(i){
    act=i; renderStrip();
    const im=imgs[i]; if(!im){renderEmpty();return;}
    evBody.innerHTML=`<div class="ev-loading">Cargando imagen...</div>`;
    (async()=>{
      let d = im._full ? {base:im._full,w:im.w,h:im.h,ann:im.ann||[]} : await store.getImg(state.activeId,h.id,im.id);
      if(!d){evBody.innerHTML=`<div class="ev-loading">No se pudo abrir la imagen.</div>`;return;}
      im._full=d.base; im.w=d.w; im.h=d.h; if(!im.ann)im.ann=d.ann||[];
      if(act!==i)return;
      mountAnnotator(evBody,{base:im._full,w:im.w,h:im.h,ann:im.ann},{onChange:(newAnn)=>{im.ann=newAnn;im._dirty=true;scheduleThumb(im);}});
    })();
  }
  function scheduleThumb(im){clearTimeout(im._tt);im._tt=setTimeout(async()=>{try{im.thumb=await compositeThumb({base:im._full,w:im.w,h:im.h,ann:im.ann||[]},220);im._dirty=false;renderStrip();}catch(e){}},600);}
  async function addImage(blob){
    if(imgs.length>=MAXI){toast("Máximo "+MAXI+" imágenes por hallazgo");return;}
    try{const r=await processImage(blob);const im={id:uid(),thumb:r.thumb.dataUrl,w:r.full.w,h:r.full.h,_full:r.full.dataUrl,ann:[]};imgs.push(im);selectImage(imgs.length-1);toast("Imagen agregada");}
    catch(e){toast("No se pudo procesar la imagen");}
  }
  document.getElementById("evAdd").onclick=()=>fileInput.click();
  fileInput.onchange=async e=>{for(const f of e.target.files){if(f.type.indexOf("image")===0)await addImage(f);}fileInput.value="";};
  pasteHandler=async e=>{const items=e.clipboardData&&e.clipboardData.items;if(!items)return;for(const it of items){if(it.type&&it.type.indexOf("image")===0){e.preventDefault();const b=it.getAsFile();if(b)await addImage(b);break;}}};
  document.addEventListener("paste",pasteHandler);
  renderStrip();
  if(imgs.length){selectImage(0);}else{renderEmpty();}
  setTimeout(()=>document.getElementById("z_tit").focus(),40);
  };
  return {isNew,body,save,cleanup,bind};
}
function confirmDelHz(id){
  const h=state.hallazgos.find(x=>x.id===id);
  openConfirm("Eliminar hallazgo",`Se elimina "<b>${esc(h.titulo)}</b>".`,async()=>{
    await store.delHallazgo(state.activeId,id);
    state.hallazgos=await store.listHallazgos(state.activeId);
    await cleanFlowMarkers(state.activeId,id);
    toast("Hallazgo eliminado"); render();
  });
}
async function cleanFlowMarkers(sid,hallazgoId){
  try{
    const flows=(state._flujosFor===sid)?state.flujos:await flowStore.list(sid);
    for(const f of flows){
      let changed=false;
      (f.nodes||[]).forEach(n=>{const before=(n.markers||[]).length;n.markers=(n.markers||[]).filter(m=>m.hallazgoId!==hallazgoId);if(n.markers.length!==before)changed=true;});
      if(changed)await flowStore.save(sid,f);
    }
    if(state._flujosFor===sid)state.flujos=flows;
  }catch(e){}
}
