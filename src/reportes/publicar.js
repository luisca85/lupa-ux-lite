import { uid } from "../core/util.js";
import { DB } from "../data/backend.js";
import { store } from "../data/store.js";
import { collectShareData } from "../share/compartir.js";
import { ensureReporte } from "./comun.js";

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
  const json = JSON.stringify(await collectShareData(est));
  const partes = [];
  for(let i=0;i<json.length;i+=PARTE) partes.push(json.slice(i,i+PARTE));
  await borrarPartes(id);
  for(let n=0;n<partes.length;n++) await DB.doc("publicos/"+id+"/partes/"+String(n).padStart(3,"0")).set({ t:partes[n] });
  const publicadoAt = Date.now();
  // Los consentimientos registrados se conservan al actualizar la publicación.
  const antes = prev.id ? await DB.doc("publicos/"+id).get() : null;
  const consentimientos = (antes && antes.exists && antes.data().consentimientos) || [];
  await DB.doc("publicos/"+id).set({ estId:est.id, pinHash:await sha256hex(salt+":"+pin), salt, partes:partes.length, publicadoAt, fallos:0, bloqueadoHasta:0, consentimientos });
  r.publico = { id, pin, salt, publicadoAt, kb:Math.round(json.length/1024) };
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

// Consentimientos registrados por quienes abrieron el link (nombre y fecha).
export async function consentimientosDe(est){
  const pub = ensureReporte(est).publico;
  if(!pub) return [];
  const d = await DB.doc("publicos/"+pub.id).get();
  return (d.exists && d.data().consentimientos) || [];
}
