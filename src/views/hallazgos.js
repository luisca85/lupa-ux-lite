import { render } from "../app/render.js";
import { renderWorkspace } from "./hallazgos-ws.js";
import { SEVERIDAD } from "../core/catalogo-base.js";
import { allHeur, allSesgos, catalogoIdsDe, heurById, state } from "../core/state.js";
import { esc, uid } from "../core/util.js";
import { MODELO, clamp01, normalizarPin, nuevoHallazgo, pantallaDesdeImagen, pantallaStore, pinNumero } from "../data/pantallas.js";
import { store } from "../data/store.js";
import { flowStore } from "../flujos/flujos.js";
import { camIco, chevL, plus } from "../ui/iconos.js";
import { processImage } from "../ui/imagenes.js";
import { openConfirm, openModal, toast } from "../ui/modales.js";

/* ============ Vista: Hallazgos ============ */
export function renderHallazgosInto(c,est){
  if(state.hzPage) return renderHzPage(c);
  renderWorkspace(c);
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
  const isNew=!h||!h.id; h=h||nuevoHallazgo();
  const ids=catalogoIdsDe(h);
  const sel={tipo:h.tipo||"Problema",sev:(h.severidad??""),categoria:h.categoria||"",heur:new Set(ids.filter(id=>heurById(id))),sesgos:new Set(ids.filter(id=>!heurById(id))),
    pantallaId:h.pantallaId||null,pin:h.pin?{...h.pin}:null};
  let pasteHandler=null;
  const hzId=h.id||uid(); // fijo al abrir: si guardar falla y se reintenta, no se duplica
  const left=`
    <div class="field"><label>Título</label><input id="z_tit" value="${esc(h.titulo||"")}" placeholder="Resumen del hallazgo en una línea"></div>
    <div class="row2">
      <div class="field"><label>Ubicación o paso <span class="opt">opcional, texto</span></label><input id="z_pant" value="${esc(h.pantalla||"")}" placeholder="Ej: Paso 2 · Datos personales"></div>
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
        <select id="evPant" aria-label="Pantalla del hallazgo"></select>
        <button type="button" class="btn ghost sm" id="evAdd">${plus()} Imagen</button>
        <input type="file" id="pasteFile" accept="image/*" hidden>
      </div>
      <div class="hz-ev-body" id="evBody"></div>
    </div>
  </div>`;
  const save=async()=>{
    const titulo=document.getElementById("z_tit").value.trim();
    if(!titulo){document.getElementById("z_tit").focus();return false;}
    const rec={ ...h, id:hzId, tipo:h.tipo||"Problema", titulo,
      pantalla:document.getElementById("z_pant").value.trim(),
      severidad:sel.sev===""?null:Number(sel.sev),
      descripcion:document.getElementById("z_desc").value.trim(),
      recomendacion:document.getElementById("z_reco").value.trim(),
      tags:document.getElementById("z_tags").value.split(",").map(t=>t.trim()).filter(Boolean),
      catalogoIds:[...sel.heur,...sel.sesgos],
      pantallaId:sel.pantallaId, pin:sel.pin,
      createdAt:h.createdAt||Date.now(), modelo:MODELO };
    delete rec.heuristicas; delete rec.sesgos; delete rec.imgs;
    normalizarPin(rec);
    const sid=state.activeId;
    await store.saveHallazgo(sid,rec);
    state.hallazgos=await store.listHallazgos(sid);
    if(ctx&&ctx.onSaved)await ctx.onSaved(rec.id);
    if(ctx&&ctx.page){ closeHzPage(); window.scrollTo(0,0); }
    toast(isNew?"Hallazgo registrado":"Hallazgo actualizado"); render(); return true;
  };
  const cleanup=()=>{if(pasteHandler)document.removeEventListener("paste",pasteHandler);};
  const bind=()=>{
  document.getElementById("sevPick").querySelectorAll(".sev-opt").forEach(b=>b.onclick=()=>{
    const v=b.dataset.s;
    if(String(sel.sev)===String(v)){sel.sev="";b.classList.remove("on");}
    else{sel.sev=v;document.getElementById("sevPick").querySelectorAll(".sev-opt").forEach(x=>x.classList.toggle("on",x===b));}
  });
  document.getElementById("mHeur").querySelectorAll(".mchip").forEach(b=>b.onclick=()=>{const id=b.dataset.id;sel.heur.has(id)?sel.heur.delete(id):sel.heur.add(id);b.classList.toggle("on");});
  document.getElementById("mSesgo").querySelectorAll(".mchip").forEach(b=>b.onclick=()=>{const id=b.dataset.id;sel.sesgos.has(id)?sel.sesgos.delete(id):sel.sesgos.add(id);b.classList.toggle("on");});
  // Evidencia = pantalla del estudio + pin (modelo v2)
  const selPant=document.getElementById("evPant"), evBody=document.getElementById("evBody"), fileInput=document.getElementById("pasteFile");
  const fillSelect=()=>{ selPant.innerHTML=`<option value="">Sin pantalla (observación general)</option>`+(state.pantallas||[]).map(p=>`<option value="${p.id}" ${p.id===sel.pantallaId?'selected':''}>${esc(p.nombre)}</option>`).join(""); };
  const setPantalla=pid=>{ sel.pantallaId=pid||null; if(!sel.pantallaId) sel.pin=null; else if(!sel.pin) sel.pin={x:0.5,y:0.5}; fillSelect(); renderEv(); };
  function renderEmpty(){
    evBody.innerHTML=`<div class="ev-drop" id="evDrop" tabindex="0">${camIco()}
      <div class="pz-main">Pegá una captura con <kbd>Ctrl/Cmd</kbd> + <kbd>V</kbd></div>
      <div class="pz-sub">o arrastrala acá, o hacé clic para elegir un archivo. Se guarda como pantalla del estudio.</div></div>`;
    const drop=document.getElementById("evDrop");
    drop.onclick=()=>fileInput.click();
    drop.ondragover=e=>{e.preventDefault();drop.classList.add("drag");};
    drop.ondragleave=()=>drop.classList.remove("drag");
    drop.ondrop=async e=>{e.preventDefault();drop.classList.remove("drag");const f=e.dataTransfer&&[...e.dataTransfer.files].find(f=>f.type.indexOf("image")===0);if(f)await addImage(f);};
  }
  async function renderEv(){
    const p=sel.pantallaId&&(state.pantallas||[]).find(x=>x.id===sel.pantallaId);
    if(!p) return renderEmpty();
    evBody.innerHTML=`<div class="ev-loading">Cargando pantalla...</div>`;
    const d=await pantallaStore.getImg(state.activeId,p.id);
    if(sel.pantallaId!==p.id) return;
    if(!d){evBody.innerHTML=`<div class="ev-loading">No se pudo abrir la pantalla.</div>`;return;}
    const otros=state.hallazgos.filter(x=>x.pantallaId===p.id&&x.id!==hzId&&x.pin);
    evBody.innerHTML=`<div class="pin-wrap"><div class="pin-stage" id="pinStage"><img src="${d.base}" alt="${esc(p.nombre)}" draggable="false">
      ${otros.map(x=>`<span class="pin-dot otro" style="left:${x.pin.x*100}%;top:${x.pin.y*100}%" title="${esc(x.titulo||"")}">${pinNumero(x,state.hallazgos)||""}</span>`).join("")}
      <span class="pin-dot este" id="pinMe" style="left:${sel.pin.x*100}%;top:${sel.pin.y*100}%">${isNew?"•":(pinNumero({...h,pantallaId:p.id},state.hallazgos)||"•")}</span></div></div>
      <p class="pin-hint">Hacé clic en la pantalla para ubicar el pin de este hallazgo.</p>`;
    const stage=document.getElementById("pinStage"), me=document.getElementById("pinMe");
    stage.onclick=e=>{ const r=stage.getBoundingClientRect(); sel.pin={x:clamp01((e.clientX-r.left)/r.width),y:clamp01((e.clientY-r.top)/r.height)}; me.style.left=sel.pin.x*100+"%"; me.style.top=sel.pin.y*100+"%"; };
  }
  async function addImage(blob){
    try{
      const r=await processImage(blob);
      const nombre=(blob.name||"").replace(/\.[a-z0-9]+$/i,"");
      const {pantalla,existente}=await pantallaDesdeImagen(state.activeId,state.pantallas||[],r,nombre);
      if(!existente) state.pantallas=[...(state.pantallas||[]),pantalla];
      toast(existente?"Esa imagen ya estaba cargada: se usa la pantalla existente":"Pantalla agregada al estudio");
      sel.pin=null; setPantalla(pantalla.id);
    }catch(e){ console.error("addImage",e); toast("No se pudo procesar la imagen"); }
  }
  selPant.onchange=()=>setPantalla(selPant.value);
  document.getElementById("evAdd").onclick=()=>fileInput.click();
  fileInput.onchange=async e=>{const f=[...e.target.files].find(f=>f.type.indexOf("image")===0);if(f)await addImage(f);fileInput.value="";};
  pasteHandler=async e=>{const items=e.clipboardData&&e.clipboardData.items;if(!items)return;for(const it of items){if(it.type&&it.type.indexOf("image")===0){e.preventDefault();const b=it.getAsFile();if(b)await addImage(b);break;}}};
  document.addEventListener("paste",pasteHandler);
  fillSelect(); renderEv();
  setTimeout(()=>document.getElementById("z_tit").focus(),40);
  };
  return {isNew,body,save,cleanup,bind};
}
export function confirmDelHz(id){
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
      // Los pasos de journey también lo registran: se quita de ahí.
      (f.pasos||[]).forEach(p=>{ if((p.hallazgos||[]).includes(hallazgoId)){ p.hallazgos=p.hallazgos.filter(x=>x!==hallazgoId); changed=true; } });
      if(changed)await flowStore.save(sid,f);
    }
    if(state._flujosFor===sid)state.flujos=flows;
  }catch(e){}
}
