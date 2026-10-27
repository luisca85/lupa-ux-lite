import { SEVERIDAD } from "../core/catalogo-base.js";
import { heurDe, sesgosDe, state } from "../core/state.js";
import { DB_MODE } from "../data/backend.js";
import { pinNumero } from "../data/pantallas.js";
import { EMO, jrNormalizePaso } from "../journey/journey.js";
import { downloadFile } from "../ui/descargas.js";
import { pasosDe } from "../views/hallazgo-form.js";
import { cuentaBeta, ensureReporte, marcaActual } from "./comun.js";
import { vistaCliente } from "./seleccion.js";

/* ============ Exportar el reporte (solo para el administrador) ============
   Texto plano y JSON legible por IA, con lo mismo que ve el cliente en el link (lo oculto no
   sale, nunca hay notas internas) y sin imágenes. Las cuentas de la beta no lo ven: para ellas
   el reporte se entrega solo por el link. */
// Con servidor, recién cuando se sabe quién entró (state.cuenta); sin servidor (idb), es local.
export const puedeExportar=()=>(DB_MODE!=="server"||!!state.cuenta)&&!cuentaBeta();

const sevDe=h=>(h.severidad!=null&&h.severidad!=="")?SEVERIDAD[+h.severidad]:null;
const limpio=t=>String(t||"").replace(/\r/g,"").trim();

// Datos del reporte, ya filtrados como los ve el cliente.
export function datosReporte(est){
  const v=vistaCliente(ensureReporte(est),state.hallazgos,state.flujos), r=v.r, m=marcaActual();
  const pantallas=state.pantallas||[];
  const flows=v.flujos.filter(f=>f.tipo!=="User Journey"), jrs=v.flujos.filter(f=>f.tipo==="User Journey");
  const visibles=new Map(v.flujos.map(f=>[f.id,f]));
  const hzVis=new Set(v.hallazgos.map(h=>h.id));
  const ref=h=>{ const p=pantallas.find(x=>x.id===h.pantallaId); const n=p?pinNumero(h,state.hallazgos):null; return {p,n}; };
  const hallazgos=v.hallazgos.map((h,i)=>{ const {p,n}=ref(h), s=sevDe(h);
    const pasos=pasosDe(h).filter(q=>visibles.has(q.flujoId)).map(q=>{ const f=visibles.get(q.flujoId), jr=f.tipo==="User Journey";
      const lista=jr?(f.pasos||[]):(f.nodes||[]), k=lista.findIndex(x=>x.id===q.pasoId), it=lista[k]; if(!it) return null;
      return {tipo:jr?"User Journey":"User Flow",flujo_id:f.id,flujo:f.nombre||"",paso_id:it.id,paso_orden:k+1,paso:(jr?it.nombre:it.titulo)||""}; }).filter(Boolean);
    return {id:h.id, codigo:"H"+(i+1), titulo:limpio(h.titulo), tipo:h.tipo||"Problema",
      severidad:s?{valor:s.n,etiqueta:s.label}:null, descripcion:limpio(h.descripcion), recomendacion:limpio(h.recomendacion),
      heuristicas:heurDe(h).map(x=>x.nombre), sesgos:sesgosDe(h).map(x=>x.nombre),
      pantalla:p?{id:p.id,nombre:p.nombre||"",numero_de_pin:n,pin:h.pin?{x:+h.pin.x.toFixed(3),y:+h.pin.y.toFixed(3)}:null}:null,
      pasos}; });
  const codigo=new Map(hallazgos.map(h=>[h.id,h.codigo]));
  const user_flows=flows.map(f=>({id:f.id,nombre:f.nombre||"",descripcion:limpio(f.descripcion),
    interacciones:(f.nodes||[]).map((n,i)=>({id:n.id,orden:i+1,titulo:n.titulo||"",ve:limpio(n.ve),hace:limpio(n.hace),
      pantalla:n.pantallaId?((pantallas.find(p=>p.id===n.pantallaId)||{}).nombre||""):null,
      hallazgos:(n.markers||[]).map(mk=>codigo.get(mk.hallazgoId)).filter(Boolean)})),
    conexiones:(f.edges||[]).map(e=>{ const a=(f.nodes||[]).findIndex(n=>n.id===e.from), b=(f.nodes||[]).findIndex(n=>n.id===e.to);
      return {desde:a+1,hacia:b+1,tipo:e.tipo==="desvio"?"desvío":"happy path",etiqueta:e.label||""}; }).filter(c=>c.desde>0&&c.hacia>0)}));
  const user_journeys=jrs.map(j=>{ (j.pasos||[]).forEach(jrNormalizePaso); const etapas=j.etapas||[];
    return {id:j.id,nombre:j.nombre||"",descripcion:limpio(j.descripcion),
      etapas:etapas.map((e,i)=>({id:e.id,orden:i+1,nombre:e.nombre||"",descripcion:limpio(e.descripcion)})),
      pasos:(j.pasos||[]).map((p,i)=>{ const e=(p.emocion!=null?p.emocion:2), et=etapas.find(x=>x.id===p.etapaId);
        return {id:p.id,orden:i+1,nombre:p.nombre||"",etapa:et?et.nombre:null,
          emocion:{valor:e,etiqueta:(EMO[e]||{}).label||""},
          touchpoint:{canales:p.tpPills||[],descripcion:limpio(p.touchpoint)},
          acciones:p.acciones||[],expectativas:p.expectativas||[],pain_points:p.pain||[],oportunidades:p.oportunidades||[],
          hallazgos:(p.hallazgos||[]).filter(id=>hzVis.has(id)).map(id=>codigo.get(id)).filter(Boolean),
          user_flows:(p.flujos||[]).map(id=>(visibles.get(id)||{}).nombre).filter(Boolean)}; })}; });
  return {
    estudio:{nombre:est.nombre||"",cliente:est.cliente||"",plataforma:est.plataforma||"",url:est.url||"",fecha:est.fecha||""},
    autor:{nombre:m.nombre||"",marca:m.wordmark||"",rol:m.rol||"",sitio:m.sitio||""},
    presentacion:{resumen:limpio(r.resumen),objetivos:limpio(r.objetivos),alcance:limpio(r.alcance),muestra:r.muestra&&r.muestra.on?limpio(r.muestra.texto):""},
    diagnostico:{introduccion:limpio(r.diagIntro),hallazgos_clave:(r.hallazgosClave||[]).map(b=>({titulo:b.titulo||"",texto:limpio(b.texto)})),
      recomendaciones:(r.recomendaciones||[]).map(b=>({titulo:b.titulo||"",texto:limpio(b.texto)}))},
    hallazgos, user_flows, user_journeys
  };
}

const nombreArchivo=(est,ext)=>{ const base=String(est.nombre||"reporte").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^A-Za-z0-9]+/g,"-").replace(/^-|-$/g,"").toLowerCase()||"reporte";
  return `${base}-reporte-${new Date().toISOString().slice(0,10)}.${ext}`; };

/* ---- JSON para IA: estructura estable, con instrucciones y la escala de severidad ---- */
export function reporteJSON(est){
  const d=datosReporte(est);
  return {
    formato:"lupa-ux/reporte", version:1, generado:new Date().toISOString(), herramienta:"Mutis UX (uxuaria)",
    instrucciones_para_ia:"Diagnóstico de experiencia de usuario hecho por una persona experta. Cada hallazgo es una observación atómica con severidad en la escala de Nielsen (0 a 4), descripción, recomendación y las heurísticas o sesgos que la sostienen. Los hallazgos se referencian por su código (H1, H2…) desde las interacciones de los user flows y los pasos de los user journeys. pantalla.pin indica la posición relativa (0 a 1) del hallazgo sobre la captura. Respetá las conclusiones del autor: no inventes hallazgos que no estén acá.",
    escala_severidad:SEVERIDAD.map(s=>({valor:s.n,etiqueta:s.label,descripcion:s.desc})),
    ...d,
    totales:{hallazgos:d.hallazgos.length,user_flows:d.user_flows.length,user_journeys:d.user_journeys.length}
  };
}
export function exportarJSON(est){
  downloadFile({filename:nombreArchivo(est,"json"),data:new Blob([JSON.stringify(reporteJSON(est),null,2)],{type:"application/json"})});
}

/* ---- Texto plano: todos los hallazgos y los user journeys (y los flows) para leer o pegar ---- */
export function reporteTexto(est){
  const d=datosReporte(est), L=[], linea=t=>L.push(t), blanco=()=>L.push("");
  const titulo=t=>{ blanco(); linea(t.toUpperCase()); linea("=".repeat(Math.min(72,t.length))); };
  const sub=t=>{ blanco(); linea(t); linea("-".repeat(Math.min(72,t.length))); };
  const lista=(rot,arr)=>{ if(arr&&arr.length){ linea(rot+":"); arr.forEach(x=>linea("  - "+x)); } };
  linea(`REPORTE DE DIAGNÓSTICO UX · ${d.estudio.nombre}`);
  if(d.estudio.cliente) linea(`Cliente: ${d.estudio.cliente}`);
  if(d.estudio.plataforma) linea(`Plataforma: ${d.estudio.plataforma}`);
  if(d.estudio.url) linea(`URL: ${d.estudio.url}`);
  if(d.estudio.fecha) linea(`Fecha: ${d.estudio.fecha}`);
  if(d.autor.nombre||d.autor.marca) linea(`Autor: ${[d.autor.nombre,d.autor.rol,d.autor.marca].filter(Boolean).join(" · ")}`);
  const pr=d.presentacion;
  if(pr.resumen||pr.objetivos||pr.alcance||pr.muestra){ titulo("Presentación");
    if(pr.resumen){ linea(pr.resumen); } if(pr.objetivos){ blanco(); linea("Objetivos: "+pr.objetivos); } if(pr.alcance){ blanco(); linea("Alcance: "+pr.alcance); } if(pr.muestra){ blanco(); linea("Muestra: "+pr.muestra); } }
  const dg=d.diagnostico;
  if(dg.introduccion||dg.hallazgos_clave.length||dg.recomendaciones.length){ titulo("Diagnóstico estratégico");
    if(dg.introduccion) linea(dg.introduccion);
    dg.hallazgos_clave.forEach(b=>{ sub(b.titulo||"Hallazgo clave"); linea(b.texto); });
    dg.recomendaciones.forEach(b=>{ sub(b.titulo||"Recomendación"); linea(b.texto); }); }
  titulo(`Hallazgos (${d.hallazgos.length})`);
  linea("Severidad en la escala de Nielsen: 0 No es problema · 1 Cosmético · 2 Menor · 3 Mayor · 4 Catástrofe.");
  if(!d.hallazgos.length){ blanco(); linea("Sin hallazgos."); }
  d.hallazgos.forEach(h=>{ sub(`${h.codigo}. ${h.titulo}`);
    linea(`Severidad: ${h.severidad?`${h.severidad.valor} · ${h.severidad.etiqueta}`:"sin severidad"}`);
    if(h.pantalla) linea(`Pantalla: ${h.pantalla.nombre}${h.pantalla.numero_de_pin?` (pin ${h.pantalla.numero_de_pin})`:""}`);
    if(h.descripcion){ linea("Descripción:"); linea(h.descripcion); }
    if(h.recomendacion){ linea("Recomendación:"); linea(h.recomendacion); }
    lista("Heurísticas",h.heuristicas); lista("Sesgos",h.sesgos);
    lista("Aparece en",h.pasos.map(q=>`${q.tipo}: ${q.flujo} · paso ${q.paso_orden}. ${q.paso}`)); });
  if(d.user_journeys.length){ titulo(`User journeys (${d.user_journeys.length})`);
    d.user_journeys.forEach(j=>{ sub(j.nombre); if(j.descripcion) linea(j.descripcion);
      if(j.etapas.length){ blanco(); linea("Etapas:"); j.etapas.forEach(e=>linea(`  ${e.orden}. ${e.nombre}${e.descripcion?": "+e.descripcion:""}`)); }
      j.pasos.forEach(p=>{ blanco(); linea(`Paso ${p.orden}. ${p.nombre}${p.etapa?` · Etapa: ${p.etapa}`:""}`);
        linea(`  Emoción: ${p.emocion.etiqueta} (${p.emocion.valor} de 4)`);
        if(p.touchpoint.canales.length||p.touchpoint.descripcion) linea(`  Touchpoint: ${[p.touchpoint.canales.join(", "),p.touchpoint.descripcion].filter(Boolean).join(" · ")}`);
        const sl=(rot,arr)=>{ if(arr.length){ linea(`  ${rot}:`); arr.forEach(x=>linea("    - "+x)); } };
        sl("Acciones",p.acciones); sl("Expectativas / pensamiento",p.expectativas); sl("Pain points",p.pain_points); sl("Oportunidades",p.oportunidades);
        if(p.hallazgos.length) linea(`  Hallazgos: ${p.hallazgos.join(", ")}`);
        if(p.user_flows.length) linea(`  User flows: ${p.user_flows.join(", ")}`); }); }); }
  if(d.user_flows.length){ titulo(`User flows (${d.user_flows.length})`);
    d.user_flows.forEach(f=>{ sub(f.nombre); if(f.descripcion) linea(f.descripcion);
      f.interacciones.forEach(n=>{ blanco(); linea(`${n.orden}. ${n.titulo}${n.pantalla?` (pantalla: ${n.pantalla})`:""}`);
        if(n.ve) linea("  Ve: "+n.ve); if(n.hace) linea("  Hace: "+n.hace); if(n.hallazgos.length) linea("  Hallazgos: "+n.hallazgos.join(", ")); });
      if(f.conexiones.length){ blanco(); linea("Conexiones:"); f.conexiones.forEach(c=>linea(`  ${c.desde} → ${c.hacia} (${c.tipo})${c.etiqueta?": "+c.etiqueta:""}`)); } }); }
  blanco(); linea(`Generado con Mutis UX el ${new Date().toLocaleDateString("es-AR")}.`);
  return L.join("\n").replace(/\n{3,}/g,"\n\n")+"\n";
}
export function exportarTexto(est){
  downloadFile({filename:nombreArchivo(est,"txt"),data:new Blob([reporteTexto(est)],{type:"text/plain;charset=utf-8"})});
}
