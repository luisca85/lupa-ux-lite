import { esc, uid } from "../core/util.js";
import { openConfirm, toast } from "../ui/modales.js";
import { saveReporte } from "./comun.js";

/* ============ Reportes: pestañas propias ============
   r.pestanas = [{id, nombre, tipo:"html"|"texto", html, texto, visible}]. Cada una suma una
   entrada al menú del reporte del cliente (antes de Contacto). HTML: el código pegado se ve
   en un iframe con sandbox. Texto: editor con estilos preformateados; se guarda como HTML
   limpio (limpiarTexto) y SR_boot lo vuelve a limpiar con la misma regla. */
const MAX_HTML=400000; // ~400 KB: el reporte entero viaja en un solo documento

const TXT_OK={P:1,H2:1,H3:1,H4:1,BLOCKQUOTE:1,ASIDE:1,UL:1,OL:1,LI:1,B:1,STRONG:1,I:1,EM:1,U:1,A:1,BR:1,HR:1};
// Misma regla que limpiarTexto en share/boot.js (allá no se puede importar): si cambia, cambiar las dos.
export function limpiarTexto(html){
  const doc=new DOMParser().parseFromString("<div>"+String(html||"")+"</div>","text/html"), box=doc.body.firstChild;
  (function walk(el){ [...el.childNodes].forEach(n=>{
    if(n.nodeType===3) return; if(n.nodeType!==1){ n.remove(); return; }
    if(/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|TEMPLATE|SVG|MATH|NOSCRIPT)$/.test(n.tagName)){ n.remove(); return; }
    walk(n);
    if(!TXT_OK[n.tagName]){ if(n.tagName==="DIV"){ const p=doc.createElement("p"); while(n.firstChild)p.appendChild(n.firstChild); n.replaceWith(p); } else n.replaceWith(...n.childNodes); return; }
    const href=n.tagName==="A"?(n.getAttribute("href")||""):"";
    [...n.attributes].forEach(a=>n.removeAttribute(a.name));
    if(n.tagName==="A"){ if(/^(https?:|mailto:)/i.test(href.trim())){ n.setAttribute("href",href.trim()); n.setAttribute("target","_blank"); n.setAttribute("rel","noopener noreferrer"); } else n.replaceWith(...n.childNodes); }
  }); })(box);
  // Un párrafo no puede contener listas ni otros bloques (el editor a veces los anida).
  [...box.querySelectorAll("p")].forEach(p=>{ if(p.querySelector("ul,ol,h2,h3,h4,blockquote,aside,hr,p")) p.replaceWith(...p.childNodes); });
  return box.innerHTML;
}

/* Lista en el panel de Reportes: visible sí/no, editar, subir/bajar y "+ Nueva pestaña". */
export function renderPestanas(box,est,r,alCambiar){
  const ps=r.pestanas;
  box.innerHTML=`${ps.length?`<ul class="px-list">${ps.map((p,i)=>`<li class="px-item ${p.visible===false?"off":""}">
      <label class="chk" title="${p.visible===false?"Oculta para el cliente":"Visible para el cliente"}"><input type="checkbox" data-vis="${i}" ${p.visible===false?"":"checked"} aria-label="Mostrar ${esc(p.nombre||"pestaña")} al cliente"></label>
      <span class="px-nm"><b>${esc(p.nombre||"(sin nombre)")}</b><small>${p.tipo==="html"?"HTML":"Texto"}${p.visible===false?" · oculta":""}</small></span>
      <button type="button" class="btn ghost sm" data-up="${i}" ${i===0?"disabled":""} aria-label="Subir" title="Subir">↑</button>
      <button type="button" class="btn ghost sm" data-down="${i}" ${i===ps.length-1?"disabled":""} aria-label="Bajar" title="Bajar">↓</button>
      <button type="button" class="btn ghost sm" data-edit="${i}">Editar</button></li>`).join("")}</ul>`
    :`<p class="rhint">Sumá una pestaña al menú del reporte con tu propio contenido: un HTML que pegás o un texto con formato.</p>`}
    <button type="button" class="btn-q" id="pxNueva">+ Nueva pestaña</button>`;
  const cambio=()=>{ saveReporte(est); renderPestanas(box,est,r,alCambiar); alCambiar&&alCambiar(); };
  box.querySelectorAll("[data-vis]").forEach(cb=>cb.onchange=()=>{ ps[+cb.dataset.vis].visible=cb.checked; cambio(); });
  const mover=(i,d)=>{ const j=i+d; if(j<0||j>=ps.length) return; [ps[i],ps[j]]=[ps[j],ps[i]]; cambio(); };
  box.querySelectorAll("[data-up]").forEach(b=>b.onclick=()=>mover(+b.dataset.up,-1));
  box.querySelectorAll("[data-down]").forEach(b=>b.onclick=()=>mover(+b.dataset.down,1));
  box.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editorPestana(est,r,ps[+b.dataset.edit],cambio));
  box.querySelector("#pxNueva").onclick=()=>editorPestana(est,r,null,cambio);
}

const BLOQUES_TXT=[["p","Párrafo"],["h2","Título"],["h3","Subtítulo"],["blockquote","Cita"],["aside","Destacado"]];
function editorPestana(est,r,p,alGuardar){
  const nueva=!p, d=p?{...p}:{id:uid(),nombre:"",tipo:"texto",html:"",texto:"",visible:true};
  const root=document.getElementById("modalRoot");
  root.innerHTML=`<div class="modal-bg"><div class="modal px-modal" role="dialog" aria-modal="true" aria-labelledby="pxT">
    <div class="modal-h"><h3 id="pxT">${nueva?"Nueva pestaña":"Editar pestaña"}</h3><button class="icon-btn" id="pxX" aria-label="Cerrar" style="width:32px;height:32px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>
    <div class="modal-b">
      <div class="px-top">
        <label class="px-f"><span class="rlab">Nombre en el menú</span><input id="pxNom" maxlength="40" placeholder="Por ejemplo: Benchmark" value="${esc(d.nombre)}"></label>
        <div class="px-f"><span class="rlab">Contenido</span><div class="px-seg" role="radiogroup" aria-label="Tipo de contenido">
          <button type="button" role="radio" data-tipo="texto" aria-checked="${d.tipo!=="html"}" class="${d.tipo!=="html"?"on":""}">Texto con formato</button>
          <button type="button" role="radio" data-tipo="html" aria-checked="${d.tipo==="html"}" class="${d.tipo==="html"?"on":""}">HTML</button></div></div>
        <label class="chk px-vis"><input type="checkbox" id="pxVis" ${d.visible===false?"":"checked"}> Mostrar al cliente</label>
      </div>
      <div id="pxBody"></div>
      <span class="hint" id="pxMsg"></span>
    </div>
    <div class="modal-f">${nueva?"":`<button type="button" class="btn-q pub-danger" id="pxDel">Eliminar pestaña</button>`}<span class="grow"></span><button class="btn ghost" id="pxCancel">Cancelar</button><button class="btn primary" id="pxSave">${nueva?"Crear pestaña":"Guardar"}</button></div>
  </div></div>`;
  const $=id=>root.querySelector("#"+id), body=$("pxBody");
  // Lo escrito en cada modo se conserva al cambiar de uno a otro (se guarda solo el del tipo elegido).
  const leer=()=>{ const ed=$("pxEd"), code=$("pxCode"); if(ed) d.texto=ed.innerHTML; if(code) d.html=code.value; };
  const pintar=()=>{ body.innerHTML=d.tipo==="html"?vistaHtml(d):vistaTexto(d); (d.tipo==="html"?bindHtml:bindTexto)(root,d); };
  root.querySelectorAll("[data-tipo]").forEach(b=>b.onclick=()=>{ if(d.tipo===b.dataset.tipo) return; leer(); d.tipo=b.dataset.tipo;
    root.querySelectorAll("[data-tipo]").forEach(x=>{ const on=x.dataset.tipo===d.tipo; x.classList.toggle("on",on); x.setAttribute("aria-checked",on); }); pintar(); });
  pintar();
  const onKey=e=>{ if(e.key==="Escape"&&!root.querySelector(".px-link-pop:not([hidden])")) close(); };
  const close=()=>{ root.innerHTML=""; document.removeEventListener("keydown",onKey); };
  document.addEventListener("keydown",onKey);
  $("pxX").onclick=close; $("pxCancel").onclick=close;
  if($("pxDel")) $("pxDel").onclick=()=>{ document.removeEventListener("keydown",onKey);
    openConfirm("Eliminar pestaña",`La pestaña "${esc(d.nombre||"sin nombre")}" deja de aparecer en el reporte. No se puede deshacer.`,()=>{
      r.pestanas=r.pestanas.filter(x=>x.id!==d.id); alGuardar(); toast("Pestaña eliminada"); }); };
  $("pxSave").onclick=()=>{
    leer(); const msg=$("pxMsg"); d.nombre=$("pxNom").value.trim(); d.visible=$("pxVis").checked;
    if(!d.nombre){ msg.textContent="Poné un nombre para el menú."; $("pxNom").focus(); return; }
    if(d.tipo==="html"&&!d.html.trim()){ msg.textContent="Pegá el código HTML."; $("pxCode").focus(); return; }
    if(d.tipo==="html"&&d.html.length>MAX_HTML){ msg.textContent=`El HTML pesa ${Math.round(d.html.length/1000)} KB; el máximo es ${MAX_HTML/1000} KB. Probá sin imágenes incrustadas.`; return; }
    d.texto=limpiarTexto(d.texto);
    const out={id:d.id,nombre:d.nombre,tipo:d.tipo,visible:d.visible,html:d.tipo==="html"?d.html:"",texto:d.tipo==="html"?"":d.texto};
    const i=r.pestanas.findIndex(x=>x.id===d.id); if(i>=0) r.pestanas[i]=out; else r.pestanas.push(out);
    close(); alGuardar(); toast(nueva?"Pestaña creada":"Pestaña guardada");
  };
  setTimeout(()=>$("pxNom").focus(),40);
}

/* ---- Modo HTML: código a la izquierda, vista previa (con sandbox) a la derecha ---- */
function vistaHtml(d){
  return `<div class="px-html">
    <label class="px-f"><span class="rlab">Código HTML <small>Pegá un documento completo o un fragmento, con sus estilos.</small></span>
      <textarea id="pxCode" spellcheck="false" placeholder="&lt;style&gt;h1{color:#2563eb}&lt;/style&gt;&#10;&lt;h1&gt;Hola&lt;/h1&gt;">${esc(d.html)}</textarea></label>
    <div class="px-f"><span class="rlab">Así se ve en el reporte</span><iframe id="pxPrev" class="px-prev" title="Vista previa del HTML" sandbox="allow-scripts allow-popups" referrerpolicy="no-referrer"></iframe></div>
  </div>`;
}
function bindHtml(root,d){
  const code=root.querySelector("#pxCode"), prev=root.querySelector("#pxPrev"); let t=null;
  const pintar=()=>{ prev.srcdoc=code.value; };
  code.oninput=()=>{ clearTimeout(t); t=setTimeout(pintar,300); };
  // Tab inserta dos espacios en lugar de salir del campo.
  code.onkeydown=e=>{ if(e.key==="Tab"&&!e.shiftKey){ e.preventDefault(); const a=code.selectionStart, b=code.selectionEnd; code.setRangeText("  ",a,b,"end"); code.oninput(); } };
  pintar();
}

/* ---- Modo texto: editor con estilos preformateados (los mismos del reporte) ---- */
function vistaTexto(d){
  return `<div class="px-txt">
    <div class="px-bar" role="toolbar" aria-label="Formato">
      <select id="pxBlk" aria-label="Estilo del párrafo">${BLOQUES_TXT.map(([v,l])=>`<option value="${v}">${l}</option>`).join("")}</select>
      <span class="px-sep"></span>
      <button type="button" data-cmd="bold" title="Negrita (Ctrl/Cmd+B)" aria-label="Negrita"><b>B</b></button>
      <button type="button" data-cmd="italic" title="Cursiva (Ctrl/Cmd+I)" aria-label="Cursiva"><i>I</i></button>
      <button type="button" data-cmd="underline" title="Subrayado (Ctrl/Cmd+U)" aria-label="Subrayado"><u>U</u></button>
      <span class="px-sep"></span>
      <button type="button" data-cmd="insertUnorderedList" title="Lista con viñetas" aria-label="Lista con viñetas">• Lista</button>
      <button type="button" data-cmd="insertOrderedList" title="Lista numerada" aria-label="Lista numerada">1. Lista</button>
      <button type="button" data-cmd="insertHorizontalRule" title="Separador" aria-label="Separador">―</button>
      <span class="px-sep"></span>
      <button type="button" id="pxLink" title="Link" aria-label="Link">Link</button>
      <button type="button" data-cmd="removeFormat" title="Quitar formato" aria-label="Quitar formato">Limpiar</button>
      <div class="px-link-pop" id="pxLinkPop" hidden><input id="pxLinkUrl" placeholder="https://…" aria-label="Dirección del link"><button type="button" class="btn-q sel" id="pxLinkOk">Aplicar</button><button type="button" class="btn-q" id="pxLinkNo">Quitar</button></div>
    </div>
    <div class="px-ed cr-prose cr-px-texto" id="pxEd" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Texto de la pestaña" data-ph="Escribí acá. Elegí Título, Subtítulo, Cita o Destacado en el menú de estilos.">${limpiarTexto(d.texto)||"<p><br></p>"}</div>
  </div>`;
}
function bindTexto(root,d){
  const ed=root.querySelector("#pxEd"), blk=root.querySelector("#pxBlk");
  document.execCommand("defaultParagraphSeparator",false,"p");
  const vacio=()=>ed.classList.toggle("vacio",!ed.textContent.trim()&&!ed.querySelector("li,hr"));
  ed.addEventListener("input",vacio); vacio();
  // Bloque actual: hijo directo del editor que contiene el cursor.
  const bloque=()=>{ const s=getSelection(); if(!s.rangeCount) return null; let n=s.anchorNode; if(!ed.contains(n)) return null;
    while(n&&n.parentNode!==ed) n=n.parentNode; return n&&n.nodeType===1?n:null; };
  const sync=()=>{ const b=bloque(); const t=b?b.tagName.toLowerCase():"p"; blk.value=BLOQUES_TXT.some(([v])=>v===t)?t:"p"; };
  ed.addEventListener("keyup",sync); ed.addEventListener("mouseup",sync); ed.addEventListener("focus",sync);
  blk.onchange=()=>{ ed.focus(); const b=bloque(); if(!b||/^(UL|OL|HR)$/.test(b.tagName)) return;
    const nuevo=document.createElement(blk.value); while(b.firstChild) nuevo.appendChild(b.firstChild); if(!nuevo.firstChild) nuevo.appendChild(document.createElement("br"));
    b.replaceWith(nuevo); const rg=document.createRange(); rg.selectNodeContents(nuevo); rg.collapse(false); const s=getSelection(); s.removeAllRanges(); s.addRange(rg); };
  // Las listas que Chrome mete dentro de un <p> se sacan afuera (el cursor queda donde estaba).
  const desanidar=()=>ed.querySelectorAll(":scope>p").forEach(p=>{ if(p.querySelector("ul,ol")) p.replaceWith(...p.childNodes); });
  root.querySelectorAll("[data-cmd]").forEach(b=>{ b.onmousedown=e=>e.preventDefault(); b.onclick=()=>{ ed.focus(); document.execCommand(b.dataset.cmd,false,null); desanidar(); sync(); vacio(); }; });
  // Enter en una Cita o un Destacado vacíos vuelve a Párrafo (para salir del bloque).
  ed.addEventListener("keydown",e=>{ if(e.key!=="Enter"||e.shiftKey) return; const b=bloque();
    if(!b||!/^(ASIDE|BLOCKQUOTE)$/.test(b.tagName)||b.textContent.trim()||b.querySelector("li")) return;
    e.preventDefault(); const p=document.createElement("p"); p.appendChild(document.createElement("br")); b.replaceWith(p);
    const rg=document.createRange(); rg.setStart(p,0); rg.collapse(true); const s=getSelection(); s.removeAllRanges(); s.addRange(rg); sync(); });
  // Pegar: se queda con la estructura que el reporte entiende (títulos, listas, negritas, links).
  ed.addEventListener("paste",e=>{ const cd=e.clipboardData; if(!cd) return; e.preventDefault();
    const h=cd.getData("text/html"), t=cd.getData("text/plain");
    const html=h?limpiarTexto(h):esc(t).split(/\n{2,}/).map(x=>`<p>${x.replace(/\n/g,"<br>")}</p>`).join("");
    document.execCommand("insertHTML",false,html); });
  // Link
  const pop=root.querySelector("#pxLinkPop"), url=root.querySelector("#pxLinkUrl"); let rango=null;
  root.querySelector("#pxLink").onmousedown=e=>e.preventDefault();
  root.querySelector("#pxLink").onclick=()=>{ const s=getSelection(); if(!s.rangeCount||!ed.contains(s.anchorNode)){ toast("Seleccioná el texto del link"); return; }
    rango=s.getRangeAt(0).cloneRange(); const a=s.anchorNode.parentElement&&s.anchorNode.parentElement.closest("a"); url.value=a?a.getAttribute("href"):"";
    pop.hidden=false; url.focus(); };
  const volver=()=>{ pop.hidden=true; ed.focus(); if(rango){ const s=getSelection(); s.removeAllRanges(); s.addRange(rango); } };
  root.querySelector("#pxLinkOk").onclick=()=>{ let u=url.value.trim(); if(u&&!/^(https?:|mailto:)/i.test(u)) u="https://"+u; volver(); if(u) document.execCommand("createLink",false,u); };
  root.querySelector("#pxLinkNo").onclick=()=>{ volver(); document.execCommand("unlink"); };
  url.onkeydown=e=>{ if(e.key==="Enter"){ e.preventDefault(); root.querySelector("#pxLinkOk").click(); } else if(e.key==="Escape"){ e.preventDefault(); e.stopPropagation(); volver(); } };
}
