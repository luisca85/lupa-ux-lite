import { LS, esc } from "../core/util.js";
import img1 from "../assets/onboarding/1.webp";
import img2 from "../assets/onboarding/2.webp";
import img3 from "../assets/onboarding/3.webp";
import img4 from "../assets/onboarding/4.webp";
import img5 from "../assets/onboarding/5.webp";

/* ============ Onboarding: bienvenida en 5 pasos ============
   Aparece la primera vez que cada usuario entra (se recuerda en este navegador, por
   email de Access). Se puede ir y volver, saltar a un paso y cerrar en cualquier momento.
   "Ver introducción" (menú de usuario) lo vuelve a abrir. Las imágenes apaisadas se
   muestran enteras (entera) sobre el color de su papel (fondo); el resto llena la columna. */
const PASOS=[
  { img:img1, fondo:"#c5b094", alt:"Grabado antiguo de un sol rodeado de círculos concéntricos y nubes", tag:"El espíritu",
    titulo:"El criterio humano es irreemplazable",
    texto:[
      "Lupa UX nace para acompañar a quienes trabajan en experiencia de usuario a hacer mejores productos. Hacemos que lo complejo se vuelva sencillo y fácil de analizar.",
      "Creemos que detrás de cada buena experiencia hay una mirada humana: alguien que observa, comprende emociones, interpreta modelos mentales y reconoce comportamientos, para llevar a las personas hacia una experiencia más efectiva y eficiente. Ese criterio no se automatiza.",
      "Por eso esta herramienta no genera reportes automáticos ni diagnósticos hechos con inteligencia artificial. Es tu asistente: reúne en un solo lugar todo lo que necesitás para evaluar la experiencia de un sistema, para que tu tiempo esté puesto donde más vale, que es pensar."],
    cierre:"En los próximos pasos te contamos cómo está organizada." },
  { img:img2, fondo:"#f4e8bf", entera:true, alt:"Grabado de una máquina voladora con alas, patentada en 1889", tag:"Hallazgos",
    titulo:"El eureka: donde empieza todo diagnóstico",
    texto:["Un hallazgo es una observación atómica: un hecho concreto, que se puede ver y validar, sobre el que podés hacer una recomendación. No es una opinión general; es un momento preciso de la experiencia que merece atención."],
    lista:[
      "Subís las pantallas del producto y, con un clic sobre la imagen, marcás el lugar exacto del hallazgo.",
      "A cada uno le asignás una severidad, de No es problema a Catástrofe, para priorizar con claridad.",
      "Lo apoyás en las heurísticas y los sesgos más reconocidos, con un catálogo que podés ampliar con los tuyos.",
      "Escribís tu recomendación y filtrás por severidad para ver qué atender primero."] },
  { img:img3, fondo:"#f6f4eb", entera:true, alt:"Litografía de pasajeros en la cubierta de un barco por el Sena, con la torre Eiffel al fondo", tag:"Flujos", pronto:true,
    titulo:"El camino del usuario, de principio a fin",
    texto:["Ninguna pantalla vive sola. Las personas recorren un camino: llegan, deciden, dudan, avanzan o abandonan. Los flujos te permiten ver la experiencia completa y no solo sus partes."],
    lista:[
      "Diagramas de cada recorrido, con sus interacciones, el camino esperado y los desvíos.",
      "Mapas de experiencia (user journeys) por etapas, con lo que la persona hace, piensa y siente en cada momento.",
      "Los hallazgos ubicados en el paso del camino donde ocurren."],
    cierre:"Esta sección se está terminando: muy pronto vas a poder usarla." },
  { img:img4, fondo:"#e0d7bf", alt:"Grabado de una cabeza de perfil dividida en escenas que representan la organización mental", tag:"Personas", pronto:true,
    titulo:"A quién nos dirigimos",
    texto:["Diseñar bien empieza por entender a quién le hablamos. Las personas representan los modelos mentales de quienes van a usar el producto: sus necesidades, sus objetivos y lo que hoy les resulta difícil."],
    lista:[
      "Fichas de protopersonas, con su contexto, sus necesidades, sus objetivos y sus dolores.",
      "Una referencia constante para leer cada hallazgo desde la mirada de quien lo vive."],
    cierre:"Esta sección se está terminando: muy pronto vas a poder usarla." },
  { img:img5, fondo:"#605e51", alt:"Página de un manuscrito antiguo ilustrada con flores sobre fondo azul", tag:"Reportes",
    titulo:"Un reporte que construye relaciones",
    texto:["El diagnóstico cobra sentido cuando llega bien a tu cliente. Los reportes están pensados para darte eficiencia y rapidez, y para que la entrega abra una conversación constructiva en lugar de cerrar un trámite."],
    lista:[
      "Elegís qué ve tu cliente y mirás el resultado en una vista previa que se actualiza sola.",
      "Lo compartís con un link y un PIN: tu cliente lo abre sin crear una cuenta y en modo lectura.",
      "Incluís tus propuestas de trabajo. Si tu cliente reserva una, te avisamos."] }
];
const clave=usuario=>"lupa:onboarding:"+(usuario||"local");

// Primera vez de este usuario en este navegador. En las pruebas automáticas no aparece
// solo (taparía la app), salvo que se pida con localStorage "lupa:onboarding:forzar".
export function onboardingInicial(usuario){
  if(LS.get(clave(usuario),false)) return;
  if(navigator.webdriver&&!LS.get("lupa:onboarding:forzar",false)) return;
  abrirOnboarding(usuario);
}

export function abrirOnboarding(usuario){
  cerrar(false);
  const prevFoco=document.activeElement;
  const el=document.createElement("div"); el.className="onb-bg"; el.id="onboarding";
  el.innerHTML=`<div class="onb" role="dialog" aria-modal="true" aria-labelledby="onbT" aria-describedby="onbBody">
    <div class="onb-media">${PASOS.map((p,i)=>`<img src="${p.img}" alt="${esc(p.alt)}" data-i="${i}"${p.entera?' class="entera"':""}${i?' aria-hidden="true"':""}>`).join("")}</div>
    <div class="onb-side">
      <div class="onb-top"><span class="onb-n" id="onbN" aria-live="polite"></span><button type="button" class="onb-skip" id="onbSkip">Saltar</button></div>
      <div class="onb-body" id="onbBody"></div>
      <div class="onb-foot">
        <div class="onb-dots" role="tablist" aria-label="Pasos">${PASOS.map((p,i)=>`<button type="button" role="tab" class="onb-dot" data-i="${i}" aria-label="Paso ${i+1}: ${esc(p.tag)}"></button>`).join("")}</div>
        <div class="onb-acts"><button type="button" class="onb-btn ghost" id="onbPrev">← Atrás</button><button type="button" class="onb-btn primary" id="onbNext"></button></div>
      </div>
    </div></div>`;
  document.body.appendChild(el); document.body.classList.add("onb-open");
  let i=0;
  const ir=n=>{ i=Math.max(0,Math.min(PASOS.length-1,n)); const p=PASOS[i], ult=i===PASOS.length-1;
    el.querySelectorAll(".onb-media img").forEach(im=>{ const on=+im.dataset.i===i; im.classList.toggle("on",on); on?im.removeAttribute("aria-hidden"):im.setAttribute("aria-hidden","true"); });
    el.querySelector(".onb-media").style.background=p.fondo;
    el.querySelector("#onbN").textContent=`Paso ${i+1} de ${PASOS.length}`;
    const body=el.querySelector("#onbBody");
    body.innerHTML=`<span class="onb-tag">${esc(p.tag)}${p.pronto?' <em class="onb-pronto">Pronto</em>':""}</span>
      <h2 id="onbT">${esc(p.titulo)}</h2>
      ${p.texto.map(t=>`<p>${esc(t)}</p>`).join("")}
      ${p.lista?`<h3>Lo que vas a encontrar</h3><ul>${p.lista.map(t=>`<li>${esc(t)}</li>`).join("")}</ul>`:""}
      ${p.cierre?`<p class="onb-cierre">${esc(p.cierre)}</p>`:""}`;
    body.scrollTop=0;
    el.querySelectorAll(".onb-dot").forEach((d,k)=>{ d.classList.toggle("on",k===i); d.setAttribute("aria-selected",String(k===i)); });
    el.querySelector("#onbPrev").disabled=i===0;
    const next=el.querySelector("#onbNext"); next.textContent=ult?"Empezar":"Siguiente →";
  };
  const fin=()=>{ LS.set(clave(usuario),true); cerrar(true,prevFoco); };
  el.querySelector("#onbPrev").onclick=()=>ir(i-1);
  el.querySelector("#onbNext").onclick=()=>{ if(i===PASOS.length-1) fin(); else ir(i+1); };
  el.querySelector("#onbSkip").onclick=fin;
  el.querySelectorAll(".onb-dot").forEach(d=>d.onclick=()=>ir(+d.dataset.i));
  el._key=e=>{
    if(e.key==="Escape"){ e.preventDefault(); fin(); }
    else if(e.key==="ArrowRight"&&!/^(INPUT|TEXTAREA)$/.test(e.target.tagName)){ e.preventDefault(); ir(i+1); }
    else if(e.key==="ArrowLeft"){ e.preventDefault(); ir(i-1); }
    else if(e.key==="Tab"){ // el foco no sale del modal
      const f=[...el.querySelectorAll("button:not(:disabled)")]; if(!f.length) return;
      const a=f[0], z=f[f.length-1];
      if(e.shiftKey&&document.activeElement===a){ e.preventDefault(); z.focus(); }
      else if(!e.shiftKey&&document.activeElement===z){ e.preventDefault(); a.focus(); }
    }
  };
  document.addEventListener("keydown",el._key,true);
  ir(0); el.querySelector("#onbNext").focus();
}
function cerrar(animar,foco){
  const el=document.getElementById("onboarding"); if(!el) return;
  document.removeEventListener("keydown",el._key,true);
  document.body.classList.remove("onb-open");
  const quitar=()=>{ el.remove(); if(foco&&foco.focus) foco.focus(); };
  if(animar){ el.classList.add("out"); setTimeout(quitar,180); } else quitar();
}
