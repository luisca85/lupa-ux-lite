// boot.js se incrusta como TEXTO en la página autónoma: no es un módulo, no puede
// importar nada y tiene que ser autosuficiente (ver share/boot.js).
import SR_BOOT_SRC from "./boot.js?raw";
import { heurDe, sesgosDe, state } from "../core/state.js";
import { esc } from "../core/util.js";
import { pantallaStore, pinNumero } from "../data/pantallas.js";
import { flowStore } from "../flujos/flujos.js";
import { jrDefaultCarriles, jrNormalizePaso } from "../journey/journey.js";
import { ensureReporte, marcaActual } from "../reportes/comun.js";
import { vistaCliente } from "../reportes/seleccion.js";
import { compositeDataUrl } from "../ui/anotaciones.js";
import { pasosDe } from "../views/hallazgo-form.js";
import { x } from "../ui/iconos.js";

const PIN_COLOR={Problema:"#e5484d",Oportunidad:"#12a594","Observación":"#64748b"};
// Composiciones pantalla+pin ya hechas: la vista previa en vivo reconstruye el reporte seguido.
const _compCache=new Map();
export async function collectShareData(est){
  // Solo lo que el cliente puede ver: lo oculto o desmarcado no se incrusta en el HTML.
  const v=vistaCliente(ensureReporte(est),state.hallazgos,state.flujos), r=v.r, m=marcaActual();
  const flows=v.flujos.filter(f=>f.tipo!=="User Journey"), journeys=v.flujos.filter(f=>f.tipo==="User Journey");
  const hzOut=[];
  // Modelo v2: la evidencia es la pantalla del hallazgo con su pin (numerado por pantalla).
  const imgCache=new Map(), pantallas=state.pantallas||[];
  const pantallaImg=async pid=>{ if(!imgCache.has(pid)) imgCache.set(pid,pantallaStore.getImg(est.id,pid).catch(()=>null)); return imgCache.get(pid); };
  for(const h of v.hallazgos){
    const imgs=[], p=h.pantallaId?pantallas.find(x=>x.id===h.pantallaId):null;
    if(p){ try{ const d=await pantallaImg(p.id); if(d&&d.base){ const n=pinNumero(h,state.hallazgos)||1, w=d.w||p.w, hh=d.h||p.h;
      const pin=h.pin||{x:0.5,y:0.5};
      const color=PIN_COLOR[h.tipo]||"#e2483d", k=[est.id,p.id,d.base.length,d.base.slice(-32),pin.x,pin.y,n,color].join("|");
      let url=_compCache.get(k);
      if(!url){ url=await compositeDataUrl({base:d.base,w,h:hh,ann:[{t:"pin",x:pin.x*w,y:pin.y*hh,n,color}]},0.82); _compCache.set(k,url); if(_compCache.size>300) _compCache.delete(_compCache.keys().next().value); }
      imgs.push({url,pins:[]}); } }catch(e){} }
    // Dónde aparece: pasos de flows y journeys que el cliente ve (para navegar desde el hallazgo).
    const visibles=new Map([...flows,...journeys].map(f=>[f.id,f]));
    const pasosVis=pasosDe(h).filter(q=>visibles.has(q.flujoId)).map(q=>{ const f=visibles.get(q.flujoId), jr=f.tipo==="User Journey";
      const lista=jr?(f.pasos||[]):(f.nodes||[]), i=lista.findIndex(x=>x.id===q.pasoId), it=lista[i];
      return it?{tipo:jr?"journey":"flow",flujoId:f.id,pasoId:q.pasoId,flujo:f.nombre||"",paso:(i+1)+". "+((jr?it.nombre:it.titulo)||(jr?"Paso":"Interacción"))}:null; }).filter(Boolean);
    hzOut.push({ id:h.id, pasos:pasosVis, tipo:h.tipo, severidad:(h.severidad!=null&&h.severidad!=="")?h.severidad:null, titulo:h.titulo||"", pantalla:h.pantalla||(p?p.nombre:""), descripcion:h.descripcion||"", recomendacion:h.recomendacion||"", heur:heurDe(h).map(x=>x.nombre), sesgos:sesgosDe(h).map(x=>x.nombre), tags:h.tags||[], imgs });
  }
  const flowsOut=[];
  for(const f of flows){ const nodes=[];
    for(const n of (f.nodes||[])){ let full=null;
      // La imagen es la pantalla del estudio (pantallaId) o la captura propia del flujo (imgId).
      if(n.pantallaId){ const d=await pantallaImg(n.pantallaId); if(d&&d.base) full=d.base; }
      else if(n.imgId){ try{ const d=await flowStore.getImg(est.id,f.id,n.imgId); if(d)full=d.full; }catch(e){} }
      const thumb=n.imgThumb||(n.pantallaId?((pantallas.find(p=>p.id===n.pantallaId)||{}).thumb||null):null);
      // Con la misma pantalla que el hallazgo, la marca va donde está su pin (igual que en la app).
      const markers=(n.markers||[]).map(mk=>{ const h=state.hallazgos.find(x=>x.id===mk.hallazgoId), enPin=n.pantallaId&&h&&h.pantallaId===n.pantallaId&&h.pin;
        return {x:enPin?h.pin.x:mk.x,y:enPin?h.pin.y:mk.y,hallazgoId:mk.hallazgoId}; });
      nodes.push({ id:n.id, titulo:n.titulo||"", ve:n.ve||"", hace:n.hace||"", x:n.x||0, y:n.y||0, thumb, full, markers }); }
    flowsOut.push({ id:f.id, nombre:f.nombre||"", descripcion:f.descripcion||"", nodes, edges:(f.edges||[]).map(e=>({from:e.from,to:e.to,tipo:e.tipo,label:e.label||""})) });
  }
  const hzVis=new Set(v.hallazgos.map(h=>h.id));
  const jOut=journeys.map(j=>{ (j.pasos||[]).forEach(jrNormalizePaso); return { id:j.id, nombre:j.nombre||"", descripcion:j.descripcion||"", etapas:(j.etapas||[]).map(e=>({id:e.id,nombre:e.nombre||"",descripcion:e.descripcion||"",color:e.color||""})), carriles:j.carriles||jrDefaultCarriles(), pasos:(j.pasos||[]).map(p=>({id:p.id,hallazgos:(p.hallazgos||[]).filter(id=>hzVis.has(id)),nombre:p.nombre,etapaId:p.etapaId,emocion:(p.emocion!=null?p.emocion:2),touchpoint:p.touchpoint||"",tpPills:p.tpPills||[],acciones:p.acciones||[],expectativas:p.expectativas||[],pain:p.pain||[],oportunidades:p.oportunidades||[]})) }; });
  const hz=v.hallazgos, byT=t=>hz.filter(x=>x.tipo===t).length, sevN=n=>hz.filter(x=>x.tipo==="Problema"&&x.severidad===n).length;
  return {
    brand:{wordmark:m.wordmark,headerImg:m.headerImg||null,nombre:m.nombre,rol:m.rol,sitio:m.sitio,email:m.email||"",tel:m.tel||"",servicioNombre:m.servicioNombre||"",servicioDesc:m.servicioDesc||"",servicioUrl:m.servicioUrl||"",linkedin:m.linkedin||"",bienvenida:m.bienvenida||"",notaIA:m.notaIA||"",notaInicial:m.notaInicial||""},
    est:{nombre:est.nombre||"",cliente:est.cliente||"",plataforma:est.plataforma||"",fecha:est.fecha||""},
    report:{resumen:r.resumen||"",objetivos:r.objetivos||"",alcance:r.alcance||"",diagIntro:r.diagIntro||"",muestra:r.muestra||{on:false,texto:""},online:r.online||{},propuestas:r.propuestas||[],tj:r.tj||null,hallazgosClave:r.hallazgosClave||[],recomendaciones:r.recomendaciones||[],protopersonas:[],pestanas:r.pestanas||[]},
    metrics:{total:hz.length,problemas:byT("Problema"),oportunidades:byT("Oportunidad"),sevAlta:sevN(3)+sevN(4)},
    hallazgos:hzOut, flows:flowsOut, journeys:jOut
  };
}
/* HTML autónomo del reporte del cliente (SR_boot + datos + CSS). Lo usa la vista previa en
   vivo de la pestaña Reportes (en un iframe, con D.preview). */
export function buildShareHtml(D){
  const css=[...document.querySelectorAll("style")].map(s=>s.textContent).join("\n");
  // Las tipografías de Google Fonts que carga la app (index.html), para que se vean igual.
  const fuentes=[...document.querySelectorAll('link[rel="stylesheet"]')].map(l=>l.href).filter(h=>/^https:\/\/fonts\.googleapis\.com\//.test(h)).map(h=>'<link rel="stylesheet" href="'+esc(h)+'">').join("");
  const boot="("+SR_BOOT_SRC.trim()+")("+JSON.stringify(D).replace(/</g,"\\u003c")+");";
  return "<!doctype html><html lang=\"es\" data-theme=\"light\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>"+esc(D.est.nombre)+" · Diagnóstico UX</title>"+fuentes+"<style>"+css+"</style></head><body style=\"margin:0;background:#faf9f5\"><div id=\"shareRoot\"></div><script>\n"+boot+"\n</scr"+"ipt></body></html>";
}
/* Link público /r/{id}: el reporte (el mismo SR_boot) corre en un iframe con sandbox y SIN
   allow-same-origin, o sea en un origen opaco. Así, aunque la foto publicada traiga algo
   malicioso, no puede usar la sesión de quien abre el link ni llamar a la API de la app.
   La reserva la hace esta página (que tiene id y PIN): el iframe la pide por postMessage. */
export function montarReportePublico(D,reservar){
  document.body.innerHTML="";
  document.body.style.cssText="margin:0;background:#faf9f5;overflow:hidden";
  const fr=document.createElement("iframe");
  fr.className="pub-frame"; fr.title=(D.est&&D.est.nombre?D.est.nombre+" · ":"")+"Reporte";
  fr.setAttribute("sandbox","allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation");
  fr.setAttribute("referrerpolicy","no-referrer");
  fr.style.cssText="position:fixed;inset:0;width:100%;height:100%;border:0;display:block";
  fr.srcdoc=buildShareHtml({...D,publico:{aislado:true}});
  addEventListener("message",async e=>{
    if(e.source!==fr.contentWindow||!e.data||typeof e.data!=="object"||!e.data.lupaReserva) return;
    const q=e.data.lupaReserva, n=e.data.n, txt=v=>String(v==null?"":v).slice(0,140);
    let ok=false; try{ ok=await reservar({id:txt(q.id),titulo:txt(q.titulo),precio:txt(q.precio)}); }catch(_){ ok=false; }
    fr.contentWindow.postMessage({lupaReservaOk:!!ok,n},"*");
  });
  document.body.appendChild(fr);
  fr.focus();
}

/* Vista previa en la app: el mismo SR_boot sobre una capa encima de la app, sin
   bloqueo de copia (D.preview). Al cerrar se restaura el tema de la app. */
export function montarVistaPrevia(D){
  const html=document.documentElement, temaPrevio=html.getAttribute("data-theme");
  const ov=document.createElement("div"); ov.id="clientRoot"; ov.className="rpt-preview";
  ov.innerHTML='<div class="rpt-preview-bar"><span>Vista previa · así lo ve tu cliente en el link público</span><button type="button" class="btn sm" id="rpvClose">Cerrar vista previa</button></div><div id="shareRoot"></div>';
  document.body.appendChild(ov); document.body.style.overflow="hidden";
  // La app queda oculta e inerte (sin foco ni lectura) mientras la vista previa está abierta.
  const fondo=[document.querySelector("header.top"),document.querySelector(".app")].filter(Boolean);
  fondo.forEach(el=>{ el.setAttribute("inert",""); el.hidden=true; });
  (new Function("D","return ("+SR_BOOT_SRC.trim()+")(D);"))({...D,preview:true});
  const onKey=e=>{ if(e.key==="Escape"&&!document.querySelector(".li-bg,#shLB")) close(); };
  function close(){
    ov.remove(); document.querySelectorAll("#shLB,.li-bg").forEach(el=>el.remove());
    document.body.style.overflow=""; document.removeEventListener("keydown",onKey);
    fondo.forEach(el=>{ el.removeAttribute("inert"); el.hidden=false; });
    if(temaPrevio) html.setAttribute("data-theme",temaPrevio); else html.removeAttribute("data-theme");
  }
  ov.querySelector("#rpvClose").onclick=close;
  document.addEventListener("keydown",onKey);
}
