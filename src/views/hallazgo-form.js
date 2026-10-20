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

// Cambiar el nombre de una pantalla también lo cambia en las interacciones de los flows que la
// usan y que todavía llevaban el nombre anterior (o "Interacción N").
export async function renombrarPantalla(pid,nombre){
  const p=(state.pantallas||[]).find(x=>x.id===pid); if(!p||!nombre||p.nombre===nombre) return;
  const viejo=p.nombre;
  await pantallaStore.save(state.activeId,{...p,nombre});
  state.pantallas=await pantallaStore.list(state.activeId);
  for(const f of (state.flujos||[]).filter(x=>x.tipo!=="User Journey")){
    let cambio=false;
    (f.nodes||[]).forEach(n=>{ if(n.pantallaId===pid&&(!n.titulo||n.titulo===viejo||/^Interacción \d+$/.test(n.titulo))){ n.titulo=nombre; cambio=true; } });
    if(cambio) await flowStore.save(state.activeId,f);
  }
}

/* Formulario en un contenedor (panel de Hallazgos, de la interacción o del journey).
   opts: nuevo, subtitulo, pasosIniciales, alCerrar(), alGuardar(guardado), alEliminar().
   Dos vistas en el mismo panel: el formulario y "Agregar pantalla" (subir o elegir la imagen,
   ubicar el pin y guardar). Lo escrito se conserva al ir y volver: vive en el borrador "d". */
export function formularioHallazgo(el,h,opts){
  opts=opts||{};
  const nuevo=!!opts.nuevo, ids=catalogoIdsDe(h), heur0=ids.find(id=>heurById(id))||"";
  const antes=pasosDe(h);
  const d={sev:h.severidad??null, descripcion:h.descripcion||"", recomendacion:h.recomendacion||"", heur:heur0,
    pasos:sinRepetir([...antes,...(opts.pasosIniciales||[])]),
    pantallaId:h.pantallaId||null, pin:h.pin?{...h.pin}:null,
    pendiente:null, // pantalla nueva todavía sin guardar: {img, nombre}; se crea al guardar el hallazgo
    renombre:null}; // nombre nuevo para una pantalla existente: se aplica al guardar el hallazgo
  const $=id=>el.querySelector("#"+id);
  const pants=()=>state.pantallas||[];
  const n0=h.pantallaId&&!nuevo?pinNumero(h,state.hallazgos):null;
  const cerrar=()=>{ if(opts.alCerrar) opts.alCerrar(); };
  // Número del hallazgo en una pantalla (el mismo que en Hallazgos) y los pines de los demás.
  const numeroEn=pid=>{ if(!nuevo&&pid===h.pantallaId) return pinNumero(h,state.hallazgos);
    return state.hallazgos.filter(x=>x.pantallaId===pid&&x.id!==h.id).length+1; };
  const otrosEn=pid=>pid?state.hallazgos.filter(x=>x.pantallaId===pid&&x.id!==h.id&&x.pin):[];
  const marco=(src,pid,pin,id)=>`<div class="hf-pant-img" id="${id}"><img src="${src||""}" alt="Pantalla">
    ${otrosEn(pid).map(x=>`<span class="hf-pin otro" style="left:${x.pin.x*100}%;top:${x.pin.y*100}%" title="${esc(x.titulo||"")}">${pinNumero(x,state.hallazgos)||""}</span>`).join("")}
    ${pin?`<span class="hf-pin mio" style="left:${pin.x*100}%;top:${pin.y*100}%">${pid?numeroEn(pid)||"":"1"}</span>`:""}</div>`;
  const imgDe=async pid=>{ try{ const x=await pantallaStore.getImg(state.activeId,pid); return x&&x.base; }catch(_){ return null; } };

  /* ---- Vista 1: formulario ---- */
  function vistaFormulario(){
    const grupos=opcionesPasos();
    const pa=pants().find(x=>x.id===d.pantallaId);
    const conPant=!!(pa||d.pendiente);
    el.innerHTML=`<div class="hp-edit-h2"><button type="button" class="hp-back" id="hfBack" title="Volver" aria-label="Volver"><span class="fig-ico ico-volver" aria-hidden="true"></span></button>
      <h3>${nuevo?"Nuevo hallazgo":`Editar hallazgo${n0?" "+n0:""}`}</h3><span>${esc(opts.subtitulo||(pa?pa.nombre:"Sin pantalla"))}</span></div>
    <form class="hp-edit hp-full" id="hfForm">
      <div class="pf"><label>Severidad · 0 a 4</label>${sevScale("hfSev",d.sev)}</div>
      <div class="pf"><label for="hfDesc">Descripción</label><textarea id="hfDesc">${esc(d.descripcion)}</textarea></div>
      <div class="pf"><label for="hfReco">Recomendación</label><textarea id="hfReco">${esc(d.recomendacion)}</textarea></div>
      <div class="pf"><label for="hfHeur">Heurística relacionada</label><select id="hfHeur"><option value="">Sin heurística</option>${allHeur().map(x=>`<option value="${x.id}" ${d.heur===x.id?'selected':''}>${esc(x.nombre)}</option>`).join("")}</select></div>
      <div class="pf"><label>Pantalla</label>
        ${conPant?`<div class="hf-pant-res"><div class="hf-pant-mini" id="hfMini"></div><div class="hf-pant-res-t"><b>${esc(d.pendiente?(d.pendiente.nombre||"Pantalla nueva"):(d.renombre||pa.nombre))}</b><span>${d.pendiente?"Nueva: se guarda con el hallazgo":(d.pin?"Con su punto marcado":"Sin punto marcado")}</span>
            <div class="hf-pant-res-a"><button type="button" class="btn-q" id="hfPantCambiar">Cambiar</button><button type="button" class="btn-q" id="hfPantQuitar">Quitar pantalla</button></div></div></div>`
          :`<div class="hf-pant-res vacia"><span class="hint">Sin pantalla</span><button type="button" class="btn-q" id="hfPantAgregar">+ Agregar pantalla</button></div>`}
      </div>
      <div class="pf"><label for="hfPasoAdd">Pasos de flujos y journeys</label><div class="hf-pasos" id="hfPasos"></div>
        ${grupos.length?`<select id="hfPasoAdd"><option value="">+ Agregar a un paso…</option>${grupos.map(g=>`<optgroup label="${esc(g.tipo+": "+g.nombre)}">${g.items.map(it=>`<option value="${it.flujoId}|${it.pasoId}">${esc(it.etiqueta)}</option>`).join("")}</optgroup>`).join("")}</select>`
          :`<span class="hint">Todavía no hay flujos ni journeys con pasos.</span>`}</div>
      <div class="hp-acts"><button type="submit" class="btn-q sel" id="hfSave">${nuevo?"Guardar hallazgo":"Guardar cambios"}</button><button type="button" class="btn-q" id="hfCancel">Cancelar</button><div class="spacer"></div>${!nuevo&&opts.alEliminar?`<button type="button" class="hp-trash" id="hfDel" title="Eliminar hallazgo" aria-label="Eliminar hallazgo"><span class="fig-ico ico-eliminar" aria-hidden="true"></span></button>`:""}</div>
    </form>`;
    const leer=()=>{ d.descripcion=$("hfDesc").value; d.recomendacion=$("hfReco").value; d.heur=$("hfHeur").value; };
    bindSev(el,"hfSev",()=>d.sev,v=>{d.sev=v;});
    // miniatura con el pin
    if(conPant){ const src=d.pendiente?d.pendiente.img.full.dataUrl:(pa.thumb||""); $("hfMini").innerHTML=marco(src,d.pendiente?null:d.pantallaId,d.pin,"hfMiniImg");
      if(!d.pendiente) imgDe(pa.id).then(b=>{ const im=el.querySelector("#hfMiniImg img"); if(b&&im) im.src=b; }); }
    const irPantalla=()=>{ leer(); vistaPantalla(); };
    [$("hfPantAgregar"),$("hfPantCambiar")].forEach(b=>{ if(b) b.onclick=irPantalla; });
    const q=$("hfPantQuitar"); if(q) q.onclick=()=>{ leer(); d.pantallaId=null; d.pin=null; d.pendiente=null; d.renombre=null; vistaFormulario(); };
    const pintarPasos=()=>{
      $("hfPasos").innerHTML=d.pasos.length?d.pasos.map((q,i)=>{ const e=etiquetaPaso(q); return e?`<span class="hf-paso"><span class="hf-paso-t"><b>${esc(e.grupo)}</b> ${esc(e.etiqueta)}</span><button type="button" class="hf-paso-x" data-i="${i}" aria-label="Quitar de ${esc(e.etiqueta)}">×</button></span>`:""; }).join(""):`<span class="hint">En ningún paso.</span>`;
      el.querySelectorAll(".hf-paso-x").forEach(b=>b.onclick=()=>{ d.pasos.splice(+b.dataset.i,1); pintarPasos(); });
    };
    pintarPasos();
    const add=$("hfPasoAdd"); if(add) add.onchange=()=>{ if(!add.value) return; const [flujoId,pasoId]=add.value.split("|"); d.pasos=sinRepetir([...d.pasos,{flujoId,pasoId}]); add.value=""; pintarPasos(); };
    $("hfBack").onclick=cerrar; $("hfCancel").onclick=cerrar;
    const del=$("hfDel"); if(del) del.onclick=()=>opts.alEliminar();
    $("hfForm").onsubmit=async e=>{
      e.preventDefault(); leer();
      const desc=d.descripcion.trim();
      if(!desc&&!h.titulo){ $("hfDesc").focus(); return; }
      const b=$("hfSave"); b.disabled=true; b.textContent="Guardando…";
      try{
        // La pantalla nueva se crea recién ahora (si se cancela, no queda una pantalla suelta).
        if(d.pendiente){
          const {pantalla,existente}=await pantallaDesdeImagen(state.activeId,pants(),d.pendiente.img,d.pendiente.nombre);
          if(existente&&d.pendiente.nombre&&pantalla.nombre!==d.pendiente.nombre) d.renombre=d.pendiente.nombre;
          state.pantallas=await pantallaStore.list(state.activeId); d.pantallaId=pantalla.id; d.pendiente=null;
        }
        if(d.renombre&&d.pantallaId){ await renombrarPantalla(d.pantallaId,d.renombre); d.renombre=null; }
        const heur=d.heur, resto=ids.filter(id=>id!==heur&&id!==heur0);
        const rec={...h,id:h.id||uid(),descripcion:desc,recomendacion:d.recomendacion.trim(),severidad:d.sev,
          catalogoIds:heur?[heur,...resto]:resto, pantallaId:d.pantallaId,pin:d.pantallaId?d.pin:null, pasos:d.pasos.map(q=>({flujoId:q.flujoId,pasoId:q.pasoId}))};
        if(!h.titulo||h.titulo===autoTitulo(h.descripcion||"")) rec.titulo=autoTitulo(desc);
        // Compatibilidad: el primer paso también en los campos de antes.
        const primero=d.pasos[0], nd=primero&&etiquetaPaso(primero);
        Object.assign(rec,primero?{flujoId:primero.flujoId,pasoId:primero.pasoId,interaccionId:primero.pasoId,interaccionTitulo:nd?nd.etiqueta.replace(/^\d+\.\s*/,"").replace(/ · .*$/,""):""}
          :{flujoId:null,pasoId:null,interaccionId:null,interaccionTitulo:null});
        const saved=await guardarHallazgo(rec);
        await sincronizarPasos(saved,antes,rec.pasos);
        if(opts.alGuardar) await opts.alGuardar(saved);
      }catch(err){ console.error("hfSave",err); b.disabled=false; b.textContent=nuevo?"Guardar hallazgo":"Guardar cambios"; toast((err&&err.message)||"No se pudo guardar. Probá de nuevo."); }
    };
    if(nuevo) setTimeout(()=>{ const x=$("hfDesc"); if(x&&!x.value) x.focus(); },30);
  }

  /* ---- Vista 2: Agregar pantalla (subir o elegir, ubicar el pin y guardar) ---- */
  function vistaPantalla(){
    const sel={pantallaId:d.pantallaId, pendiente:d.pendiente, pin:d.pin?{...d.pin}:null,
      nombre:d.pendiente?d.pendiente.nombre:(d.renombre||((pants().find(x=>x.id===d.pantallaId)||{}).nombre)||"")};
    let src=null;
    // Pestaña inicial: si el estudio ya tiene pantallas, elegir una (así no se duplican imágenes).
    let modo=pants().length?"existentes":"subir";
    const sugerido=()=>`Pantalla ${pants().length+1}`;
    const pintar=()=>{
      const inp=$("hpsNombre"); if(inp) sel.nombre=inp.value; // conservar lo escrito al repintar
      const pa=pants().find(x=>x.id===sel.pantallaId), hay=!!(pa||sel.pendiente);
      el.innerHTML=`<div class="hp-edit-h2"><button type="button" class="hp-back" id="hpsBack" title="Volver al hallazgo" aria-label="Volver al hallazgo"><span class="fig-ico ico-volver" aria-hidden="true"></span></button>
        <h3>Agregar pantalla</h3><span>${nuevo?"Nuevo hallazgo":"Editar hallazgo"}</span></div>
      <div class="hp-edit hp-full hps" id="hpsBox" tabindex="-1">
        <button type="button" class="hps-volver" id="hpsVolver">← Volver al formulario del hallazgo</button>
        ${hay?`<div class="pf"><label for="hpsNombre">Nombre de la pantalla</label><input id="hpsNombre" value="${esc(sel.nombre||"")}" placeholder="${esc(pa?pa.nombre:sugerido())}" maxlength="80">
            ${pa?`<span class="hint">Si lo cambiás, cambia en Hallazgos y en los flujos que usan esta pantalla.</span>`:""}</div>
          <div class="pf"><label>Ubicá el hallazgo</label>
            <div class="hf-pant-scroll">${marco(src||(sel.pendiente?sel.pendiente.img.full.dataUrl:(pa.thumb||"")),sel.pendiente?null:sel.pantallaId,sel.pin,"hpsImg")}</div>
            <span class="hint">${sel.pin?"Listo. Hacé clic en otro lugar para mover el pin.":"Hacé clic en la pantalla para colocar el pin del hallazgo."}</span>
            <button type="button" class="hps-otra" id="hpsOtra">Usar otra imagen</button></div>`
          :`<div class="hps-tabs" role="tablist" aria-label="Origen de la pantalla">
              <button type="button" role="tab" class="hps-tab${modo==="existentes"?" on":""}" data-modo="existentes" aria-selected="${modo==="existentes"}" ${pants().length?"":"disabled"}>Pantallas del estudio <span class="cnt">${pants().length}</span></button>
              <button type="button" role="tab" class="hps-tab${modo==="subir"?" on":""}" data-modo="subir" aria-selected="${modo==="subir"}">Subir nueva</button></div>
            ${modo==="existentes"?`<span class="hint">Elegí la pantalla del hallazgo. Después ubicás el pin.</span>
              ${pants().length>8?`<input class="hps-buscar" id="hpsBuscar" placeholder="Buscar pantalla…" aria-label="Buscar pantalla">`:""}
              <div class="hps-grid" id="hpsGrid">${pants().map(x=>{ const nh=state.hallazgos.filter(y=>y.pantallaId===x.id).length;
                return `<button type="button" class="hps-pant" data-pid="${x.id}" data-nombre="${esc((x.nombre||"").toLowerCase())}"><img src="${x.thumb||""}" alt=""><span class="hps-pant-n">${esc(x.nombre||"Pantalla")}</span><span class="hps-pant-c">${nh?`${nh} ${nh===1?"hallazgo":"hallazgos"}`:"Sin hallazgos"}</span></button>`; }).join("")}</div>`
            :`<div class="hps-drop" id="hpsDrop" tabindex="0" role="button" aria-label="Subir una imagen">
              <b>Subí la captura de la pantalla</b>
              <span>Pegala con <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>V</kbd>, arrastrala acá o elegí un archivo.</span>
              <div class="hps-drop-a"><button type="button" class="btn-q" id="hpsArchivo">Elegir archivo</button><button type="button" class="btn-q" id="hpsPegar">Pegar del portapapeles</button></div>
              <input type="file" id="hpsFile" accept="image/*" hidden></div>
            <span class="hint">Si la imagen ya está cargada, se usa la misma pantalla (no se duplica).</span>`}`}
        <div class="hp-acts"><button type="button" class="btn-q sel" id="hpsGuardar" ${hay&&sel.pin?"":"disabled"}>Guardar pantalla y pin</button><button type="button" class="btn-q" id="hpsCancel">Cancelar</button></div>
      </div>`;
      const volver=()=>{ document.removeEventListener("paste",alPegar); vistaFormulario(); };
      $("hpsBack").onclick=volver; $("hpsVolver").onclick=volver; $("hpsCancel").onclick=volver;
      $("hpsGuardar").onclick=()=>{
        const pa2=pants().find(x=>x.id===sel.pantallaId), nom=($("hpsNombre")?$("hpsNombre").value:sel.nombre||"").trim();
        d.pantallaId=sel.pantallaId; d.pin=sel.pin;
        d.pendiente=sel.pendiente?{...sel.pendiente,nombre:nom||sugerido()}:null;
        d.renombre=pa2&&nom&&nom!==pa2.nombre?nom:null;
        volver(); toast("Pantalla lista: guardá el hallazgo para terminar"); };
      if(hay){
        const caja=$("hpsImg"); caja.onclick=e=>{ const im=caja.querySelector("img"), r=im.getBoundingClientRect(); sel.pin={x:clamp01((e.clientX-r.left)/r.width),y:clamp01((e.clientY-r.top)/r.height)}; pintar(); };
        $("hpsOtra").onclick=()=>{ sel.pantallaId=null; sel.pendiente=null; sel.pin=null; src=null; sel.nombre=""; pintar(); };
        if(pa&&!src) imgDe(pa.id).then(b=>{ if(b){ src=b; const im=el.querySelector("#hpsImg img"); if(im) im.src=b; } });
      } else {
        el.querySelectorAll(".hps-tab").forEach(b=>b.onclick=()=>{ if(b.disabled) return; modo=b.dataset.modo; pintar(); });
        const bus=$("hpsBuscar"); if(bus) bus.oninput=()=>{ const q=bus.value.trim().toLowerCase(); el.querySelectorAll(".hps-pant").forEach(x=>x.hidden=!!q&&!x.dataset.nombre.includes(q)); };
        el.querySelectorAll(".hps-pant").forEach(b=>b.onclick=()=>{ sel.pantallaId=b.dataset.pid; sel.pendiente=null; sel.pin=null; src=null; sel.nombre=((pants().find(x=>x.id===b.dataset.pid)||{}).nombre)||""; pintar(); });
      }
      if(!hay&&modo==="subir"){
        $("hpsArchivo").onclick=()=>$("hpsFile").click();
        $("hpsFile").onchange=e=>{ const f=e.target.files[0]; if(f) cargar(f); e.target.value=""; };
        $("hpsPegar").onclick=async()=>{ try{ const items=await navigator.clipboard.read();
            for(const it of items){ const t=it.types.find(x=>x.indexOf("image/")===0); if(t){ return cargar(new File([await it.getType(t)],"Captura",{type:t})); } }
            toast("No hay una imagen en el portapapeles. Copiá una captura y probá de nuevo."); }
          catch(e){ toast("No se pudo leer el portapapeles: probá con Ctrl/Cmd + V."); } };
        const drop=$("hpsDrop");
        drop.ondragover=e=>{ e.preventDefault(); drop.classList.add("drag"); }; drop.ondragleave=()=>drop.classList.remove("drag");
        drop.ondrop=e=>{ e.preventDefault(); drop.classList.remove("drag"); const f=e.dataTransfer.files[0]; if(f) cargar(f); };
      }
    };
    const cargar=async f=>{
      if(!f||f.type.indexOf("image")!==0){ toast("Ese archivo no es una imagen"); return; }
      try{ const img=await processImage(f); const base=String(f.name||"").replace(/\.[a-z0-9]+$/i,"").trim();
        const generico=/^(image|imagen|captura|screenshot|captura de pantalla|pasted|clipboard)\b/i.test(base)||/^\d+$/.test(base);
        sel.pendiente={img,nombre:""}; sel.nombre=generico?"":base; sel.pantallaId=null; sel.pin=null; src=null; pintar();
        const inp=$("hpsNombre"); if(inp&&!inp.value){ inp.focus(); } }
      catch(e){ toast("No se pudo procesar la imagen"); }
    };
    // Ctrl/Cmd + V mientras esta sección está abierta.
    const alPegar=e=>{ if(!el.isConnected||!el.querySelector("#hpsBox")){ document.removeEventListener("paste",alPegar); return; }
      const it=[...((e.clipboardData&&e.clipboardData.items)||[])].find(x=>x.type&&x.type.indexOf("image")===0);
      if(it){ e.preventDefault(); cargar(it.getAsFile()); } };
    document.addEventListener("paste",alPegar);
    pintar();
    const box=$("hpsBox"); if(box) box.focus();
  }

  vistaFormulario();
}
