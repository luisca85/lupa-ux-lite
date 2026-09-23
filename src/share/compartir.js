// boot.js se incrusta como TEXTO en la página autónoma: no es un módulo, no puede
// importar nada y tiene que ser autosuficiente (ver share/boot.js).
import SR_BOOT_SRC from "./boot.js?raw";
import { heurById, sesgoById, state } from "../core/state.js";
import { esc } from "../core/util.js";
import { store } from "../data/store.js";
import { flowStore } from "../flujos/flujos.js";
import { jrDefaultCarriles, jrNormalizePaso } from "../journey/journey.js";
import { ensureReporte, marcaActual } from "../reportes/comun.js";
import { vistaCliente } from "../reportes/seleccion.js";
import { compositeDataUrl } from "../ui/anotaciones.js";
import { downloadFile } from "../ui/descargas.js";
import { x } from "../ui/iconos.js";

export async function collectShareData(est){
  // Solo lo que el cliente puede ver: lo oculto o desmarcado no se incrusta en el HTML.
  const v=vistaCliente(ensureReporte(est),state.hallazgos,state.flujos), r=v.r, m=marcaActual();
  const flows=v.flujos.filter(f=>f.tipo!=="User Journey"), journeys=v.flujos.filter(f=>f.tipo==="User Journey");
  const hzOut=[];
  for(const h of v.hallazgos){
    const imgs=[];
    for(const im of (h.imgs||[])){ try{ const d=await store.getImg(est.id,h.id,im.id); if(d){ const url=await compositeDataUrl(d,0.82); const pins=(d.ann||[]).filter(a=>a.t==="pin").sort((a,b)=>(a.n||0)-(b.n||0)).map(p=>({n:p.n,color:p.color||"#e2483d",comment:p.comment||""})); imgs.push({url,pins}); } }catch(e){} }
    hzOut.push({ id:h.id, tipo:h.tipo, severidad:(h.severidad!=null&&h.severidad!=="")?h.severidad:null, titulo:h.titulo||"", pantalla:h.pantalla||"", descripcion:h.descripcion||"", recomendacion:h.recomendacion||"", heur:(h.heuristicas||[]).map(id=>{const x=heurById(id);return x?x.nombre:null;}).filter(Boolean), sesgos:(h.sesgos||[]).map(id=>{const x=sesgoById(id);return x?x.nombre:null;}).filter(Boolean), tags:h.tags||[], imgs });
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
    report:{resumen:r.resumen||"",objetivos:r.objetivos||"",alcance:r.alcance||"",diagIntro:r.diagIntro||"",muestra:r.muestra||{on:false,texto:""},online:r.online||{},propuestas:r.propuestas||[],hallazgosClave:r.hallazgosClave||[],recomendaciones:r.recomendaciones||[],protopersonas:r.protopersonas||[]},
    metrics:{total:hz.length,problemas:byT("Problema"),oportunidades:byT("Oportunidad"),sevAlta:sevN(3)+sevN(4)},
    hallazgos:hzOut, flows:flowsOut, journeys:jOut
  };
}
export async function generateSharePage(est,btn){
  const msg=document.getElementById("rptCliMsg"); const setM=(t,ok)=>{ if(msg){msg.textContent=t;msg.className="hint"+(ok?" ok":"");} };
  const orig=btn?btn.innerHTML:""; if(btn){ btn.disabled=true; btn.innerHTML="Generando..."; }
  try{
    setM("Recolectando datos e imágenes...");
    const D=await collectShareData(est);
    const css=[...document.querySelectorAll("style")].map(s=>s.textContent).join("\n");
    const boot="("+SR_BOOT_SRC.trim()+")("+JSON.stringify(D).replace(/<\//g,"<\\/")+");";
    const html="<!doctype html><html lang=\"es\" data-theme=\"light\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>"+esc(D.est.nombre)+" · Diagnóstico UX</title><style>"+css+"</style></head><body style=\"margin:0;background:#faf9f5\"><div id=\"shareRoot\"></div><script>\n"+boot+"\n</scr"+"ipt></body></html>";
    const fname=((D.est.nombre||"reporte").replace(/[^\w\-]+/g,"_").slice(0,60)||"reporte")+"-reporte.html";
    setM("Preparando descarga...");
    downloadFile({filename:fname,data:html});
    setM("Página HTML generada. Compartila con quien quieras.",true);
  }catch(e){ console.error("generateSharePage",e); setM("No se pudo generar: "+((e&&(e.message||e.code))||e)); }
  finally{ if(btn){ btn.disabled=false; btn.innerHTML=orig; } }
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
