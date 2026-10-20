import { SEVERIDAD } from "../core/catalogo-base.js";
import { allHeur, catalogoIdsDe, heurById, state } from "../core/state.js";
import { esc, uid } from "../core/util.js";
import { MODELO, clamp01, normalizarPin, pantallaDesdeImagen, pantallaStore, pinNumero } from "../data/pantallas.js";
import { processImage } from "../ui/imagenes.js";
import { toast } from "../ui/modales.js";
import { store } from "../data/store.js";
import { flowStore } from "../flujos/flujos.js";

/* ============ Formulario único de hallazgo ============
   El mismo formulario se usa en Hallazgos (panel derecho), en una interacción de User Flow
   y en un paso de User Journey. Un hallazgo puede estar en varios pasos (de flows y de
   journeys): la lista vive en el hallazgo (h.pasos = [{flujoId, pasoId}]) y cada paso la
   refleja de su lado (node.markers en el flow, paso.hallazgos en el journey), así se ve y se
   edita igual desde las dos partes. Los campos viejos flujoId/pasoId/interaccionId quedan con
   el primer paso, para lo que todavía los lee. */

export const autoTitulo=t=>{ const l=String(t||"").trim().split(/\n/)[0]; return l.length>90?l.slice(0,87)+"…":l; };
export const sevScale=(id,val)=>`<div class="sev-scale" id="${id}">${[0,1,2,3,4].map(v=>`<button type="button" class="${val===v?'on':''}" data-s="${v}" title="Sev ${v} · ${SEVERIDAD[v].label}">${v}</button>`).join("")}</div>`;
export const bindSev=(root,id,get,set)=>root.querySelectorAll(`#${id} button`).forEach(b=>b.onclick=()=>{ const v=(String(get())===b.dataset.s)?null:Number(b.dataset.s); set(v); root.querySelectorAll(`#${id} button`).forEach(x=>x.classList.toggle("on",String(v)===x.dataset.s)); });

export async function guardarHallazgo(rec){
  rec={...rec,modelo:MODELO}; delete rec.heuristicas; delete rec.sesgos; delete rec.imgs;
  if(!rec.titulo) rec.titulo=autoTitulo(rec.descripcion)||"(sin título)";
  normalizarPin(rec);
  await store.saveHallazgo(state.activeId,rec);
  state.hallazgos=await store.listHallazgos(state.activeId);
  return rec;
}

const clave=p=>p.flujoId+"|"+p.pasoId;
const sinRepetir=arr=>{ const vistos=new Set(); return arr.filter(p=>p&&p.flujoId&&p.pasoId&&!vistos.has(clave(p))&&vistos.add(clave(p))); };
const existe=p=>{ const f=(state.flujos||[]).find(x=>x.id===p.flujoId); if(!f) return false;
  return f.tipo==="User Journey"?(f.pasos||[]).some(x=>x.id===p.pasoId):(f.nodes||[]).some(x=>x.id===p.pasoId); };

// Pasos de un hallazgo: lo que guarda el hallazgo más lo que ya registran los flows y journeys
// (datos anteriores que solo tenían un lado). Solo pasos que todavía existen.
export function pasosDe(h){
  if(!h) return [];
  const propios=Array.isArray(h.pasos)?h.pasos:(h.flujoId?[{flujoId:h.flujoId,pasoId:h.pasoId||h.interaccionId}]:[]);
  const desdeFlujos=[];
  if(h.id) (state.flujos||[]).forEach(f=>{
    if(f.tipo==="User Journey") (f.pasos||[]).forEach(p=>{ if((p.hallazgos||[]).includes(h.id)) desdeFlujos.push({flujoId:f.id,pasoId:p.id}); });
    else (f.nodes||[]).forEach(n=>{ if((n.markers||[]).some(m=>m.hallazgoId===h.id)) desdeFlujos.push({flujoId:f.id,pasoId:n.id}); });
  });
  return sinRepetir([...propios,...desdeFlujos]).filter(existe);
}

// Todos los pasos que se pueden elegir, agrupados por flujo.
export function opcionesPasos(){
  return (state.flujos||[]).map(f=>{
    const jr=f.tipo==="User Journey";
    const items=jr?(f.pasos||[]).map((p,i)=>{ const et=(f.etapas||[]).find(e=>e.id===p.etapaId); return {flujoId:f.id,pasoId:p.id,etiqueta:`${i+1}. ${p.nombre||"Paso"}${et?" · "+et.nombre:""}`}; })
      :(f.nodes||[]).map((n,i)=>({flujoId:f.id,pasoId:n.id,etiqueta:`${i+1}. ${n.titulo||"Interacción"}`}));
    return {flujoId:f.id,nombre:f.nombre||(jr?"User Journey":"User Flow"),tipo:jr?"User Journey":"User Flow",items};
  }).filter(g=>g.items.length);
}
export function etiquetaPaso(p){
  const g=opcionesPasos().find(x=>x.flujoId===p.flujoId); const it=g&&g.items.find(x=>x.pasoId===p.pasoId);
  return it?{grupo:g.nombre,tipo:g.tipo,etiqueta:it.etiqueta}:null;
}

/* Deja los dos lados iguales: agrega o quita el hallazgo en cada paso. En un User Flow, si la
   interacción usa la misma pantalla que el hallazgo, la marca va donde está su pin. */
export async function sincronizarPasos(h,antes,despues){
  const quitar=antes.filter(p=>!despues.some(q=>clave(q)===clave(p)));
  const tocados=new Set();
  for(const p of quitar){ const f=(state.flujos||[]).find(x=>x.id===p.flujoId); if(!f) continue;
    if(f.tipo==="User Journey"){ const ps=(f.pasos||[]).find(x=>x.id===p.pasoId); if(ps&&(ps.hallazgos||[]).includes(h.id)){ ps.hallazgos=ps.hallazgos.filter(id=>id!==h.id); tocados.add(f); } }
    else { const n=(f.nodes||[]).find(x=>x.id===p.pasoId); if(n&&(n.markers||[]).some(m=>m.hallazgoId===h.id)){ n.markers=n.markers.filter(m=>m.hallazgoId!==h.id); tocados.add(f); } } }
  for(const p of despues){ const f=(state.flujos||[]).find(x=>x.id===p.flujoId); if(!f) continue;
    if(f.tipo==="User Journey"){ const ps=(f.pasos||[]).find(x=>x.id===p.pasoId); if(ps&&!(ps.hallazgos||[]).includes(h.id)){ ps.hallazgos=[...(ps.hallazgos||[]),h.id]; tocados.add(f); } }
    else { const n=(f.nodes||[]).find(x=>x.id===p.pasoId); if(!n) continue;
      const enPin=n.pantallaId&&h.pantallaId===n.pantallaId&&h.pin;
      const m=(n.markers||[]).find(x=>x.hallazgoId===h.id);
      if(!m){ n.markers=[...(n.markers||[]),{id:uid(),x:enPin?h.pin.x:0.5,y:enPin?h.pin.y:0.5,hallazgoId:h.id}]; tocados.add(f); }
      else if(enPin&&(m.x!==h.pin.x||m.y!==h.pin.y)){ m.x=h.pin.x; m.y=h.pin.y; tocados.add(f); } } }
  for(const f of tocados) await flowStore.save(state.activeId,f);
}

/* Formulario en un contenedor (panel de Hallazgos, de la interacción o del journey).
   opts: nuevo, subtitulo, alCerrar(), alGuardar(guardado), alEliminar() (si se ofrece). */
export function formularioHallazgo(el,h,opts){
  opts=opts||{};
  const nuevo=!!opts.nuevo, ids=catalogoIdsDe(h), heur0=ids.find(id=>heurById(id))||"";
  let pants=state.pantallas||[];
  const p=pants.find(x=>x.id===h.pantallaId);
  // Pantalla y pin: se elige una pantalla existente o se sube una nueva, y se hace clic en ella
  // para ubicar el hallazgo (sin clic, va al centro).
  let pantallaId=h.pantallaId||null, pin=h.pin?{...h.pin}:null;
  const n=h.pantallaId&&!nuevo?pinNumero(h,state.hallazgos):null;
  const antes=pasosDe(h);
  let pasos=sinRepetir([...antes,...(opts.pasosIniciales||[])]);
  const grupos=opcionesPasos();
  el.innerHTML=`<div class="hp-edit-h2"><button type="button" class="hp-back" id="hfBack" title="Volver" aria-label="Volver"><span class="fig-ico ico-volver" aria-hidden="true"></span></button>
      <h3>${nuevo?"Nuevo hallazgo":`Editar hallazgo${n?" "+n:""}`}</h3><span>${esc(opts.subtitulo||(p?p.nombre:"Sin pantalla"))}</span></div>
    <form class="hp-edit hp-full" id="hfForm">
      <div class="pf"><label>Severidad · 0 a 4</label>${sevScale("hfSev",h.severidad)}</div>
      <div class="pf"><label for="hfDesc">Descripción</label><textarea id="hfDesc">${esc(h.descripcion||"")}</textarea></div>
      <div class="pf"><label for="hfReco">Recomendación</label><textarea id="hfReco">${esc(h.recomendacion||"")}</textarea></div>
      <div class="pf"><label for="hfHeur">Heurística relacionada</label><select id="hfHeur"><option value="">Sin heurística</option>${allHeur().map(x=>`<option value="${x.id}" ${heur0===x.id?'selected':''}>${esc(x.nombre)}</option>`).join("")}</select></div>
      <div class="pf"><label for="hfPant">Pantalla</label>
        <select id="hfPant"></select>
        <div class="hf-pant-acts"><span class="hint">o agregá una nueva:</span><button type="button" class="btn-q" id="hfPantArchivo">Desde un archivo</button><button type="button" class="btn-q" id="hfPantPegar">Pegar del portapapeles</button><input type="file" id="hfPantFile" accept="image/*" hidden></div>
        <div class="hf-pant-prev" id="hfPantPrev"></div></div>
      <div class="pf"><label for="hfPasoAdd">Pasos de flujos y journeys</label><div class="hf-pasos" id="hfPasos"></div>
        ${grupos.length?`<select id="hfPasoAdd"><option value="">+ Agregar a un paso…</option>${grupos.map(g=>`<optgroup label="${esc(g.tipo+": "+g.nombre)}">${g.items.map(it=>`<option value="${it.flujoId}|${it.pasoId}">${esc(it.etiqueta)}</option>`).join("")}</optgroup>`).join("")}</select>`
          :`<span class="hint">Todavía no hay flujos ni journeys con pasos.</span>`}</div>
      <div class="hp-acts"><button type="submit" class="btn-q sel" id="hfSave">${nuevo?"Guardar hallazgo":"Guardar cambios"}</button><button type="button" class="btn-q" id="hfCancel">Cancelar</button><div class="spacer"></div>${!nuevo&&opts.alEliminar?`<button type="button" class="hp-trash" id="hfDel" title="Eliminar hallazgo" aria-label="Eliminar hallazgo"><span class="fig-ico ico-eliminar" aria-hidden="true"></span></button>`:""}</div>
    </form>`;
  const $=id=>el.querySelector("#"+id);
  const pintarOpciones=()=>{ $("hfPant").innerHTML=`<option value="">Sin pantalla</option>${pants.map(x=>`<option value="${x.id}" ${x.id===pantallaId?'selected':''}>${esc(x.nombre)}</option>`).join("")}`; };
  let cargaPrev=0, imgFull=null;
  // Número del hallazgo en su pantalla (el mismo que en Hallazgos) y los de los demás.
  const numero=()=>{ if(!pantallaId) return null; if(!nuevo&&pantallaId===h.pantallaId) return pinNumero(h,state.hallazgos);
    return state.hallazgos.filter(x=>x.pantallaId===pantallaId&&x.id!==h.id).length+1; };
  const otros=()=>state.hallazgos.filter(x=>x.pantallaId===pantallaId&&x.id!==h.id&&x.pin);
  const marco=(pa,id)=>`<div class="hf-pant-img" id="${id}"><img src="${imgFull||pa.thumb||""}" alt="${esc(pa.nombre||"Pantalla")}">
    ${otros().map(x=>`<span class="hf-pin otro" style="left:${x.pin.x*100}%;top:${x.pin.y*100}%" title="${esc(x.titulo||"")}">${pinNumero(x,state.hallazgos)||""}</span>`).join("")}
    <span class="hf-pin mio${pin?"":" centro"}" style="left:${(pin||{x:.5}).x*100}%;top:${(pin||{y:.5}).y*100}%">${numero()||""}</span></div>`;
  const alClic=(caja,repintar)=>caja.onclick=e=>{ const im=caja.querySelector("img"), r=im.getBoundingClientRect();
    pin={x:clamp01((e.clientX-r.left)/r.width),y:clamp01((e.clientY-r.top)/r.height)}; repintar(); };
  const pintarPrev=async()=>{
    const box=$("hfPantPrev"), pa=pants.find(x=>x.id===pantallaId);
    if(!pa){ box.innerHTML=`<span class="hint">Sin pantalla: el hallazgo no va a tener un punto marcado.</span>`; return; }
    box.innerHTML=`<div class="hf-pant-scroll">${marco(pa,"hfPantImg")}</div>
      <div class="hf-pant-pie"><span class="hint">${pin?"Hallazgo ubicado. Clic en otro lugar para moverlo.":"Hacé clic en la pantalla para ubicar el hallazgo."}</span><button type="button" class="btn-q" id="hfPantZoom">Ampliar</button></div>`;
    alClic($("hfPantImg"),pintarPrev);
    $("hfPantZoom").onclick=()=>abrirAmpliado(pa);
    if(!imgFull){ const n=++cargaPrev;
      try{ const d=await pantallaStore.getImg(state.activeId,pa.id); if(n===cargaPrev&&d&&d.base){ imgFull=d.base; const im=el.querySelector("#hfPantImg img"); if(im) im.src=d.base; } }catch(_){} }
  };
  // Panel grande encima (sirve en el panel angosto del journey): ubicar el pin con precisión.
  const abrirAmpliado=pa=>{
    const ov=document.createElement("div"); ov.className="hf-zoom"; ov.setAttribute("role","dialog"); ov.setAttribute("aria-label","Ubicar el hallazgo");
    const pintar=()=>{ ov.innerHTML=`<div class="hf-zoom-box"><div class="hf-zoom-h"><div><b>Ubicá el hallazgo</b><span>${esc(pa.nombre||"Pantalla")} · hacé clic donde está el problema</span></div><button type="button" class="btn-q sel" id="hfZoomOk">Listo</button></div>
      <div class="hf-zoom-sc">${marco(pa,"hfZoomImg")}</div></div>`;
      alClic(ov.querySelector("#hfZoomImg"),pintar);
      ov.querySelector("#hfZoomOk").onclick=cerrarZ; };
    const cerrarZ=()=>{ document.removeEventListener("keydown",tecla,true); ov.remove(); pintarPrev(); };
    const tecla=e=>{ if(e.key==="Escape"){ e.stopPropagation(); cerrarZ(); } };
    pintar(); document.body.appendChild(ov); document.addEventListener("keydown",tecla,true);
    ov.onclick=e=>{ if(e.target===ov) cerrarZ(); };
    ov.querySelector("#hfZoomOk").focus();
  };
  const ocupado=v=>{ ["hfPantArchivo","hfPantPegar"].forEach(id=>{ const b=$(id); if(b) b.disabled=v; }); };
  const subir=async blob=>{
    ocupado(true);
    try{
      const img=await processImage(blob);
      const {pantalla,existente}=await pantallaDesdeImagen(state.activeId,pants,img,(blob.name||"").replace(/\.[a-z0-9]+$/i,""));
      state.pantallas=await pantallaStore.list(state.activeId); pants=state.pantallas;
      pantallaId=pantalla.id; pin=null; imgFull=null; pintarOpciones(); pintarPrev();
      toast(existente?"Esa pantalla ya estaba: se usa la misma":"Pantalla agregada");
    }catch(err){ toast((err&&err.message)||"No se pudo agregar la pantalla"); }
    ocupado(false);
  };
  pintarOpciones(); pintarPrev();
  $("hfPant").onchange=()=>{ pantallaId=$("hfPant").value||null; pin=pantallaId===h.pantallaId&&h.pin?{...h.pin}:null; imgFull=null; pintarPrev(); };
  $("hfPantArchivo").onclick=()=>$("hfPantFile").click();
  $("hfPantFile").onchange=e=>{ const f=e.target.files[0]; if(f&&f.type.indexOf("image")===0) subir(f); e.target.value=""; };
  $("hfPantPegar").onclick=async()=>{
    try{
      const items=await navigator.clipboard.read();
      for(const it of items){ const t=it.types.find(x=>x.indexOf("image/")===0); if(t){ const b=await it.getType(t); return subir(new File([b],"Captura",{type:t})); } }
      toast("No hay una imagen en el portapapeles. Copiá una captura y probá de nuevo.");
    }catch(e){ toast("No se pudo leer el portapapeles. Probá con Cmd/Ctrl + V dentro del formulario."); }
  };
  el.querySelector("#hfForm").addEventListener("paste",e=>{ const it=[...((e.clipboardData&&e.clipboardData.items)||[])].find(x=>x.type&&x.type.indexOf("image")===0); if(it){ e.preventDefault(); const b=it.getAsFile(); if(b) subir(b); } });
  const pintarPasos=()=>{
    $("hfPasos").innerHTML=pasos.length?pasos.map((q,i)=>{ const e=etiquetaPaso(q); return e?`<span class="hf-paso"><span class="hf-paso-t"><b>${esc(e.grupo)}</b> ${esc(e.etiqueta)}</span><button type="button" class="hf-paso-x" data-i="${i}" aria-label="Quitar de ${esc(e.etiqueta)}">×</button></span>`:""; }).join(""):`<span class="hint">En ningún paso.</span>`;
    el.querySelectorAll(".hf-paso-x").forEach(b=>b.onclick=()=>{ pasos.splice(+b.dataset.i,1); pintarPasos(); });
  };
  pintarPasos();
  const add=$("hfPasoAdd"); if(add) add.onchange=()=>{ if(!add.value) return; const [flujoId,pasoId]=add.value.split("|"); pasos=sinRepetir([...pasos,{flujoId,pasoId}]); add.value=""; pintarPasos(); };
  let sev=h.severidad??null;
  bindSev(el,"hfSev",()=>sev,v=>{sev=v;});
  const cerrar=()=>{ if(opts.alCerrar) opts.alCerrar(); };
  $("hfBack").onclick=cerrar; $("hfCancel").onclick=cerrar;
  const del=$("hfDel"); if(del) del.onclick=()=>opts.alEliminar();
  $("hfForm").onsubmit=async e=>{
    e.preventDefault();
    const desc=$("hfDesc").value.trim();
    if(!desc&&!h.titulo){ $("hfDesc").focus(); return; }
    const pid=pantallaId, heur=$("hfHeur").value;
    const resto=ids.filter(id=>id!==heur&&id!==heur0);
    const rec={...h,id:h.id||uid(),descripcion:desc,recomendacion:$("hfReco").value.trim(),severidad:sev,
      catalogoIds:heur?[heur,...resto]:resto, pantallaId:pid,pin:pid?pin:null, pasos:pasos.map(q=>({flujoId:q.flujoId,pasoId:q.pasoId}))};
    if(!h.titulo||h.titulo===autoTitulo(h.descripcion||"")) rec.titulo=autoTitulo(desc);
    // Compatibilidad: el primer paso también en los campos de antes.
    const primero=pasos[0], nd=primero&&etiquetaPaso(primero);
    Object.assign(rec,primero?{flujoId:primero.flujoId,pasoId:primero.pasoId,interaccionId:primero.pasoId,interaccionTitulo:nd?nd.etiqueta.replace(/^\d+\.\s*/,"").replace(/ · .*$/,""):""}
      :{flujoId:null,pasoId:null,interaccionId:null,interaccionTitulo:null});
    const b=$("hfSave"); b.disabled=true;
    try{
      const saved=await guardarHallazgo(rec);
      await sincronizarPasos(saved,antes,rec.pasos);
      if(opts.alGuardar) await opts.alGuardar(saved);
    }catch(err){ console.error("hfSave",err); b.disabled=false; throw err; }
  };
  setTimeout(()=>{ const d=$("hfDesc"); if(d&&nuevo) d.focus(); },30);
}
