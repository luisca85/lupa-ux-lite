import { uid } from "../core/util.js";
import { DB } from "../data/backend.js";
import { store } from "../data/store.js";
import { collectShareData } from "../share/compartir.js";
import { cuentaBeta, ensureReporte } from "./comun.js";

/* ============ Link público del reporte ============ */
// Publicar guarda una FOTO del reporte filtrado (lo mismo que la página autónoma) en
// publicos/{id} + publicos/{id}/partes/{n}. El link /r/{id} la muestra pidiendo un PIN
// de 6 dígitos (functions/api: ruta "publico"). Volver a publicar actualiza la foto en
// el mismo link y con el mismo PIN. El PIN en claro vive solo en el estudio
// (protegido por Access); en publicos/ va su hash con sal.

const PARTE = 600000; // caracteres por parte: con el escape JSON queda lejos de ~1,9 MB

async function sha256hex(text){
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
function nuevoPin(){
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return String(n).padStart(6,"0");
}
export function linkPublico(pub){ return location.origin + "/r/" + pub.id; }

async function borrarPartes(id){
  const viejas = await DB.collection("publicos/"+id+"/partes").get();
  await Promise.all(viejas.docs.map(d=>DB.doc("publicos/"+id+"/partes/"+d.id).delete()));
}

// Publica o actualiza la foto. Con nuevoPIN, genera otro PIN (el anterior deja de servir).
export async function publicarReporte(est, { nuevoPIN=false }={}){
  const r = ensureReporte(est), prev = r.publico || {};
  const id = prev.id || uid().replace(/[^A-Za-z0-9-]/g,"");
  const pin = (!prev.pin || nuevoPIN) ? nuevoPin() : prev.pin;
  const salt = (!prev.salt || nuevoPIN) ? uid() : prev.salt;
  const D = await collectShareData(est), json = JSON.stringify(D);
  const partes = [];
  for(let i=0;i<json.length;i+=PARTE) partes.push(json.slice(i,i+PARTE));
  await borrarPartes(id);
  for(let n=0;n<partes.length;n++) await DB.doc("publicos/"+id+"/partes/"+String(n).padStart(3,"0")).set({ t:partes[n] });
  const publicadoAt = Date.now();
  // Los consentimientos registrados se conservan al actualizar la publicación.
  const antes = prev.id ? await DB.doc("publicos/"+id).get() : null;
  const ad = (antes && antes.exists && antes.data()) || {};
  const consentimientos = ad.consentimientos || [], reservas = ad.reservas || [];
  // mencion: el cliente acepta que uxuaria mencione el diagnóstico (solo reportes de uxuaria;
  // con cuentas lo fija el servidor).
  await DB.doc("publicos/"+id).set({ mencion:!cuentaBeta(), estId:est.id, estNombre:est.nombre||"", estCliente:est.cliente||"", pinHash:await sha256hex(salt+":"+pin), salt, partes:partes.length, publicadoAt, fallos:0, bloqueadoHasta:0, consentimientos, reservas });
  r.publico = { id, pin, salt, publicadoAt, kb:Math.round(json.length/1024), firma:await firmaReporte(D) };
  await store.saveEstudio(est);
  return r.publico;
}

export async function despublicarReporte(est){
  const r = ensureReporte(est), pub = r.publico;
  if(!pub) return;
  await borrarPartes(pub.id);
  await DB.doc("publicos/"+pub.id).delete();
  r.publico = null;
  await store.saveEstudio(est);
}

// Actividad del link: consentimientos (quién lo abrió) y reservas desde "Trabajemos juntos".
export async function actividadDe(est){
  const pub = ensureReporte(est).publico;
  if(!pub) return { consentimientos:[], reservas:[] };
  const d = await DB.doc("publicos/"+pub.id).get(), x = (d.exists && d.data()) || {};
  return { consentimientos:x.consentimientos || [], reservas:x.reservas || [] };
}

// Huella de lo que ve el cliente: si cambia después de publicar, hay cambios sin publicar.
// Las imágenes entran por su largo y su final (alcanza para notar un cambio y es rápido).
export async function firmaReporte(D){
  const t = JSON.stringify(D, (k,v)=>typeof v==="string"&&v.startsWith("data:")?v.length+":"+v.slice(-48):v);
  return (await sha256hex(t)).slice(0,24);
}
