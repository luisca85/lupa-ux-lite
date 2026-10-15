import { esc } from "../core/util.js";

/* ============ Recursos (panel izquierdo de Estudios) ============
   Lecturas validadas del sector y enlaces de uxuaria. Un recurso destacado rota cada 8 s
   (se pausa con el mouse o el foco encima) y debajo se listan los 4 que siguen; el orden
   cambia en cada visita. Para sumar o quitar un enlace, editar RECURSOS. Sin imágenes externas. */
const RECURSOS=[
  { fuente:"NN/g", titulo:"10 Usability Heuristics for User Interface Design", autor:"Jakob Nielsen",
    nota:"Las diez heurísticas en las que se apoya el catálogo de Lupa.",
    url:"https://www.nngroup.com/articles/ten-usability-heuristics/" },
  { fuente:"NN/g", titulo:"Heuristic Evaluation: artículos y guías", autor:"Nielsen Norman Group",
    nota:"Lo último de NN/g sobre evaluación heurística, siempre actualizado.",
    url:"https://www.nngroup.com/topic/heuristic-evaluation/" },
  { fuente:"NN/g", titulo:"Demand Accuracy in Your AI Tools: Lessons from Baymard Institute", autor:"Kate Moran · enero 2026",
    nota:"Muchas herramientas de IA para UX no informan qué tan precisos son sus resultados.",
    url:"https://www.nngroup.com/articles/baymard-ai-tool-accuracy/" },
  { fuente:"NN/g", titulo:"Testing AI with Real Design Scenarios", autor:"Nielsen Norman Group · octubre 2025",
    nota:"Cómo evaluaron con heurísticas los diseños generados por herramientas de IA.",
    url:"https://www.nngroup.com/articles/testing-ai-methodology/" },
  { fuente:"Baymard", titulo:"Testing ChatGPT-4 for “UX Audits” Shows an 80% Error Rate", autor:"Baymard Institute · octubre 2023",
    nota:"Frente a una persona experta, el 80 % de sus sugerencias fueron falsos positivos.",
    url:"https://baymard.com/blog/gpt-ux-audit" },
  { fuente:"NN/g", titulo:"Heuristic Evaluation Workbook", autor:"Nielsen Norman Group · PDF",
    nota:"Un cuaderno de trabajo gratuito para hacer tu primera evaluación heurística.",
    url:"https://media.nngroup.com/media/articles/attachments/Heuristic_Evaluation_Workbook_1_Fillable.pdf" },
  { fuente:"uxuaria", titulo:"Diferencias entre diseñar con o sin IA y su impacto en el gesto creativo", autor:"Luis Carlos Romero · julio 2026",
    nota:"Qué cambia en el proceso creativo cuando diseñamos con IA, y cuándo volver a lo manual.",
    url:"https://uxuaria.com/blog/diferencias-creacion-ia-vs-diseno", propio:true },
  { fuente:"Sakura 64", titulo:"Tablero gratis del método Harada para tus metas", autor:"Una app de uxuaria",
    nota:"Organizá tus objetivos con el método Harada y avanzá paso a paso.",
    url:"https://sakura64.uxuaria.com/", propio:true }
];
const CONSEJOS=[
  "Un hallazgo, un hecho: si ves dos problemas en la misma pantalla, marcá dos pines.",
  "Usá la severidad para priorizar: empezá por lo que es Catástrofe o Mayor.",
  "Escribí la recomendación pensando en quien la va a implementar: concreta y accionable.",
  "Antes de compartir, revisá en Reportes qué ve tu cliente en la vista previa.",
  "Apoyá cada hallazgo en una heurística: le da a tu cliente un porqué, no solo un qué."
];
const ROTA_MS=8000;
const ext='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';
const chev=d=>`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d<0?"m15 6-6 6 6 6":"m9 6 6 6-6 6"}"/></svg>`;
const barajar=a=>{ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
let timer=null;

export function renderRecursos(box){
  clearInterval(timer);
  const lista=barajar(RECURSOS), consejo=CONSEJOS[Math.floor(Math.random()*CONSEJOS.length)];
  let i=0, pausa=false;
  box.innerHTML=`<div class="rec-h"><span class="rec-ico" aria-hidden="true"></span><h2>Recursos</h2><p>Lecturas validadas para evaluar con criterio.</p></div>
    <div class="rec-dest" id="recDest" aria-roledescription="carrusel" aria-label="Recurso destacado"></div>
    <div class="rec-nav"><button type="button" class="rec-arr" id="recPrev" aria-label="Recurso anterior">${chev(-1)}</button>
      <div class="rec-dots">${lista.map((r,k)=>`<button type="button" class="rec-dot" data-k="${k}" aria-label="Ver ${esc(r.titulo)}"></button>`).join("")}</div>
      <button type="button" class="rec-arr" id="recNext" aria-label="Recurso siguiente">${chev(1)}</button></div>
    <h3 class="rec-sub">Más para leer</h3><ul class="rec-list" id="recList"></ul>
    <div class="rec-tip"><b>Consejo de Lupa</b><p>${esc(consejo)}</p></div>`;
  const dest=box.querySelector("#recDest"), ul=box.querySelector("#recList");
  const tarjeta=r=>`<a class="rec-card${r.propio?" propio":""}" href="${esc(r.url)}" target="_blank" rel="noopener">
      <span class="rec-src">${esc(r.fuente)}</span><b>${esc(r.titulo)}</b><small>${esc(r.autor)}</small>
      <span class="rec-nota">${esc(r.nota)}</span><span class="rec-go">Leer ${ext}</span></a>`;
  const pintar=()=>{
    dest.innerHTML=tarjeta(lista[i]);
    const sig=[1,2,3,4].map(d=>lista[(i+d)%lista.length]); // los próximos en la rotación
    ul.innerHTML=sig.map(r=>`<li><a href="${esc(r.url)}" target="_blank" rel="noopener"><span class="rec-src">${esc(r.fuente)}</span><span class="rec-lt">${esc(r.titulo)}</span>${ext}</a></li>`).join("");
    box.querySelectorAll(".rec-dot").forEach((d,k)=>{ d.classList.toggle("on",k===i); d.setAttribute("aria-current",String(k===i)); });
  };
  const ir=n=>{ i=(n+lista.length)%lista.length; pintar(); };
  box.querySelector("#recPrev").onclick=()=>ir(i-1);
  box.querySelector("#recNext").onclick=()=>ir(i+1);
  box.querySelectorAll(".rec-dot").forEach(d=>d.onclick=()=>ir(+d.dataset.k));
  // Se pausa mientras se lo mira o se navega con teclado; se detiene al salir de la home.
  box.addEventListener("mouseenter",()=>pausa=true); box.addEventListener("mouseleave",()=>pausa=false);
  box.addEventListener("focusin",()=>pausa=true); box.addEventListener("focusout",()=>pausa=false);
  timer=setInterval(()=>{ if(!box.isConnected){ clearInterval(timer); return; } if(!pausa&&!document.hidden) ir(i+1); },ROTA_MS);
  pintar();
}
