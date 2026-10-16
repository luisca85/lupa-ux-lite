import { SEVERIDAD } from "../core/catalogo-base.js";
import { allHeur, allSesgos, catalogoIdsDe, heurById, state } from "../core/state.js";
import { esc, uid } from "../core/util.js";
import { MODELO, clamp01, hashStr, normalizarPin, nuevoHallazgo, pantallaDesdeImagen, pantallaStore, pinNumero } from "../data/pantallas.js";
import { store } from "../data/store.js";
import { flowStore } from "../flujos/flujos.js";
import { camIco, chevL, chevR } from "../ui/iconos.js";
import { processImage } from "../ui/imagenes.js";
import { openConfirm, openModal, toast } from "../ui/modales.js";
import { proximamente } from "./estudio.js";
import { confirmDelHz } from "./hallazgos.js";

/* ============ Hallazgos: área de trabajo con pantallas y pines + panel derecho ============
   Estado (core/state.js): hzGroup (id de la pantalla activa), hzQuick (popover {h, nuevo}),
   hzForm/hzFormNuevo (formulario de edición en el panel), hzSevF (filtro por severidad),
   hzPanel ("lista" | "catalogo"). Un clic en la captura crea un hallazgo: no hay modo "agregar". */
const imgCache=new Map();
const getImg=async(pid)=>{ const k=state.activeId+"/"+pid; if(!imgCache.has(k)) imgCache.set(k,pantallaStore.getImg(state.activeId,pid).catch(()=>null)); return imgCache.get(k); };
const $=id=>document.getElementById(id);
const pantallas=()=>state.pantallas||[];
const grupo=()=>state.hallazgos.filter(h=>h.pantallaId&&h.pantallaId===state.hzGroup);
const byNum=(a,b)=>((a.createdAt||0)-(b.createdAt||0))||String(a.id).localeCompare(String(b.id));
const autoTitulo=t=>{ const l=String(t||"").trim().split(/\n/)[0]; return l.length>90?l.slice(0,87)+"…":l; };
const pasoLabel=h=>{ if(!h.flujoId) return ""; const f=(state.flujos||[]).find(x=>x.id===h.flujoId); const n=f&&(f.nodes||[]).find(n=>n.id===(h.pasoId||h.interaccionId)); return n?n.titulo:(h.interaccionTitulo||""); };
const hzMeta=h=>{ const x=catalogoIdsDe(h).map(heurById).find(Boolean); return [h.severidad!=null&&h.severidad!==""?`Sev. ${h.severidad} · ${SEVERIDAD[h.severidad].label}`:"Sin severidad",x?x.nombre:"",proximamente("flujos")?"":pasoLabel(h)].filter(Boolean).join("  ·  "); };
const numDe=h=>h.pantallaId?(pinNumero(h,state.hallazgos)||"·"):"·";

export function renderWorkspace(c){
  if(state._flujosFor!==state.activeId){ // las interacciones de flujo se necesitan para "Paso de flujo"
    (async()=>{ try{ state.flujos=await flowStore.list(state.activeId); state._flujosFor=state.activeId; }catch(e){} if(state.studyTab==="hallazgos"&&$("hzPanel")) renderPanel(); })();
  }
  const ps=pantallas();
  if(!ps.some(p=>p.id===state.hzGroup)) state.hzGroup=ps[0]?ps[0].id:null;
  c.classList.add("hz-ws-host");
  c.innerHTML=`<div class="hz-ws"><section class="hz-stage" id="hzStage" aria-label="Área de trabajo"></section><aside class="hz-panel" id="hzPanel" aria-label="Panel de hallazgos"></aside></div>`;
  renderStage(); renderPanel(); bindGlobal();
}

/* ---------------- Área de trabajo ---------------- */
const sevVar=v=>(v===null||v===undefined||v==="")?null:`var(--sev${v})`;
function renderStage(){
  const st=$("hzStage"); if(!st) return;
  const ps=pantallas(), g=state.hzGroup;
  if(!ps.length){
    st.innerHTML=`<div class="empty hz-stage-empty"><span class="empty-ico"><span class="fig-ico ico-nube" aria-hidden="true"></span></span>
      <div><h3>Este estudio todavía no tiene pantallas</h3><p>Empezá cargando la primera pantalla del sitio o de la app, acá abajo o con el botón + de arriba. Después hacés clic sobre la imagen para ubicar cada hallazgo con un pin.</p></div>
      <button class="btn" id="wsUp">Subir imagen</button></div>`;
    $("wsUp").onclick=()=>pantallaModal(null,"imagen");
    return;
  }
  const p=ps.find(x=>x.id===g)||ps[0]; state.hzGroup=p.id;
  const cnt=pid=>state.hallazgos.filter(h=>h.pantallaId===pid).length;
  st.innerHTML=`<div class="ws-tabs" id="wsTabs">
      <button class="ws-nav" id="wsPrev" aria-label="Ver pantallas anteriores" title="Pantallas anteriores" hidden>${chevL()}</button>
      <div class="ws-group-wrap" id="wsGWrap"><div class="ws-group" id="wsGroup" role="tablist" aria-label="Pantallas">${ps.map(x=>`<button class="ws-gbtn ${x.id===p.id?'on':''}" role="tab" aria-selected="${x.id===p.id}" tabindex="${x.id===p.id?0:-1}" data-p="${x.id}" title="${esc(x.nombre)}${x.origen==="url"?" · URL":""}"><span class="nm">${esc(x.nombre)}</span>${x.origen==="url"?`<span class="url-b">URL</span>`:""}</button>`).join("")}</div></div>
      <button class="ws-nav" id="wsNext" aria-label="Ver más pantallas" title="Más pantallas" hidden>${chevR()}</button>
      <div class="ws-all-wrap"><button class="ws-all" id="wsAll" aria-haspopup="listbox" aria-expanded="false" title="Ver todas las pantallas" hidden>Todas <span class="c">${ps.length}</span></button>
        <div class="ws-all-menu" id="wsAllMenu" role="listbox" aria-label="Todas las pantallas" hidden>${ps.map((x,i)=>`<button role="option" aria-selected="${x.id===p.id}" class="${x.id===p.id?'on':''}" data-p="${x.id}"><span class="i">${i+1}</span><span class="nm">${esc(x.nombre)}</span>${x.origen==="url"?`<span class="url-b">URL</span>`:""}<span class="c">${cnt(x.id)}</span></button>`).join("")}</div></div>
      ${(()=>{ const lim=state.cuenta&&state.cuenta.limites; return lim&&ps.length>=lim.pantallas
        ?`<button class="ws-new off" id="wsAdd" disabled title="En la beta cada estudio puede tener hasta ${lim.pantallas} pantallas">${ps.length} de ${lim.pantallas} pantallas</button>`
        :`<button class="ws-new" id="wsAdd">Nueva pantalla <span class="fig-ico ico-mas" aria-hidden="true"></span></button>`; })()}
    </div>
    <div class="ws-canvas" id="wsCanvas">
      <div class="ws-tools"><button class="ws-tool" id="wsCambiar" title="Cambiar pantalla (nombre, URL o imagen)" aria-label="Cambiar pantalla"><span class="fig-ico ico-pant-cambiar" aria-hidden="true"></span></button>
        <button class="ws-tool txt" id="wsEliminarP">Eliminar pantalla <span class="fig-ico ico-eliminar" aria-hidden="true"></span></button></div>
      <div class="ws-scroll" id="wsScroll"></div>
    </div>`;
  const elegir=pid=>{ state.hzGroup=pid; state.hzQuick=null; if(state.hzForm&&!state.hzFormNuevo) state.hzForm=null; renderStage(); renderPanel(); const b=st.querySelector(`.ws-gbtn[data-p="${pid}"]`); if(b) b.focus({preventScroll:true}); };
  st.querySelectorAll(".ws-gbtn").forEach(b=>b.onclick=()=>elegir(b.dataset.p));
  bindTabsOverflow(st,ps,p,elegir);
  $("wsAdd").onclick=()=>pantallaModal(null,"imagen");
  $("wsCambiar").onclick=()=>pantallaModal(p);
  $("wsEliminarP").onclick=()=>eliminarPantalla(p);
  renderCanvas(p);
}
/* Pestañas de pantallas que no entran: flechas ‹ › (desplazan un bloque), menú "Todas"
   para saltar directo y navegación con teclado (←/→, Inicio/Fin) según el patrón de tabs. */
function bindTabsOverflow(st,ps,p,elegir){
  const g=$("wsGroup"), wrap=$("wsGWrap"), prev=$("wsPrev"), next=$("wsNext"), all=$("wsAll"), menu=$("wsAllMenu");
  const on=g.querySelector(".ws-gbtn.on");
  const mostrarActiva=()=>{ if(!on) return; const l=on.offsetLeft, r=l+on.offsetWidth; if(l<g.scrollLeft) g.scrollLeft=l-24; else if(r>g.scrollLeft+g.clientWidth) g.scrollLeft=r-g.clientWidth+24; };
  const update=()=>{ if(!document.body.contains(g)) return;
    const over=g.scrollWidth>g.clientWidth+1;
    prev.hidden=next.hidden=all.hidden=!over;
    prev.disabled=g.scrollLeft<=1; next.disabled=g.scrollLeft+g.clientWidth>=g.scrollWidth-1;
    wrap.classList.toggle("fade-l",over&&!prev.disabled); wrap.classList.toggle("fade-r",over&&!next.disabled); };
  const paso=dir=>{ g.scrollLeft+=dir*Math.max(120,g.clientWidth*0.8); update(); };
  prev.onclick=()=>paso(-1); next.onclick=()=>paso(1);
  g.onscroll=update;
  g.onwheel=e=>{ if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){ g.scrollLeft+=e.deltaY; e.preventDefault(); } };
  if(window._wsRO) window._wsRO.disconnect();
  if(window.ResizeObserver){ window._wsRO=new ResizeObserver(update); window._wsRO.observe(g); }
  update(); mostrarActiva(); update();   // primero los controles (achican el grupo), después la pestaña activa
  // Teclado: flechas, Inicio y Fin cambian de pantalla (tabs con activación automática).
  g.onkeydown=e=>{ const i=ps.findIndex(x=>x.id===p.id); let j=null;
    if(e.key==="ArrowRight") j=Math.min(ps.length-1,i+1); else if(e.key==="ArrowLeft") j=Math.max(0,i-1);
    else if(e.key==="Home") j=0; else if(e.key==="End") j=ps.length-1;
    if(j!==null&&j!==i){ e.preventDefault(); elegir(ps[j].id); } };
  // Menú "Todas"
  const cerrar=()=>{ menu.hidden=true; all.setAttribute("aria-expanded","false"); document.removeEventListener("pointerdown",fuera,true); };
  const fuera=e=>{ if(!e.target.closest(".ws-all-wrap")) cerrar(); };
  all.onclick=()=>{ if(!menu.hidden) return cerrar(); menu.hidden=false; all.setAttribute("aria-expanded","true"); document.addEventListener("pointerdown",fuera,true);
    const sel=menu.querySelector(".on")||menu.querySelector("button"); if(sel){ sel.focus({preventScroll:true}); sel.scrollIntoView({block:"nearest"}); } };
  menu.querySelectorAll("button").forEach(b=>b.onclick=()=>{ cerrar(); elegir(b.dataset.p); });
  menu.onkeydown=e=>{ const items=[...menu.querySelectorAll("button")], k=items.indexOf(document.activeElement);
    if(e.key==="Escape"){ e.preventDefault(); cerrar(); all.focus(); }
    else if(e.key==="ArrowDown"){ e.preventDefault(); (items[k+1]||items[0]).focus(); }
    else if(e.key==="ArrowUp"){ e.preventDefault(); (items[k-1]||items[items.length-1]).focus(); } };
}
async function renderCanvas(p){
  const cv=$("wsScroll"); if(!cv||!p||!p.id) return;
  const d=await getImg(p.id);
  if(state.hzGroup!==p.id||!$("wsScroll")) return;
  if(!d||!d.base){
    cv.innerHTML=`<div class="ev-drop ws-capture" id="wsCap" tabindex="0">${camIco()}
      <div class="pz-main">Pegá o subí la captura de ${p.url?esc(p.url.replace(/^https?:\/\//,"")):"esta pantalla"}</div>
      <div class="pz-sub">Con <kbd>Ctrl/Cmd</kbd> + <kbd>V</kbd>, arrastrándola acá o con un clic para elegir el archivo.</div></div>
      <input type="file" id="wsCapFile" accept="image/*" hidden>`;
    $("wsCap").onclick=()=>$("wsCapFile").click();
    $("wsCapFile").onchange=e=>{ const f=e.target.files[0]; if(f) ponerCaptura(p,f); };
    const z=$("wsCap"); z.ondragover=e=>{e.preventDefault();z.classList.add("drag");}; z.ondragleave=()=>z.classList.remove("drag");
    z.ondrop=e=>{e.preventDefault();z.classList.remove("drag");const f=[...(e.dataTransfer.files||[])].find(f=>f.type.indexOf("image")===0);if(f)ponerCaptura(p,f);};
    return;
  }
  const hz=grupo().filter(h=>h.pin).sort(byNum), q=state.hzQuick;
  const qH=q&&q.h&&q.h.pantallaId===p.id?q.h:null;
  const qN=qH?(q.nuevo?hz.length+1:pinNumero(qH,state.hallazgos)):null;
  const pinBtn=(h,n,on,draft)=>{ const c=sevVar(h.severidad); return `<button class="ws-pin ${on?'on':''} ${draft?'draft':''} ${c?'':'sin-sev'}" data-hz="${h.id}" style="left:${h.pin.x*100}%;top:${h.pin.y*100}%;${c&&!on?`--pc:${c}`:""}" title="${esc(h.titulo||autoTitulo(h.descripcion))}">${n}</button>`; };
  cv.innerHTML=`<div class="ws-img" id="wsImg"><img src="${d.base}" alt="${esc(p.nombre)}" draggable="false">
    ${hz.map(h=>pinBtn(h,pinNumero(h,state.hallazgos),(qH&&qH.id===h.id)||(!qH&&state.hzSel===h.id))).join("")}
    ${qH&&q.nuevo?pinBtn(qH,qN,true,true):""}
    ${qH?quickBox(qH,q.nuevo):""}</div>
    <div class="ws-zoom" role="group" aria-label="Zoom"><button id="zOut" title="Alejar" aria-label="Alejar">−</button><button id="zPct" title="Ver al 100%">100%</button><button id="zIn" title="Acercar" aria-label="Acercar">+</button><button id="zFit" class="txt" title="Ajustar al área">Ajustar</button></div>`;
  const wrap=$("wsImg"), img=wrap.querySelector("img");
  // ---- Vista con zoom (sin scroll): el tamaño se aplica al contenedor, así los pines no escalan.
  const natW=d.w||p.w||1280, natH=d.h||p.h||800;
  const fit=()=>{ const W=cv.clientWidth-48, H=cv.clientHeight-48, k=Math.max(0.05,Math.min(W/natW,H/natH,1)); return {k,x:(cv.clientWidth-natW*k)/2,y:(cv.clientHeight-natH*k)/2}; };
  state.hzVP=state.hzVP||{};
  let vp=state.hzVP[p.id]||fit();
  const apply=()=>{ state.hzVP[p.id]=vp; Object.assign(wrap.style,{width:natW*vp.k+"px",height:natH*vp.k+"px",left:vp.x+"px",top:vp.y+"px"}); const t=$("zPct"); if(t) t.textContent=Math.round(vp.k*100)+"%"; };
  const zoomAt=(cx,cy,f)=>{ const k2=Math.min(6,Math.max(0.05,vp.k*f)); vp={k:k2,x:cx-(cx-vp.x)*(k2/vp.k),y:cy-(cy-vp.y)*(k2/vp.k)}; apply(); };
  const centro=()=>[cv.clientWidth/2,cv.clientHeight/2];
  apply();
  $("zIn").onclick=e=>{ e.stopPropagation(); zoomAt(...centro(),1.25); };
  $("zOut").onclick=e=>{ e.stopPropagation(); zoomAt(...centro(),0.8); };
  $("zPct").onclick=e=>{ e.stopPropagation(); zoomAt(...centro(),1/vp.k); };
  $("zFit").onclick=e=>{ e.stopPropagation(); vp=fit(); apply(); };
  cv.onwheel=e=>{ e.preventDefault(); const r=cv.getBoundingClientRect(); zoomAt(e.clientX-r.left,e.clientY-r.top,Math.exp(-e.deltaY*0.0018)); };
  // Arrastrar mueve la vista; un clic sin arrastre sobre la captura crea un hallazgo ahí.
  let drag=null;
  cv.onpointerdown=e=>{ if(e.button!==0||e.target.closest(".ws-pin,.ws-quick,.ws-zoom")) return; drag={x:e.clientX,y:e.clientY,vx:vp.x,vy:vp.y,moved:false}; cv.setPointerCapture(e.pointerId); };
  cv.onpointermove=e=>{ if(!drag) return; const dx=e.clientX-drag.x, dy=e.clientY-drag.y; if(!drag.moved&&Math.hypot(dx,dy)<4) return; drag.moved=true; cv.classList.add("panning"); vp={...vp,x:drag.vx+dx,y:drag.vy+dy}; apply(); };
  cv.onpointerup=e=>{ if(!drag) return; const fue=drag; drag=null; cv.classList.remove("panning"); try{cv.releasePointerCapture(e.pointerId);}catch(_){}
    if(fue.moved) return;
    if(state.hzQuick){ state.hzQuick=null; renderCanvas(p); return; }
    const r=img.getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) return;
    const pin={x:clamp01((e.clientX-r.left)/r.width),y:clamp01((e.clientY-r.top)/r.height)};
    state.hzQuick={h:nuevoHallazgo({id:uid(),pantallaId:p.id,pin,createdAt:Date.now()}),nuevo:true}; state.hzSel=null;
    renderCanvas(p); setTimeout(()=>{const t=$("qDesc");if(t)t.focus();},20);
  };
  wrap.querySelectorAll(".ws-pin:not(.draft)").forEach(b=>b.onclick=e=>{ e.stopPropagation(); const h=state.hallazgos.find(x=>x.id===b.dataset.hz); if(!h) return;
    state.hzQuick={h:{...h},nuevo:false}; state.hzSel=h.id; renderCanvas(p); renderPanel(); });
  if(qH) bindQuick(p,qH,q.nuevo);
}
/* Popover: Descripción y Severidad. Se abre hacia el lado con más espacio. */
function quickBox(h,nuevo){
  const izq=h.pin.x>0.55, arriba=h.pin.y>0.6;
  const pos=`${izq?`right:calc(${(1-h.pin.x)*100}% + 24px)`:`left:calc(${h.pin.x*100}% + 24px)`};${arriba?`bottom:calc(${(1-h.pin.y)*100}% - 26px)`:`top:calc(${h.pin.y*100}% - 26px)`}`;
  return `<div class="ws-quick" id="wsQuick" style="${pos}" role="dialog" aria-label="${nuevo?"Nuevo hallazgo":"Editar hallazgo"}">
    <div class="pf"><label for="qDesc">Descripción</label><textarea id="qDesc" placeholder="Qué se observó...">${esc(h.descripcion||(nuevo?"":h.titulo||""))}</textarea></div>
    <div class="pf"><label>Severidad · 0 a 4</label>${sevScale("qSev",h.severidad)}</div>
    <div class="q-acts"><button class="btn-q sel" id="qSave">Guardar</button><button class="btn-q" id="qDel">Eliminar <span class="fig-ico ico-eliminar" aria-hidden="true"></span></button></div>
  </div>`;
}
const sevScale=(id,val)=>`<div class="sev-scale" id="${id}">${[0,1,2,3,4].map(v=>`<button type="button" class="${val===v?'on':''}" data-s="${v}" title="Sev ${v} · ${SEVERIDAD[v].label}">${v}</button>`).join("")}</div>`;
const bindSev=(root,id,get,set)=>root.querySelectorAll(`#${id} button`).forEach(b=>b.onclick=()=>{ const v=(String(get())===b.dataset.s)?null:Number(b.dataset.s); set(v); root.querySelectorAll(`#${id} button`).forEach(x=>x.classList.toggle("on",String(v)===x.dataset.s)); });
function bindQuick(p,h,nuevo){
  let sev=h.severidad??null;
  const box=$("wsQuick"); box.onclick=e=>e.stopPropagation();
  bindSev(box,"qSev",()=>sev,v=>{sev=v;});
  const actual=()=>{ const t=$("qDesc").value.trim(); const rec={...h,descripcion:t,severidad:sev};
    if(!h.titulo||h.titulo===autoTitulo(h.descripcion||"")) rec.titulo=autoTitulo(t); return rec; };
  $("qDel").onclick=()=>{
    if(nuevo){ state.hzQuick=null; renderCanvas(p); return; }   // descarta el recién creado
    state.hzQuick=null; confirmDelHz(h.id);
  };
  $("qSave").onclick=async()=>{
    const rec=actual(); if(!rec.descripcion&&!rec.titulo){ $("qDesc").focus(); return; }
    const b=$("qSave"); b.disabled=true;
    try{ await guardar(rec); state.hzQuick=null; state.hzSel=rec.id; toast(nuevo?"Hallazgo registrado":"Hallazgo actualizado"); renderStage(); renderPanel(); }
    catch(e){ console.error("qSave",e); toast("No se pudo guardar. Probá de nuevo."); b.disabled=false; }
  };
}
async function guardar(rec){
  rec={...rec,modelo:MODELO}; delete rec.heuristicas; delete rec.sesgos; delete rec.imgs;
  if(!rec.titulo) rec.titulo=autoTitulo(rec.descripcion)||"(sin título)";
  normalizarPin(rec);
  await store.saveHallazgo(state.activeId,rec);
  state.hallazgos=await store.listHallazgos(state.activeId);
  return rec;
}
function abrirForm(h,nuevo){ if(!h) return; state.hzForm={...h}; state.hzFormNuevo=!!nuevo; state.hzPanel="lista"; state.hzSel=nuevo?null:h.id; state.hzQuick=null; renderPanel(); const p=pantallas().find(x=>x.id===state.hzGroup); if(p) renderCanvas(p); }
function eliminarPantalla(p){
  const count=state.hallazgos.filter(h=>h.pantallaId===p.id).length;
  openConfirm("Eliminar pantalla",`Se elimina "<b>${esc(p.nombre)}</b>". ${count?`Sus ${count} ${count===1?"hallazgo no se borra: pasa":"hallazgos no se borran: pasan"} a "Sin pantalla".`:"No tiene hallazgos."}`,async()=>{
    for(const h of state.hallazgos.filter(h=>h.pantallaId===p.id)) await store.saveHallazgo(state.activeId,normalizarPin({...h,pantallaId:null}));
    await pantallaStore.del(state.activeId,p.id); imgCache.delete(state.activeId+"/"+p.id);
    state.pantallas=pantallas().filter(x=>x.id!==p.id); state.hallazgos=await store.listHallazgos(state.activeId);
    state.hzGroup=state.pantallas[0]?state.pantallas[0].id:null; state.hzQuick=null; state.hzForm=null; toast("Pantalla eliminada"); renderStage(); renderPanel();
  });
}

/* ---------------- Pantallas: alta, edición, captura ---------------- */
async function ponerCaptura(p,blob){
  try{ const r=await processImage(blob); const base=r.full.dataUrl;
    await pantallaStore.putImg(state.activeId,p.id,{base,w:r.full.w,h:r.full.h});
    Object.assign(p,{w:r.full.w,h:r.full.h,thumb:r.thumb.dataUrl,hash:hashStr(base)}); await pantallaStore.save(state.activeId,p);
    imgCache.delete(state.activeId+"/"+p.id); toast("Captura agregada"); renderStage();
  }catch(e){ console.error("captura",e); toast("No se pudo procesar la imagen"); }
}
async function crearDesdeImagen(blob,nombre){
  const r=await processImage(blob);
  const {pantalla,existente}=await pantallaDesdeImagen(state.activeId,pantallas(),r,nombre||(blob.name||"").replace(/\.[a-z0-9]+$/i,""));
  if(!existente) state.pantallas=[...pantallas(),pantalla];
  toast(existente?"Esa imagen ya estaba cargada: se abre su pantalla":"Pantalla agregada");
  return pantalla;
}
function pantallaModal(p,modo){
  const nueva=!p; let origen=nueva?(modo||"imagen"):p.origen, blob=null;
  openModal(nueva?"Nueva pantalla":"Cambiar pantalla",`
    ${nueva?`<div class="field"><div class="type-seg" id="pmOrigen"><button type="button" class="seg ${origen==="imagen"?'on':''}" data-o="imagen">Subir imagen</button><button type="button" class="seg ${origen==="url"?'on':''}" data-o="url">Pegar URL</button></div></div>`:""}
    <div class="field" id="pmUrlF" ${origen==="url"?"":"hidden"}><label for="pmUrl">URL</label><input id="pmUrl" value="${esc(p&&p.url||"")}" placeholder="https://..."></div>
    <div class="field"><label for="pmNom">Nombre</label><input id="pmNom" value="${esc(p&&p.nombre||"")}" placeholder="Ej: Landing page"></div>
    <div class="field"><label id="pmImgLab">${nueva?(origen==="url"?"Captura de la URL <span class=\"opt\">opcional: también la podés pegar después</span>":"Imagen"):"Reemplazar imagen <span class=\"opt\">opcional, los pines se mantienen</span>"}</label>
      <div class="ev-drop pm-drop" id="pmDrop" tabindex="0">${camIco()}<div class="pz-main" id="pmDropT">Pegá con <kbd>Ctrl/Cmd</kbd> + <kbd>V</kbd>, arrastrá o hacé clic</div></div>
      <input type="file" id="pmFile" accept="image/*" hidden></div>
    <p class="hint">La captura automática de URLs todavía no está disponible: pegá o subí una captura de la página.</p>`,
  async()=>{
    const nombre=$("pmNom").value.trim(), url=($("pmUrl")||{}).value?$("pmUrl").value.trim():"";
    if(nueva&&origen==="imagen"&&!blob){ toast("Elegí o pegá una imagen"); return false; }
    if(nueva&&origen==="url"&&!url){ $("pmUrl").focus(); return false; }
    if(nueva&&origen==="imagen"){ const pa=await crearDesdeImagen(blob,nombre); state.hzGroup=pa.id; }
    else if(nueva){
      const pa={id:uid(),nombre:nombre||url.replace(/^https?:\/\//,"").replace(/\/$/,""),origen:"url",url,orden:pantallas().reduce((m,x)=>Math.max(m,(x.orden??0)+1),0),w:0,h:0,thumb:null,hash:null,createdAt:Date.now()};
      await pantallaStore.save(state.activeId,pa); state.pantallas=[...pantallas(),pa]; state.hzGroup=pa.id;
      if(blob) await ponerCaptura(pa,blob);
    } else {
      p.nombre=nombre||p.nombre; if(p.origen==="url") p.url=url;
      await pantallaStore.save(state.activeId,p);
      if(blob) await ponerCaptura(p,blob);
    }
    state.hzQuick=null; renderStage(); renderPanel(); return true;
  });
  const drop=$("pmDrop"), file=$("pmFile");
  const setBlob=b=>{ blob=b; $("pmDropT").textContent="Imagen lista: "+(b.name||"pegada del portapapeles"); drop.classList.add("ok"); if(!$("pmNom").value&&b.name) $("pmNom").value=b.name.replace(/\.[a-z0-9]+$/i,""); };
  drop.onclick=()=>file.click(); file.onchange=e=>{ if(e.target.files[0]) setBlob(e.target.files[0]); };
  drop.ondragover=e=>{e.preventDefault();drop.classList.add("drag");}; drop.ondragleave=()=>drop.classList.remove("drag");
  drop.ondrop=e=>{e.preventDefault();drop.classList.remove("drag");const f=[...(e.dataTransfer.files||[])].find(f=>f.type.indexOf("image")===0);if(f)setBlob(f);};
  window._pmPaste=b=>setBlob(b);
  const seg=$("pmOrigen"); if(seg) seg.querySelectorAll(".seg").forEach(b=>b.onclick=()=>{ origen=b.dataset.o; seg.querySelectorAll(".seg").forEach(x=>x.classList.toggle("on",x===b)); $("pmUrlF").hidden=origen!=="url";
    $("pmImgLab").innerHTML=origen==="url"?'Captura de la URL <span class="opt">opcional: también la podés pegar después</span>':"Imagen"; });
  setTimeout(()=>{ const f=nueva&&origen==="url"?$("pmUrl"):$("pmNom"); if(f) f.focus(); },40);
}

/* Pegar y Esc dentro de la sección (un solo listener global, con guarda). */
function bindGlobal(){
  if(window._wsBound) return; window._wsBound=true;
  document.addEventListener("paste",async e=>{
    if(!$("hzStage")) return;
    const it=[...((e.clipboardData&&e.clipboardData.items)||[])].find(i=>i.type&&i.type.indexOf("image")===0); if(!it) return;
    const b=it.getAsFile(); if(!b) return;
    if(document.querySelector("#modalRoot .modal")){ if(window._pmPaste&&$("pmDrop")){ e.preventDefault(); window._pmPaste(b); } return; }
    e.preventDefault();
    const p=pantallas().find(x=>x.id===state.hzGroup);
    if(p&&!p.hash){ await ponerCaptura(p,b); return; }
    try{ const pa=await crearDesdeImagen(b,""); state.hzGroup=pa.id; state.hzQuick=null; renderStage(); renderPanel(); }catch(err){ toast("No se pudo procesar la imagen"); }
  });
  document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&$("wsQuick")&&!document.querySelector("#modalRoot .modal")){ state.hzQuick=null; const p=pantallas().find(x=>x.id===state.hzGroup); if(p) renderCanvas(p); } });
}

/* ---------------- Panel derecho ---------------- */
export function renderPanel(){
  const el=$("hzPanel"); if(!el) return;
  if(state.hzPanel==="catalogo") return renderPanelCatalogo(el);
  if(state.hzForm&&!state.hzFormNuevo&&!state.hallazgos.some(h=>h.id===state.hzForm.id)) state.hzForm=null;
  if(state.hzForm) return renderForm(el);
  const p=pantallas().find(x=>x.id===state.hzGroup);
  if(!p){
    el.innerHTML=`<div class="hp-top"><div><h2>Hallazgos</h2></div><button class="btn-sec" id="hpCat">Catálogo <span class="fig-ico ico-ir" aria-hidden="true"></span></button></div>
      <div class="alert">${infoIco()}<span>Cuando cargues una pantalla y ubiques un pin, el hallazgo aparece en esta lista. Desde acá lo filtrás por severidad y lo editás.</span></div>`;
    $("hpCat").onclick=()=>{ state.hzPanel="catalogo"; renderPanel(); };
    return;
  }
  const base=grupo().sort(byNum), f=state.hzSevF??"todas";
  const list=base.filter(h=>f==="todas"||String(h.severidad)===String(f));
  const chips=[["todas","Todas",null],...SEVERIDAD.map(s=>[String(s.n),s.label,s.n])];
  el.innerHTML=`<div class="hp-top"><div><h2>Hallazgos</h2><p class="hp-pant">${esc(p.nombre)}</p><p>${base.length} en esta pantalla</p></div>
      <button class="btn-sec" id="hpCat">Catálogo <span class="fig-ico ico-ir" aria-hidden="true"></span></button></div>
    <div class="hp-filters" role="group" aria-label="Filtrar por severidad">${chips.map(([v,l,n])=>`<button class="chip-f ${String(f)===v?'on':''}" data-f="${v}" aria-pressed="${String(f)===v}" ${n!==null?`style="--sc:var(--sev${n})"`:""}>${l}</button>`).join("")}</div>
    ${!base.length?`<div class="hp-empty"><span>Esta pantalla todavía no tiene hallazgos. Hacé clic en la imagen para ubicar el primero.</span></div>`
      :!list.length?`<div class="hp-empty"><span>Ningún hallazgo con esta severidad.</span></div>`
      :`<div class="hp-list">${list.map(h=>{ const c=sevVar(h.severidad); return `<button class="hp-card ${h.id===state.hzSel?'on':''}" data-hz="${h.id}" ${c?`style="--sc:${c}"`:""}><span class="hp-pin ${c?'sev':''}">${numDe(h)}</span><span class="hp-det"><span class="t">${esc(h.titulo||autoTitulo(h.descripcion)||"(sin texto)")}</span><span class="m">${esc(hzMeta(h))}</span></span></button>`; }).join("")}</div>`}`;
  $("hpCat").onclick=()=>{ state.hzPanel="catalogo"; renderPanel(); };
  el.querySelectorAll(".chip-f").forEach(b=>b.onclick=()=>{ state.hzSevF=b.dataset.f; renderPanel(); });
  el.querySelectorAll(".hp-card[data-hz]").forEach(b=>b.onclick=()=>abrirForm(state.hallazgos.find(h=>h.id===b.dataset.hz)));
}
const infoIco=()=>`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`;
function renderForm(el){
  const h=state.hzForm, nuevo=state.hzFormNuevo, ids=catalogoIdsDe(h), heur0=ids.find(id=>heurById(id))||"";
  const flows=(state.flujos||[]).filter(f=>f.tipo!=="User Journey");
  const conPaso=!proximamente("flujos"); // mientras Flujos esté en "Próximamente" no se ofrece el paso
  const pasoVal=h.flujoId?`${h.flujoId}|${h.pasoId||h.interaccionId||""}`:"";
  const p=pantallas().find(x=>x.id===h.pantallaId);
  const n=h.pantallaId&&!nuevo?pinNumero(h,state.hallazgos):null;
  el.innerHTML=`<div class="hp-edit-h2"><button class="hp-back" id="hfBack" title="Volver a la lista" aria-label="Volver a la lista"><span class="fig-ico ico-volver" aria-hidden="true"></span></button>
      <h3>${nuevo?"Nuevo hallazgo":`Editar hallazgo${n?" "+n:""}`}</h3><span>${esc(p?p.nombre:"Sin pantalla")}</span></div>
    <form class="hp-edit hp-full" id="hfForm">
      <div class="pf"><label>Severidad · 0 a 4</label>${sevScale("hfSev",h.severidad)}</div>
      <div class="pf"><label for="hfDesc">Descripción</label><textarea id="hfDesc">${esc(h.descripcion||"")}</textarea></div>
      <div class="pf"><label for="hfReco">Recomendación</label><textarea id="hfReco">${esc(h.recomendacion||"")}</textarea></div>
      <div class="pf"><label for="hfHeur">Heurística relacionada</label><select id="hfHeur"><option value="">Sin heurística</option>${allHeur().map(x=>`<option value="${x.id}" ${heur0===x.id?'selected':''}>${esc(x.nombre)}</option>`).join("")}</select></div>
      <div class="${conPaso?"pf-row":""}">
        <div class="pf"><label for="hfPant">Pantalla</label><select id="hfPant"><option value="">Sin pantalla</option>${pantallas().map(x=>`<option value="${x.id}" ${x.id===h.pantallaId?'selected':''}>${esc(x.nombre)}</option>`).join("")}</select></div>
        ${conPaso?`<div class="pf"><label for="hfPaso">Paso de flujo</label><select id="hfPaso"><option value="">Ninguno</option>${flows.map(f=>`<optgroup label="${esc(f.nombre||"Flujo")}">${(f.nodes||[]).map(nd=>`<option value="${f.id}|${nd.id}" ${pasoVal===f.id+"|"+nd.id?'selected':''}>${esc(nd.titulo||"Interacción")}</option>`).join("")}</optgroup>`).join("")}</select></div>`:""}
      </div>
      <div class="hp-acts"><button type="submit" class="btn-q sel" id="hfSave">${nuevo?"Guardar hallazgo":"Guardar cambios"}</button><button type="button" class="btn-q" id="hfCancel">Cancelar</button><div class="spacer"></div>${nuevo?"":`<button type="button" class="hp-trash" id="hfDel" title="Eliminar hallazgo" aria-label="Eliminar hallazgo"><span class="fig-ico ico-eliminar" aria-hidden="true"></span></button>`}</div>
    </form>`;
  let sev=h.severidad??null;
  bindSev(el,"hfSev",()=>sev,v=>{sev=v;});
  const cerrar=()=>{ state.hzForm=null; state.hzFormNuevo=false; renderPanel(); };
  $("hfBack").onclick=cerrar; $("hfCancel").onclick=cerrar;
  const del=$("hfDel"); if(del) del.onclick=()=>{ const id=h.id; state.hzForm=null; confirmDelHz(id); };
  $("hfForm").onsubmit=async e=>{
    e.preventDefault();
    const desc=$("hfDesc").value.trim();
    if(!desc&&!h.titulo){ $("hfDesc").focus(); return; }
    const pid=$("hfPant").value||null, paso=conPaso?$("hfPaso").value:null, heur=$("hfHeur").value;
    const resto=ids.filter(id=>id!==heur&&id!==heur0);
    const rec={...h,descripcion:desc,recomendacion:$("hfReco").value.trim(),severidad:sev,
      catalogoIds:heur?[heur,...resto]:resto, pantallaId:pid,pin:pid===h.pantallaId?h.pin:null};
    if(!h.titulo||h.titulo===autoTitulo(h.descripcion||"")) rec.titulo=autoTitulo(desc);
    const prev={flujoId:h.flujoId||null,pasoId:h.pasoId||h.interaccionId||null};
    if(!conPaso){ /* se conserva el paso que ya tuviera */ }
    else if(paso){ const [fid,nid]=paso.split("|"); const f=flows.find(x=>x.id===fid), nd=f&&(f.nodes||[]).find(x=>x.id===nid);
      Object.assign(rec,{flujoId:fid,pasoId:nid,interaccionId:nid,interaccionTitulo:nd?nd.titulo:""}); }
    else Object.assign(rec,{flujoId:null,pasoId:null,interaccionId:null,interaccionTitulo:null});
    const b=$("hfSave"); b.disabled=true;
    try{
      const saved=await guardar(rec);
      await syncPaso(saved.id,prev,{flujoId:saved.flujoId,pasoId:saved.pasoId});
      state.hzForm=null; state.hzFormNuevo=false; state.hzSel=saved.id;
      if(saved.pantallaId&&saved.pantallaId!==state.hzGroup) state.hzGroup=saved.pantallaId;
      toast(nuevo?"Hallazgo registrado":"Hallazgo actualizado"); renderStage(); renderPanel();
    }catch(err){ console.error("hfSave",err); toast("No se pudo guardar. Probá de nuevo."); b.disabled=false; }
  };
}
/* La relación hallazgo ↔ interacción se guarda en los dos lados: también en node.markers,
   para que el hallazgo siga apareciendo en el módulo Flujos. */
async function syncPaso(hid,prev,next){
  if(prev.flujoId===next.flujoId&&prev.pasoId===next.pasoId) return;
  const flows=state.flujos||[]; const tocados=new Set();
  if(prev.flujoId){ const f=flows.find(x=>x.id===prev.flujoId), nd=f&&(f.nodes||[]).find(x=>x.id===prev.pasoId);
    if(nd){ nd.markers=(nd.markers||[]).filter(m=>m.hallazgoId!==hid); tocados.add(f); } }
  if(next.flujoId){ const f=flows.find(x=>x.id===next.flujoId), nd=f&&(f.nodes||[]).find(x=>x.id===next.pasoId);
    if(nd){ nd.markers=nd.markers||[]; if(!nd.markers.some(m=>m.hallazgoId===hid)) nd.markers.push({id:uid(),x:0.5,y:0.5,hallazgoId:hid}); tocados.add(f); } }
  for(const f of tocados) await flowStore.save(state.activeId,f);
}
function renderPanelCatalogo(el){
  const tab=state.hzCatTab||"heur";
  const items=tab==="heur"?allHeur().map(h=>({t:`${h.num}. ${h.nombre}`,d:h.desc,src:h.src})):allSesgos().map(x=>({t:x.nombre,d:x.desc,src:x.categoria||(x.custom?"Propio":"")}));
  el.innerHTML=`<div class="hp-top">
      <div class="hp-back-row"><button class="icon-btn sh-backbtn" id="hpBack" title="Volver a hallazgos" aria-label="Volver a hallazgos"><span class="fig-ico ico-volver" aria-hidden="true"></span></button><div><h2>Catálogo</h2><p>Heurísticas y sesgos para fundamentar los hallazgos</p></div></div>
    </div>
    <div class="hp-filters" role="group" aria-label="Sección del catálogo"><button class="chip-f ${tab==="heur"?'on':''}" data-c="heur">Heurísticas</button><button class="chip-f ${tab==="sesgo"?'on':''}" data-c="sesgo">Sesgos y patrones</button></div>
    <div class="hp-list">${items.map(i=>`<div class="hp-card static"><span class="hp-det"><span class="t">${esc(i.t)}</span><span class="m">${esc(i.d||"")}</span>${i.src?`<span class="s">${esc(i.src)}</span>`:""}</span></div>`).join("")}</div>`;
  $("hpBack").onclick=()=>{ state.hzPanel="lista"; renderPanel(); };
  el.querySelectorAll("[data-c]").forEach(b=>b.onclick=()=>{ state.hzCatTab=b.dataset.c; renderPanelCatalogo(el); });
}
