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
    hzOut.push({ id:h.id, tipo:h.tipo, severidad:(h.severidad!=null&&h.severidad!=="")?h.severidad:null, titulo:h.titulo||"", pantalla:h.pantalla||(p?p.nombre:""), descripcion:h.descripcion||"", recomendacion:h.recomendacion||"", heur:heurDe(h).map(x=>x.nombre), sesgos:sesgosDe(h).map(x=>x.nombre), tags:h.tags||[], imgs });
  }
  const flowsOut=[];
  for(const f of flows){ const nodes=[];
    for(const n of (f.nodes||[])){ let full=null; if(n.imgId){ try{ const d=await flowStore.getImg(est.id,f.id,n.imgId); if(d)full=d.full; }catch(e){} }
      nodes.push({ id:n.id, titulo:n.titulo||"", ve:n.ve||"", hace:n.hace||"", x:n.x||0, y:n.y||0, thumb:n.imgThumb||null, full, markers:(n.markers||[]).map(mk=>({x:mk.x,y:mk.y,hallazgoId:mk.hallazgoId})) }); }
    flowsOut.push({ id:f.id, nombre:f.nombre||"", descripcion:f.descripcion||"", nodes, edges:(f.edges||[]).map(e=>({from:e.from,to:e.to,tipo:e.tipo,label:e.label||""})) });
  }
  const jOut=journeys.map(j=>{ (j.pasos||[]).forEach(jrNormalizePaso); return { id:j.id, nombre:j.nombre||"", descripcion:j.descripcion||"", etapas:j.etapas||[], carriles:j.carriles||jrDefaultCarriles(), pasos:(j.pasos||[]).map(p=>({nombre:p.nombre,etapaId:p.etapaId,emocion:(p.emocion!=null?p.emocion:2),touchpoint:p.touchpoint||"",tpPills:p.tpPills||[],acciones:p.acciones||[],expectativas:p.expectativas||[],pain:p.pain||[],oportunidades:p.oportunidades||[]})) }; });
  const hz=v.hallazgos, byT=t=>hz.filter(x=>x.tipo===t).length, sevN=n=>hz.filter(x=>x.tipo==="Problema"&&x.severidad===n).length;
  return {
    brand:{wordmark:m.wordmark,headerImg:m.headerImg||null,nombre:m.nombre,rol:m.rol,sitio:m.sitio,email:m.email||"",tel:m.tel||"",servicioNombre:m.servicioNombre||"",servicioDesc:m.servicioDesc||"",servicioUrl:m.servicioUrl||"",linkedin:m.linkedin||"",bienvenida:m.bienvenida||"",notaIA:m.notaIA||"",notaInicial:m.notaInicial||""},
    est:{nombre:est.nombre||"",cliente:est.cliente||"",plataforma:est.plataforma||"",fecha:est.fecha||""},
    report:{resumen:r.resumen||"",objetivos:r.objetivos||"",alcance:r.alcance||"",diagIntro:r.diagIntro||"",muestra:r.muestra||{on:false,texto:""},online:r.online||{},propuestas:r.propuestas||[],hallazgosClave:r.hallazgosClave||[],recomendaciones:r.recomendaciones||[],protopersonas:[]},
    metrics:{total:hz.length,problemas:byT("Problema"),oportunidades:byT("Oportunidad"),sevAlta:sevN(3)+sevN(4)},
    hallazgos:hzOut, flows:flowsOut, journeys:jOut
  };
}
/* HTML autónomo del reporte del cliente (SR_boot + datos + CSS). Lo usa la vista previa en
   vivo de la pestaña Reportes (en un iframe, con D.preview). */
export function buildShareHtml(D){
  const css=[...document.querySelectorAll("style")].map(s=>s.textContent).join("\n");
  const boot="("+SR_BOOT_SRC.trim()+")("+JSON.stringify(D).replace(/<\//g,"<\\/")+");";
  return "<!doctype html><html lang=\"es\" data-theme=\"light\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>"+esc(D.est.nombre)+" · Diagnóstico UX</title><style>"+css+"</style></head><body style=\"margin:0;background:#faf9f5\"><div id=\"shareRoot\"></div><script>\n"+boot+"\n</scr"+"ipt></body></html>";
}
/* Renderiza el reporte del cliente (el mismo SR_boot de la página autónoma) dentro
   de la página actual. Lo usa el link público /r/{id}. */
export function montarReportePublico(D){
  document.body.innerHTML='<div id="shareRoot"></div>';
  document.body.style.cssText="margin:0;background:#faf9f5";
  (new Function("D","return ("+SR_BOOT_SRC.trim()+")(D);"))(D);
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
