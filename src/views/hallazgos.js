import { render } from "../app/render.js";
import { SEVERIDAD, TIPOS } from "../core/catalogo-base.js";
import { allHeur, allSesgos, heurById, sesgoById, state } from "../core/state.js";
import { esc, uid } from "../core/util.js";
import { store } from "../data/store.js";
import { flowIco, flowStore } from "../flujos/flujos.js";
import { compositeThumb, mountAnnotator } from "../ui/anotaciones.js";
import { bigIco, camIco, pencil, plus, searchIco, trash, x } from "../ui/iconos.js";
import { hzThumbs, openHzLightbox, processImage } from "../ui/imagenes.js";
import { emptyInline, openConfirm, openModal, toast } from "../ui/modales.js";

/* ============ Vista: Hallazgos ============ */
export function renderHallazgosInto(c,est){
  const hz=state.hallazgos;
  const byTipo=t=>hz.filter(h=>h.tipo===t).length;
  const problemas=hz.filter(h=>h.tipo==="Problema");
  const sevCount=n=>problemas.filter(h=>h.severidad===n).length;
  c.innerHTML=`<div class="tab-actions"><div class="spacer"></div><button class="btn primary" id="newHz">${plus()} Nuevo hallazgo</button></div>

  <div class="hz-summary">
    <div class="stat-tile"><div class="n">${hz.length}</div><div class="l">Total</div></div>
    <div class="stat-tile"><div class="n" style="color:var(--prob)">${byTipo("Problema")}</div><div class="l">Problemas</div></div>
    <div class="stat-tile"><div class="n" style="color:var(--opor)">${byTipo("Oportunidad")}</div><div class="l">Oportunidades</div></div>
    <div class="stat-tile"><div class="n" style="color:var(--obs)">${byTipo("Observación")}</div><div class="l">Observaciones</div></div>
    <div style="width:1px;background:var(--line);margin:2px 4px"></div>
    ${[3,4].map(n=>`<div class="stat-tile sev" style="--c:var(${SEVERIDAD[n].v})"><div class="n">${sevCount(n)}</div><div class="l">Sev ${n} · ${SEVERIDAD[n].label}</div></div>`).join("")}
  </div>

  <div class="hz-filters">
    <div class="search" style="max-width:220px">${searchIco()}<input id="hzSearch" placeholder="Buscar hallazgo..." value="${esc(state.hzQuery)}"></div>
    <select id="fTipo"><option value="todos">Todos los tipos</option>${TIPOS.map(t=>`<option ${state.hzTipo===t?'selected':''}>${t}</option>`).join("")}</select>
    <select id="fSev"><option value="todos">Toda severidad</option>${SEVERIDAD.map(s=>`<option value="${s.n}" ${state.hzSev==s.n?'selected':''}>Sev ${s.n} · ${s.label}</option>`).join("")}</select>
    <select id="fHeur"><option value="todos">Toda heurística</option>${allHeur().map(h=>`<option value="${h.id}" ${state.hzHeur===h.id?'selected':''}>${esc(h.nombre)}</option>`).join("")}</select>
  </div>
  <div class="hz-list" id="hzList"></div>`;

  document.getElementById("newHz").onclick=()=>hzModal(null);
  document.getElementById("hzSearch").oninput=e=>{state.hzQuery=e.target.value;renderHzList();};
  document.getElementById("fTipo").onchange=e=>{state.hzTipo=e.target.value;renderHzList();};
  document.getElementById("fSev").onchange=e=>{state.hzSev=e.target.value;renderHzList();};
  document.getElementById("fHeur").onchange=e=>{state.hzHeur=e.target.value;renderHzList();};
  renderHzList();
}
export function renderHzList(){
  const q=state.hzQuery.trim().toLowerCase();
  let list=state.hallazgos.filter(h=>{
    if(state.hzTipo!=="todos"&&h.tipo!==state.hzTipo)return false;
    if(state.hzSev!=="todos"&&String(h.severidad)!==String(state.hzSev))return false;
    if(state.hzHeur!=="todos"&&!(h.heuristicas||[]).includes(state.hzHeur))return false;
    if(q&&!((h.titulo+" "+(h.descripcion||"")+" "+(h.pantalla||"")+" "+(h.tags||[]).join(" ")).toLowerCase().includes(q)))return false;
    return true;
  });
  const order={Problema:0,Oportunidad:1,"Observación":2};
  list.sort((a,b)=>(order[a.tipo]-order[b.tipo])||((b.severidad??-1)-(a.severidad??-1)));
  const el=document.getElementById("hzList");
  if(!state.hallazgos.length){
    el.innerHTML=`<div class="empty">${bigIco('flag')}<h3>Sin hallazgos todavía</h3>
      <p>Registrá el primer problema, oportunidad u observación de este estudio.</p>
      <button class="btn primary" id="newHz2">${plus()} Nuevo hallazgo</button></div>`;
    document.getElementById("newHz2").onclick=()=>hzModal(null); return;
  }
  if(!list.length){ el.innerHTML=emptyInline("Ningún hallazgo coincide con los filtros."); return; }
  el.innerHTML=list.map(hzCard).join("");
  el.querySelectorAll("[data-hz]").forEach(c=>{
    c.querySelector(".edit").onclick=()=>hzModal(state.hallazgos.find(h=>h.id===c.dataset.hz));
    c.querySelector(".del").onclick=()=>confirmDelHz(c.dataset.hz);
    c.querySelectorAll(".hz-thumbs .t").forEach((t,idx)=>t.onclick=e=>{e.stopPropagation();openHzLightbox(c.dataset.hz,idx);});
    const moreB=c.querySelector(".hz-thumbs .more"); if(moreB)moreB.onclick=e=>{e.stopPropagation();openHzLightbox(c.dataset.hz,5);};
  });
}
function hzCard(h){
  const sev=(h.severidad!=null&&h.severidad!=="")?SEVERIDAD[h.severidad]:null;
  const c=sev?`var(${sev.v})`:(h.tipo==="Oportunidad"?"var(--opor)":"var(--line-strong)");
  const heurChips=(h.heuristicas||[]).map(id=>{const x=heurById(id);return x?`<span class="rel-chip h" title="Heurística">${esc(x.nombre)}</span>`:"";}).join("");
  const sesgoChips=(h.sesgos||[]).map(id=>{const x=sesgoById(id);return x?`<span class="rel-chip s" title="Sesgo / patrón">${esc(x.nombre)}</span>`:"";}).join("");
  const tags=(h.tags||[]).map(t=>`<span class="tag-chip">${esc(t)}</span>`).join("");
  return `<div class="card hz" data-hz="${h.id}" style="--c:${c}">
    <div class="stripe"></div>
    <div class="in">
      <div class="r1">
        <span class="type-chip type-${esc(h.tipo)}">${esc(h.tipo)}</span>
        ${sev?`<span class="sev-chip" style="background:var(${sev.v})">Sev ${sev.n} · ${sev.label}</span>`:""}
        <h4>${esc(h.titulo)}</h4>
        ${h.pantalla?`<span class="pantalla">${esc(h.pantalla)}</span>`:""}
      </div>
      ${h.descripcion?`<div class="desc">${esc(h.descripcion)}</div>`:""}
      ${h.recomendacion?`<div class="apl" style="margin-bottom:10px"><b style="font-family:var(--mono);font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--faint);display:block;margin-bottom:2px">Recomendación</b>${esc(h.recomendacion)}</div>`:""}
      ${(h.imgs&&h.imgs.length)?hzThumbs(h):""}
      <div class="rels">${h.flujoId?`<span class="rel-chip f" title="Interacción de un flujo">${flowIco()} ${esc(h.interaccionTitulo||"Flujo")}</span>`:""}${heurChips}${sesgoChips}${tags}</div>
    </div>
    <div class="actions">
      <button class="icon-btn sm edit" title="Editar" style="width:30px;height:30px">${pencil()}</button>
      <button class="icon-btn sm del" title="Eliminar" style="width:30px;height:30px">${trash()}</button>
    </div>
  </div>`;
}
export function hzModal(h,ctx){
  ctx=ctx||null;
  const isNew=!h; h=h||{tipo:"Problema",severidad:3,heuristicas:[],sesgos:[],tags:[]};
  const sel={tipo:h.tipo,sev:(h.severidad??""),heur:new Set(h.heuristicas||[]),sesgos:new Set(h.sesgos||[])};
  let imgs=(h.imgs||[]).map(im=>({...im})); let removed=[]; let pasteHandler=null; let act=-1; const MAXI=8;
  const origIds=new Set((h.imgs||[]).map(im=>im.id));
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
  openModal(`${isNew?"Nuevo":"Editar"} hallazgo`,body,async()=>{
    const titulo=document.getElementById("z_tit").value.trim();
    if(!titulo){document.getElementById("z_tit").focus();return false;}
    const rec={ id:h.id||uid(), tipo:sel.tipo, titulo,
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
    toast(isNew?"Hallazgo registrado":"Hallazgo actualizado"); render(); return true;
  },"hz-modal",()=>{if(pasteHandler)document.removeEventListener("paste",pasteHandler);if(window._annResize){window.removeEventListener("resize",window._annResize);window._annResize=null;}});
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
