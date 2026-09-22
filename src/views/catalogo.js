import { view } from "../app/render.js";
import { allHeur, allSesgos, state } from "../core/state.js";
import { esc, uid } from "../core/util.js";
import { store } from "../data/store.js";
import { plus, searchIco, trash, x } from "../ui/iconos.js";
import { emptyInline, openConfirm, openModal, toast } from "../ui/modales.js";

/* ============ Vista: Catálogo ============ */
export function renderCatalogo(){
  const cats=["todos","Heurísticas","Ley de UX","Sesgo cognitivo","Memoria","Principio"];
  view.innerHTML=`<div class="sec-head"><div class="t"><h2>Catálogo</h2>
    <p>Tu biblioteca de criterios: las 10 heurísticas de Nielsen y un set de sesgos y patrones de psicología del usuario. Podés agregar los tuyos. Las descripciones son editables para adaptarlas a tu criterio.</p></div></div>
    <div class="cat-controls">
      <div class="search">${searchIco()}<input id="catSearch" placeholder="Buscar en el catálogo..." value="${esc(state.catQuery)}"></div>
    </div>
    <div class="filter-pills" id="catPills">${cats.map(c=>`<button class="pill ${state.catFilter===c?'on':''}" data-f="${c}">${c==='todos'?'Todos':c}</button>`).join("")}</div>
    <div id="catBody" style="margin-top:22px"></div>`;
  document.getElementById("catSearch").oninput=e=>{state.catQuery=e.target.value;renderCatBody();};
  document.getElementById("catPills").querySelectorAll(".pill").forEach(p=>p.onclick=()=>{state.catFilter=p.dataset.f;renderCatalogo();});
  renderCatBody();
}
function renderCatBody(){
  const q=state.catQuery.trim().toLowerCase(), f=state.catFilter;
  const showHeur = f==="todos"||f==="Heurísticas";
  const showSesgos = f==="todos"||["Ley de UX","Sesgo cognitivo","Memoria","Principio"].includes(f);
  const matchH=h=>!q||(h.nombre+" "+h.desc+" "+(h.revisar||[]).join(" ")).toLowerCase().includes(q);
  const matchS=s=>(f==="todos"||f==="Heurísticas"?true:s.categoria===f)&&(!q||(s.nombre+" "+s.desc+" "+s.aplicacion+" "+s.categoria).toLowerCase().includes(q));
  const heur=allHeur().filter(matchH);
  const sesgos=allSesgos().filter(matchS);
  let html="";
  if(showHeur){
    html+=`<div class="cat-block"><h3>Heurísticas${f==='todos'?'':''} <button class="btn ghost sm" id="addHeur" style="margin-left:auto">${plus()} Agregar</button></h3>
      <div class="cat-grid">${heur.map(heurCard).join("")||emptyInline("No hay heurísticas que coincidan.")}</div></div>`;
  }
  if(showSesgos){
    html+=`<div class="cat-block"><h3>Sesgos y patrones <button class="btn ghost sm" id="addSesgo" style="margin-left:auto">${plus()} Agregar</button></h3>
      <div class="cat-grid">${sesgos.map(sesgoCard).join("")||emptyInline("No hay sesgos que coincidan.")}</div></div>`;
  }
  const cb=document.getElementById("catBody"); cb.innerHTML=html;
  const ah=document.getElementById("addHeur"); if(ah)ah.onclick=()=>heurModal();
  const as=document.getElementById("addSesgo"); if(as)as.onclick=()=>sesgoModal();
  cb.querySelectorAll("[data-delheur]").forEach(b=>b.onclick=()=>confirmDelCustom("heur",b.dataset.delheur));
  cb.querySelectorAll("[data-delsesgo]").forEach(b=>b.onclick=()=>confirmDelCustom("sesgo",b.dataset.delsesgo));
}
function heurCard(h){
  return `<div class="card heur ${h.custom?'custom':''}">
    <div class="num">${h.num}</div>
    <div class="body">
      <h4>${esc(h.nombre)} <span class="tag-src">${h.src}</span></h4>
      <p>${esc(h.desc)}</p>
      ${(h.revisar&&h.revisar.length)?`<ul class="revisar">${h.revisar.map(r=>`<li>${esc(r)}</li>`).join("")}</ul>`:""}
    </div>
    ${h.custom?`<button class="icon-btn sm del" data-delheur="${h.id}" title="Eliminar" style="width:28px;height:28px">${trash()}</button>`:""}
  </div>`;
}
function sesgoCard(s){
  const catClass="cat-"+s.categoria.replace(/ /g,"\\ ");
  return `<div class="card sesgo">
    <div class="sh"><h4>${esc(s.nombre)}</h4><span class="cat-tag ${cssCat(s.categoria)}">${esc(s.categoria)}</span></div>
    <p class="desc">${esc(s.desc)}</p>
    <div class="apl"><b>En UX</b>${esc(s.aplicacion)}</div>
    ${s.custom?`<div style="text-align:right;margin-top:8px"><button class="btn ghost sm" data-delsesgo="${s.id}">${trash()} Eliminar</button></div>`:""}
  </div>`;
}
function cssCat(c){ return {"Ley de UX":"cat-Ley de UX","Sesgo cognitivo":"cat-Sesgo cognitivo","Memoria":"cat-Memoria","Principio":"cat-Principio"}[c]?("cat-"+c.replace(/ /g,"\\ ")):"" ; }
function heurModal(){
  openModal("Nueva heurística",`
    <div class="field"><label>Nombre</label><input id="h_nombre" placeholder="Ej: Accesibilidad percibida"></div>
    <div class="field"><label>Descripción</label><textarea id="h_desc" placeholder="Qué evalúa este criterio..."></textarea></div>
    <div class="field"><label>Qué revisar <span class="opt">un ítem por línea, opcional</span></label>
      <textarea id="h_rev" placeholder="Contraste suficiente&#10;Tamaño de texto legible"></textarea></div>
  `,async()=>{
    const nombre=document.getElementById("h_nombre").value.trim();
    if(!nombre){document.getElementById("h_nombre").focus();return false;}
    const item={id:uid(),nombre,desc:document.getElementById("h_desc").value.trim(),
      revisar:document.getElementById("h_rev").value.split("\n").map(x=>x.trim()).filter(Boolean)};
    await store.saveCustom("heur",item);
    state.customHeur=await store.listCustom("heur");
    toast("Heurística agregada"); renderCatalogo(); return true;
  });
}
function sesgoModal(){
  const cats=["Ley de UX","Sesgo cognitivo","Memoria","Principio"];
  openModal("Nuevo sesgo o patrón",`
    <div class="row2">
      <div class="field"><label>Nombre</label><input id="s_nombre" placeholder="Ej: Efecto de encuadre"></div>
      <div class="field"><label>Categoría</label><select id="s_cat">${cats.map(c=>`<option>${c}</option>`).join("")}</select></div>
    </div>
    <div class="field"><label>Descripción</label><textarea id="s_desc" placeholder="En qué consiste..."></textarea></div>
    <div class="field"><label>Cómo se aplica en UX</label><textarea id="s_apl" placeholder="Cómo se manifiesta o se aprovecha en la interfaz..."></textarea></div>
  `,async()=>{
    const nombre=document.getElementById("s_nombre").value.trim();
    if(!nombre){document.getElementById("s_nombre").focus();return false;}
    const item={id:uid(),nombre,categoria:document.getElementById("s_cat").value,
      desc:document.getElementById("s_desc").value.trim(),aplicacion:document.getElementById("s_apl").value.trim()};
    await store.saveCustom("sesgo",item);
    state.customSesgos=await store.listCustom("sesgo");
    toast("Sesgo agregado"); renderCatalogo(); return true;
  });
}
function confirmDelCustom(kind,id){
  openConfirm("Eliminar del catálogo","Se elimina este elemento propio del catálogo. Los criterios base de Nielsen no se pueden borrar.",async()=>{
    await store.delCustom(kind,id);
    if(kind==="heur") state.customHeur=await store.listCustom("heur");
    else state.customSesgos=await store.listCustom("sesgo");
    toast("Eliminado"); renderCatalogo();
  });
}
