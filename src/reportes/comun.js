import { state } from "../core/state.js";
import { LS, esc, uid } from "../core/util.js";
import { DB, USE_DB } from "../data/backend.js";
import { store } from "../data/store.js";
import { defaultPropuestas, esSeedViejo, normalizePropuesta } from "./propuestas.js";
import { ocultos } from "./seleccion.js";
import { x } from "../ui/iconos.js";

/* ============ Módulo: Reportes ============ */
export const brandStore={
  async get(){ if(USE_DB){const d=await DB.doc("marca/perfil").get();return d.exists?{...d.data()}:null;} return LS.get("lupa:marca",null); },
  async save(m){ if(USE_DB)await DB.doc("marca/perfil").set(m); else LS.set("lupa:marca",m); }
};
// Cuenta de la beta (spec cta): arranca sin los datos de uxuaria (marca y propuestas).
// Los valores de uxuaria quedan para el administrador y para los modos sin cuentas.
export const cuentaBeta=()=>!!(state.cuenta&&state.cuenta.modo==="cuentas"&&!state.cuenta.admin);
export function marcaActual(){ const anio=String(new Date().getFullYear());
  const d=cuentaBeta()
    ?{wordmark:"",nombre:"",rol:"",sitio:"",anio,logo:null,headerImg:null,color:"",email:"",tel:"",servicioNombre:"",servicioDesc:"",servicioUrl:""}
    :{wordmark:"uxuaria",nombre:"Luis Carlos Romero León",rol:"Consultor en Diseño de experiencia de usuario",sitio:"www.uxuaria.com",anio,logo:null,headerImg:null,color:"",email:"",tel:"",servicioNombre:"MV Rescue",servicioDesc:"",servicioUrl:""};
  return Object.assign(d,state.marca||{}); }
export function rptSevColor(n){ return ["#8b95a5","#5b8def","#d99a2b","#e0703a","#e5484d"][n]||"#8b95a5"; }
export function findHz(id){ return state.hallazgos.find(h=>h.id===id)||null; }
export function ensureReporte(est){
  if(!est.reporte || Object.isFrozen(est.reporte)) est.reporte = est.reporte?JSON.parse(JSON.stringify(est.reporte)):{};
  const r=est.reporte;
  if(r.subtitulo===undefined) r.subtitulo="Informe de Experiencia del Usuario: Hallazgos, Prioridades y Escenarios de Valor";
  ["resumen","objetivos","alcance","metricas","diagIntro"].forEach(k=>{ if(r[k]===undefined)r[k]=""; });
  if(!Array.isArray(r.protopersonas)) r.protopersonas=[];
  if(!Array.isArray(r.hallazgosClave)) r.hallazgosClave=[];
  if(!Array.isArray(r.recomendaciones)) r.recomendaciones=[];
  if(!r.incluir) r.incluir={portada:true,indice:true,resumen:true,protopersonas:true,heuristica:true,diagnostico:true};
  if(!Array.isArray(r.flujosInc)) r.flujosInc=null;
  // --- Reporte online (cliente) ---
  if(r.code===undefined) r.code="";
  if(!r.online) r.online={hallazgos:true,flujos:true,journeys:true,protopersonas:true,diagnostico:true,propuestas:true,contacto:true};
  if(r.muestra===undefined) r.muestra={on:true,texto:"Esta es una muestra inicial del diagnóstico. Hay más hallazgos y más recorridos por revisar en profundidad."};
  // Pestañas propias del reporte (HTML pegado o texto con formato), en el orden del menú.
  if(!Array.isArray(r.pestanas)) r.pestanas=[];
  if(!Array.isArray(r.propuestas)) r.propuestas=cuentaBeta()?[]:defaultPropuestas();
  // Reemplazo por única vez de los seeds viejos (nunca editados) por el set nuevo.
  else if(esSeedViejo(r.propuestas)) r.propuestas=cuentaBeta()?[]:defaultPropuestas();
  r.propuestas.forEach(normalizePropuesta);
  // Ids para poder elegir protopersonas y propuestas una por una (pestaña Reportes).
  r.protopersonas.forEach(p=>{ if(p&&!p.id) p.id=uid(); });
  r.propuestas.forEach(p=>{ if(p&&!p.id) p.id=uid(); });
  ocultos(r);
  return r;
}
let _rptSaveT, _rptPrevT;
export function saveReporte(est){ clearTimeout(_rptSaveT); _rptSaveT=setTimeout(()=>{ store.saveEstudio(est); },600); }
export function linesOf(t){ return String(t||"").split("\n").map(s=>s.replace(/^[-•]\s*/,"").trim()).filter(Boolean); }
export function bulletsHTML(t){ const l=linesOf(t); if(!l.length)return ""; if(l.length===1)return `<p>${esc(l[0])}</p>`; return `<ul>${l.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`; }
export function paraHTML(t){ return String(t||"").split(/\n{2,}/).map(p=>p.trim()).filter(Boolean).map(p=>`<p>${esc(p).replace(/\n/g,"<br>")}</p>`).join(""); }
