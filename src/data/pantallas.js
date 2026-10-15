import { catalogoIdsDe } from "../core/state.js";
import { LS, stripId, uid } from "../core/util.js";
import { compositeDataUrl } from "../ui/anotaciones.js";
import { DB, USE_DB } from "./backend.js";
import { store } from "./store.js";

/* ============ Modelo de datos v2: Pantalla como entidad ============
   - Pantalla: estudios/{id}/pantallas/{pid} (nombre, origen, url, orden, w, h, thumb, hash).
     Imagen completa: estudios/{id}/pantallas/{pid}/img/full ({base, w, h}).
   - Hallazgo atómico: pantallaId (opcional) + pin {x,y} relativo 0–1 (solo con pantalla),
     categoria, catalogoIds (heurísticas + sesgos), pasoId/flujoId (interacción de un flujo).
   - Los hallazgos v1 traían sus propias imágenes (imgs); migrarEstudio las convierte en
     pantallas sin borrar nada (los docs viejos quedan como respaldo, en imgsV1). */
export const MODELO=2;
export const SEV_DEFAULT=1;
export const CATEGORIAS=[["interfaz","Interfaz"],["comportamiento","Comportamiento"],["investigación","Investigación"]];
export const categoriaLabel=c=>(CATEGORIAS.find(x=>x[0]===c)||[null,""])[1];

const col=sid=>"estudios/"+sid+"/pantallas";
const imgPath=(sid,pid)=>col(sid)+"/"+pid+"/img/full";
const byOrden=(a,b)=>((a.orden??0)-(b.orden??0))||((a.createdAt||0)-(b.createdAt||0));

export const pantallaStore={
  async list(sid){
    if(USE_DB){const s=await DB.collection(col(sid)).get();return s.docs.map(d=>({id:d.id,...d.data()})).sort(byOrden);}
    return LS.get("lupa:pant:"+sid,[]).sort(byOrden);
  },
  async save(sid,p){
    if(USE_DB){await DB.doc(col(sid)+"/"+p.id).set(stripId(p));}
    else{const a=LS.get("lupa:pant:"+sid,[]);const i=a.findIndex(x=>x.id===p.id);i>=0?a[i]=p:a.push(p);LS.set("lupa:pant:"+sid,a);}
  },
  async del(sid,pid){
    if(USE_DB){await DB.doc(imgPath(sid,pid)).delete();await DB.doc(col(sid)+"/"+pid).delete();}
    else{LS.set("lupa:pant:"+sid,LS.get("lupa:pant:"+sid,[]).filter(x=>x.id!==pid));LS.del("lupa:pimg:"+pid);}
  },
  async getImg(sid,pid){
    if(USE_DB){const d=await DB.doc(imgPath(sid,pid)).get();return d.exists?d.data():null;}
    return LS.get("lupa:pimg:"+pid,null);
  },
  async putImg(sid,pid,rec){
    if(USE_DB){await DB.doc(imgPath(sid,pid)).set(rec);}
    else{LS.set("lupa:pimg:"+pid,rec);}
  }
};

/* Hash exacto del archivo ya comprimido (FNV-1a de 2 × 32 bits + largo). Funciona también
   con file:// (sin crypto.subtle). Ante coincidencia se compara el contenido completo. */
export function hashStr(s){
  let h1=0x811c9dc5,h2=0x01000193^s.length;
  for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);h1=Math.imul(h1^c,16777619);h2=Math.imul(h2^c,2246822519);}
  return (h1>>>0).toString(16).padStart(8,"0")+(h2>>>0).toString(16).padStart(8,"0")+"-"+s.length.toString(36);
}
async function thumbOf(base,maxW=220){
  const im=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=base;});
  const s=Math.min(1,maxW/(im.width||maxW)), c=document.createElement("canvas");
  c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext("2d").drawImage(im,0,0,c.width,c.height);
  return c.toDataURL("image/jpeg",0.6);
}

/* Crea una pantalla desde una imagen ya procesada ({full:{dataUrl,w,h}, thumb:{dataUrl}}),
   o devuelve la existente si es la misma imagen (deduplicación dentro del estudio). */
export async function pantallaDesdeImagen(sid,pantallas,img,nombre,extra){
  const base=img.full.dataUrl, hash=hashStr(base);
  for(const p of pantallas.filter(x=>x.hash===hash)){
    const d=await pantallaStore.getImg(sid,p.id);
    if(d&&d.base===base) return {pantalla:p,existente:true};
  }
  const p={id:uid(),nombre:(nombre||"").trim()||`Pantalla ${pantallas.length+1}`,origen:"imagen",url:"",
    orden:pantallas.reduce((m,x)=>Math.max(m,(x.orden??0)+1),0),w:img.full.w,h:img.full.h,
    thumb:img.thumb?img.thumb.dataUrl:await thumbOf(base),hash,createdAt:Date.now(),...(extra||{})};
  await pantallaStore.putImg(sid,p.id,{base,w:p.w,h:p.h});
  await pantallaStore.save(sid,p);
  return {pantalla:p,existente:false};
}

/* ---- Reglas del hallazgo ---- */
export const clamp01=v=>Math.max(0,Math.min(1,Number(v)||0));
/* Regla 6: sin pantalla no hay pin; con pantalla y sin pin, pin al centro. */
export function normalizarPin(h){
  if(!h.pantallaId){ h.pantallaId=null; h.pin=null; }
  else if(!h.pin) h.pin={x:0.5,y:0.5};
  else h.pin={x:clamp01(h.pin.x),y:clamp01(h.pin.y)};
  return h;
}
/* Regla 5: numeración visible por pantalla, en orden de creación. */
export function pinNumero(h,hallazgos){
  if(!h||!h.pantallaId) return null;
  const mismos=hallazgos.filter(x=>x.pantallaId===h.pantallaId).sort((a,b)=>((a.createdAt||0)-(b.createdAt||0))||String(a.id).localeCompare(String(b.id)));
  return mismos.findIndex(x=>x.id===h.id)+1||null;
}

/* ---- Migración v1 → v2 (idempotente, no destructiva) ---- */
export async function migrarEstudio(est){
  if((est.modelo||1)>=MODELO) return null;
  const sid=est.id, hz=await store.listHallazgos(sid), pantallas=await pantallaStore.list(sid);
  const byHash=new Map(pantallas.map(p=>[p.hash,p]));
  const nuevos=[]; let creadas=0;
  const rel=(a,d)=>({x:clamp01(a.x/(d.w||1)),y:clamp01(a.y/(d.h||1))});
  const observacion=(h,p,pin,texto,k)=>({id:uid(),tipo:"Observación",severidad:null,titulo:texto.trim().slice(0,90),descripcion:texto.trim(),
    recomendacion:"",pantalla:"",tags:[],categoria:null,catalogoIds:[],pantallaId:p.id,pin,createdAt:(h.createdAt||Date.now())+k,
    modelo:MODELO,migradoDe:h.id});
  for(const h of hz){
    if((h.modelo||1)>=MODELO) continue;
    const rec={...h,catalogoIds:catalogoIdsDe(h),categoria:h.categoria??null,modelo:MODELO};
    if(h.interaccionId&&!rec.pasoId) rec.pasoId=h.interaccionId;
    const imgs=h.imgs||[]; let k=1;
    for(let i=0;i<imgs.length;i++){
      const d=await store.getImg(sid,h.id,imgs[i].id); if(!d||!d.base) continue;
      const pins=(d.ann||[]).filter(a=>a.t==="pin").sort((a,b)=>(a.n||0)-(b.n||0));
      const otras=(d.ann||[]).filter(a=>a.t!=="pin");
      // Decisión: en la pantalla solo hay pines; flecha/texto/resaltador/lápiz quedan quemados en la imagen.
      const base=otras.length?await compositeDataUrl({base:d.base,w:d.w,h:d.h,ann:otras},0.85):d.base;
      const hash=hashStr(base);
      let p=byHash.get(hash);
      if(!p){
        p={id:uid(),nombre:(i===0&&h.pantalla)||h.titulo||`Pantalla ${pantallas.length+creadas+1}`,origen:"imagen",url:"",
          orden:pantallas.length+creadas,w:d.w,h:d.h,thumb:await thumbOf(base),hash,createdAt:h.createdAt||Date.now(),migradaDe:h.id};
        await pantallaStore.putImg(sid,p.id,{base,w:d.w,h:d.h}); await pantallaStore.save(sid,p);
        byHash.set(hash,p); creadas++;
      }
      const pin=pins[0]?rel(pins[0],d):{x:0.5,y:0.5};
      const extra=pins.slice(1).filter(a=>(a.comment||"").trim());
      if(i===0){
        rec.pantallaId=p.id; rec.pin=pin;
        // El comentario del primer pin era parte de este hallazgo: se suma a la descripción.
        const c0=(pins[0]&&pins[0].comment||"").trim();
        if(c0&&!(rec.descripcion||"").includes(c0)) rec.descripcion=[rec.descripcion,c0].filter(Boolean).join("\n\n");
      } else {
        // Decisión: cada imagen extra es otra pantalla, con una copia del hallazgo anclada ahí.
        nuevos.push({...rec,id:uid(),pantallaId:p.id,pin,createdAt:(h.createdAt||Date.now())+k++,copiaDe:h.id,imgsV1:undefined,imgs:undefined});
      }
      // Decisión: cada pin adicional con comentario es un hallazgo atómico (Observación).
      extra.forEach(a=>nuevos.push(observacion(h,p,rel(a,d),a.comment,k++)));
    }
    if(!rec.pantallaId){ rec.pantallaId=null; rec.pin=null; }
    if(imgs.length) rec.imgsV1=imgs;   // respaldo: los docs .../imgs/{id} no se borran
    delete rec.imgs;
    await store.saveHallazgo(sid,rec);
  }
  for(const n of nuevos){ delete n.imgs; delete n.imgsV1; await store.saveHallazgo(sid,n); }
  est.modelo=MODELO; await store.saveEstudio(est);
  return {pantallas:creadas,hallazgosNuevos:nuevos.length,hallazgos:hz.length};
}

/* Carga los datos de un estudio para trabajar con él, migrándolo antes si es v1. */
export async function prepararEstudio(est){
  let migracion=null;
  try{ migracion=await migrarEstudio(est); }
  catch(e){ console.error("migrarEstudio",e); migracion={error:(e&&e.message)||String(e)}; }
  const [hallazgos,pantallas]=await Promise.all([store.listHallazgos(est.id),pantallaStore.list(est.id)]);
  return {hallazgos,pantallas,migracion};
}

/* Regla 7: un hallazgo nuevo tiene los mismos campos venga de donde venga (Hallazgos,
   interacción de un flujo o paso de un journey); solo cambia el contexto. */
export function nuevoHallazgo(extra){
  return {tipo:"Problema",severidad:SEV_DEFAULT,titulo:"",descripcion:"",recomendacion:"",pantalla:"",tags:[],
    categoria:null,catalogoIds:[],pantallaId:null,pin:null,pasoId:null,flujoId:null,modelo:MODELO,...(extra||{})};
}
