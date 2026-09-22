import { SEVERIDAD } from "../core/catalogo-base.js";
import { heurById, sesgoById, state } from "../core/state.js";
import { EMO } from "../journey/journey.js";
import { ensureReporte, findHz, linesOf, marcaActual } from "./comun.js";
import { normalizePropuesta, propDiscRows, propLaunch, propMoney, propPriceLine, propTipoLabel } from "./propuestas.js";
import { copyIco, downloadFile, txtIco } from "../ui/descargas.js";
import { x } from "../ui/iconos.js";

/* ---- Exportar en texto plano ---- */
function plainReport(est){
  const r=ensureReporte(est), m=marcaActual(), hz=state.hallazgos;
  const bar="=".repeat(64), sub="-".repeat(64);
  const L=[]; const P=s=>L.push(s);
  const linesFmt=(t,pre)=>{ const l=linesOf(t); l.forEach(x=>P((pre||"- ")+x)); return l.length; };
  function fmtHz(h,indent,lead){
    const p=indent||"";
    const sev=(h.severidad!=null&&h.severidad!=="")?("Sev "+h.severidad+" · "+SEVERIDAD[h.severidad].label):"sin severidad";
    P(p+(lead||"")+"["+(h.tipo||"Hallazgo")+" · "+sev+"] "+(h.titulo||"(sin título)"));
    if(h.pantalla)P(p+"  Pantalla/paso: "+h.pantalla);
    const heur=(h.heuristicas||[]).map(id=>{const x=heurById(id);return x?x.nombre:null;}).filter(Boolean);
    if(heur.length)P(p+"  Heurísticas: "+heur.join(", "));
    const ses=(h.sesgos||[]).map(id=>{const x=sesgoById(id);return x?x.nombre:null;}).filter(Boolean);
    if(ses.length)P(p+"  Sesgos / patrones: "+ses.join(", "));
    if(h.descripcion)P(p+"  Descripción: "+h.descripcion);
    if(h.recomendacion)P(p+"  Recomendación: "+h.recomendacion);
    if(h.tags&&h.tags.length)P(p+"  Etiquetas: "+h.tags.join(", "));
  }
  // Encabezado
  P(bar); P("INFORME DE EXPERIENCIA DE USUARIO"); P((est.nombre||"").toUpperCase()); P(bar); P("");
  // Datos del estudio
  P("DATOS DEL ESTUDIO");
  if(est.cliente)P("- Cliente: "+est.cliente);
  if(est.plataforma)P("- Plataforma: "+est.plataforma);
  if(est.url)P("- URL / referencia: "+est.url);
  if(est.estado)P("- Estado: "+est.estado);
  if(est.fecha)P("- Fecha: "+est.fecha);
  if(est.descripcion)P("- Descripción / alcance: "+est.descripcion);
  P("");
  P("MARCA");
  P("- Autor: "+m.nombre); P("- Rol: "+m.rol); P("- Sitio: "+m.sitio); P("- Año: "+m.anio);
  P("");
  P("TÍTULO DEL INFORME"); P(r.subtitulo||"(sin subtítulo)"); P("");
  // Resumen ejecutivo
  P(sub); P("1. RESUMEN EJECUTIVO"); P(sub);
  if(r.resumen)P(r.resumen);
  const byT=t=>hz.filter(h=>h.tipo===t).length, sevN=n=>hz.filter(h=>h.tipo==="Problema"&&h.severidad===n).length;
  P(""); P("Métricas:");
  P("- Total de hallazgos: "+hz.length);
  P("- Problemas: "+byT("Problema"));
  P("- Oportunidades: "+byT("Oportunidad"));
  P("- Observaciones: "+byT("Observación"));
  P("- Severidad alta (3-4): "+(sevN(3)+sevN(4)));
  P(""); P("1.1 Objetivos"); if(!linesFmt(r.objetivos))P("(sin objetivos cargados)");
  P(""); P("1.2 Alcance"); if(!linesFmt(r.alcance))P("(sin alcance cargado)");
  P(""); P("1.3 Métricas y metas"); if(!linesFmt(r.metricas))P("(sin métricas cargadas)");
  P("");
  // Protopersonas
  P(sub); P("2. PROTOPERSONAS"); P(sub);
  if(!r.protopersonas.length)P("(sin protopersonas)");
  r.protopersonas.forEach((p,i)=>{
    P(""); P("Protopersona "+(i+1)+": "+(p.nombre||"")+(p.edad?", "+p.edad:""));
    if(p.titulo)P("Arquetipo: "+p.titulo);
    if(p.ubicacion)P("Ubicación: "+p.ubicacion);
    if(p.ocupacion)P("Ocupación: "+p.ocupacion);
    if(p.bio)P("Bio: "+p.bio);
    if(p.necesidades&&p.necesidades.length){ P("Necesidades:"); p.necesidades.forEach(x=>P("- "+x)); }
    if(p.objetivos&&p.objetivos.length){ P("Objetivos:"); p.objetivos.forEach(x=>P("- "+x)); }
    if(p.dolores&&p.dolores.length){ P("Dolores / problemas:"); p.dolores.forEach(x=>P("- "+x)); }
  });
  P("");
  // Evaluación heurística por flujo
  P(sub); P("3. EVALUACIÓN HEURÍSTICA (por flujo)"); P(sub);
  const refIds=new Set();
  const flowsOnly=state.flujos.filter(f=>f.tipo!=="User Journey");
  if(!flowsOnly.length)P("(no hay user flows en este estudio)");
  flowsOnly.forEach(f=>{
    P(""); P("FLUJO: "+(f.nombre||"")+"  ["+(f.tipo||"User Flow")+"]");
    if(f.descripcion)P("Descripción: "+f.descripcion);
    const nodes=(f.nodes||[]);
    if(!nodes.length){ P("  (sin pantallas)"); return; }
    nodes.forEach((n,ni)=>{
      P(""); P("  Pantalla "+(ni+1)+": "+(n.titulo||"Interacción"));
      if(n.ve)P("  Ve: "+n.ve);
      if(n.hace)P("  Hace: "+n.hace);
      const ms=(n.markers||[]).map(mk=>findHz(mk.hallazgoId)).filter(Boolean);
      if(ms.length){ P("  Hallazgos:"); ms.forEach(h=>{ refIds.add(h.id); fmtHz(h,"    "); }); }
      else P("  Hallazgos: (ninguno marcado en esta pantalla)");
    });
  });
  const otros=hz.filter(h=>!refIds.has(h.id));
  if(otros.length){ P(""); P("HALLAZGOS SIN PANTALLA VINCULADA"); otros.forEach(h=>{ P(""); fmtHz(h,"  "); }); }
  P("");
  // User Journeys
  const journeys=state.flujos.filter(f=>f.tipo==="User Journey");
  if(journeys.length){
    P(sub); P("MAPA DE EXPERIENCIA — USER JOURNEYS"); P(sub);
    journeys.forEach(j=>{
      P(""); P("JOURNEY: "+(j.nombre||"")); if(j.descripcion)P("Escenario: "+j.descripcion);
      const cs=j.carriles||{};
      (j.pasos||[]).forEach((p,i)=>{
        const et=(j.etapas||[]).find(e=>e.id===p.etapaId);
        const arrOf=v=>Array.isArray(v)?v:(v?[String(v)]:[]);
        const jp=(f,lbl)=>{ const v=arrOf(p[f]); if(v.length)P("    "+lbl+": "+v.join(" · ")); };
        P(""); P("  Paso "+(i+1)+": "+(p.nombre||"")+(et?"   [Etapa: "+et.nombre+"]":""));
        if(cs.touchpoint!==false){ const tp=[]; if(p.touchpoint)tp.push(p.touchpoint); const tpp=arrOf(p.tpPills); if(tpp.length)tp.push(tpp.join(" · ")); if(tp.length)P("    Touchpoint: "+tp.join("  |  ")); }
        if(cs.emocion!==false)P("    Emocionalidad: "+EMO[(p.emocion!=null?p.emocion:2)].label);
        if(cs.acciones!==false)jp("acciones","Acciones");
        if(cs.expectativas!==false)jp("expectativas","Expectativas / pensamiento");
        if(cs.pain!==false)jp("pain","Pain points");
        if(cs.oportunidades!==false)jp("oportunidades","Oportunidades");
      });
    });
    P("");
  }
  // Diagnóstico
  P(sub); P("4. DIAGNÓSTICO ESTRATÉGICO"); P(sub);
  if(r.diagIntro)P(r.diagIntro);
  P(""); P("4.1 Hallazgos clave");
  if(!r.hallazgosClave.length)P("(sin hallazgos clave)");
  r.hallazgosClave.forEach(b=>{ P(""); P("• "+(b.titulo||"")); if(b.texto)P("  "+b.texto.replace(/\n/g,"\n  ")); });
  P(""); P("4.2 Recomendaciones prioritarias");
  if(!r.recomendaciones.length)P("(sin recomendaciones)");
  r.recomendaciones.forEach(b=>{
    P(""); P("• "+(b.titulo||"")); if(b.texto)P("  "+b.texto.replace(/\n/g,"\n  "));
    if(b.bullets&&b.bullets.length){ P("  Acciones:"); b.bullets.forEach(x=>P("  - "+x)); }
    if(b.impacto)P("  Impacto esperado: "+b.impacto);
  });
  P("");
  // Propuestas de trabajo
  P(sub); P("5. PROPUESTAS DE TRABAJO"); P(sub);
  if(!r.propuestas.length)P("(sin propuestas)");
  r.propuestas.forEach((p,i)=>{
    normalizePropuesta(p);
    P(""); P((i+1)+". "+(p.titulo||"")+"   ["+propTipoLabel(p.tipo)+"]");
    const L=propLaunch(p);
    if(L){ P("   Precio de lanzamiento (-"+L.pct+"%): "+propPriceLine(p)+"   (antes "+propMoney(p.moneda,L.antes)+(p.tipo==="mensual"?" /mes":"")+")"); }
    else P("   Precio: "+propPriceLine(p));
    if(p.texto)P("   "+p.texto.replace(/\n/g,"\n   "));
    if(p.bullets&&p.bullets.length){ P("   Incluye:"); p.bullets.forEach(x=>P("   - "+x)); }
    const dr=propDiscRows(p);
    if(dr.length){ P("   Descuentos por pago adelantado:"); dr.forEach(d=>P("   - "+d.label+": "+d.pct+"%"+(d.extra?d.extra.replace(/·/g,"->"):""))); }
  });
  P("");
  // Listado completo
  P(sub); P("LISTADO COMPLETO DE HALLAZGOS"); P(sub);
  if(!hz.length)P("(sin hallazgos)");
  const order={Problema:0,Oportunidad:1,"Observación":2};
  [...hz].sort((a,b)=>(order[a.tipo]-order[b.tipo])||((b.severidad??-1)-(a.severidad??-1))).forEach((h,i)=>{ P(""); fmtHz(h,"",(i+1)+". "); });
  P(""); P(bar); P("Generado con Lupa UX · "+m.sitio); P(bar);
  return L.join("\n");
}
async function copyPlain(text,msgEl){
  try{ if(navigator.clipboard&&navigator.clipboard.writeText){ await navigator.clipboard.writeText(text); if(msgEl){msgEl.textContent="Copiado al portapapeles";msgEl.className="hint ok";} return; } }catch(e){}
  try{ const ta=document.getElementById("peText"); if(ta){ ta.focus(); ta.select(); const ok=document.execCommand("copy"); if(msgEl){msgEl.textContent=ok?"Copiado al portapapeles":"Seleccioná el texto y copialo con Ctrl/Cmd+C";msgEl.className="hint"+(ok?" ok":"");} return; } }catch(e){}
  if(msgEl){msgEl.textContent="Seleccioná el texto y copialo con Ctrl/Cmd+C";msgEl.className="hint";}
}
export function openPlainExport(est){
  const text=plainReport(est);
  const root=document.getElementById("modalRoot");
  root.innerHTML=`<div class="modal-bg"><div class="modal" style="max-width:860px;width:100%">
    <div class="modal-h"><h3>Exportar en texto plano</h3><button class="icon-btn" id="peClose" style="width:32px;height:32px">${x()}</button></div>
    <div class="modal-b" style="gap:10px">
      <p class="hint">Todo el contenido del estudio en texto plano, listo para copiar y pegar en tu herramienta de diseño o documento.</p>
      <textarea id="peText" readonly spellcheck="false" style="min-height:54vh;font-family:var(--mono);font-size:12px;line-height:1.5;white-space:pre;overflow:auto;background:var(--surface-2)"></textarea>
    </div>
    <div class="modal-f"><span id="peMsg" class="hint" style="margin-right:auto"></span>
      <button class="btn sm" id="peDownload">${txtIco()} Descargar .txt</button>
      <button class="btn primary sm" id="peCopy">${copyIco()} Copiar todo</button>
    </div>
  </div></div>`;
  const ta=document.getElementById("peText"); ta.value=text;
  const msg=document.getElementById("peMsg");
  const close=()=>{ root.innerHTML=""; };
  root.querySelector(".modal-bg").onclick=e=>{ if(e.target===root.querySelector(".modal-bg"))close(); };
  document.getElementById("peClose").onclick=close;
  document.getElementById("peCopy").onclick=()=>copyPlain(text,msg);
  document.getElementById("peDownload").onclick=async()=>{
    const fname=((est.nombre||"reporte").replace(/[^\w\-]+/g,"_").slice(0,60)||"reporte")+".txt";
    try{ downloadFile({filename:fname,data:text}); msg.textContent="Archivo .txt generado"; msg.className="hint ok"; }
    catch(e){ msg.textContent="No se pudo descargar. Copiá el texto con el botón de al lado."; msg.className="hint"; }
  };
}
