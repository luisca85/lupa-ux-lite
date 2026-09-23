/* ============ Selección de lo que ve el cliente ============ */
// El reporte guarda qué ítems están OCULTOS (r.ocultos): lo nuevo aparece visible
// por defecto. vistaCliente() arma la copia filtrada que usan la vista previa, la
// página autónoma y el link público: lo oculto no viaja.

export const OCULTABLES=["hallazgos","flujos","journeys","protopersonas","propuestas","bloques"];
export const BLOQUES=[["resumen","Introducción"],["objetivos","Objetivos"],["alcance","Alcance"],["muestra","Aviso de muestra inicial"]];

export function ocultos(r){
  if(!r.ocultos||typeof r.ocultos!=="object"||Array.isArray(r.ocultos)) r.ocultos={};
  OCULTABLES.forEach(k=>{ if(!Array.isArray(r.ocultos[k])) r.ocultos[k]=[]; });
  return r.ocultos;
}
export function estaOculto(r,tipo,id){ return ocultos(r)[tipo].includes(id); }
export function setOculto(r,tipo,id,oculto){
  const o=ocultos(r), arr=o[tipo].filter(x=>x!==id);
  if(oculto) arr.push(id);
  o[tipo]=arr;
}

export function vistaCliente(r,hallazgos,flujos){
  const on=r.online||{}, hid=(t,id)=>estaOculto(r,t,id), bloque=k=>!hid("bloques",k);
  const hz=on.hallazgos===false?[]:(hallazgos||[]).filter(h=>!hid("hallazgos",h.id));
  const hzIds=new Set(hz.map(h=>h.id));
  const flows=on.flujos===false?[]:(flujos||[]).filter(f=>f.tipo!=="User Journey"&&!hid("flujos",f.id))
    .map(f=>({...f,nodes:(f.nodes||[]).map(n=>({...n,markers:(n.markers||[]).filter(m=>hzIds.has(m.hallazgoId))}))}));
  const flowIds=new Set(flows.map(f=>f.id));
  const jrs=on.journeys===false?[]:(flujos||[]).filter(f=>f.tipo==="User Journey"&&!hid("journeys",f.id))
    .map(j=>({...j,pasos:(j.pasos||[]).map(p=>({...p,
      hallazgos:(p.hallazgos||[]).filter(id=>hzIds.has(id)),
      flujos:(p.flujos||[]).filter(id=>flowIds.has(id)), flujoId:undefined}))}));
  const diag=on.diagnostico!==false;
  const rr={...r,
    resumen:bloque("resumen")?r.resumen:"",
    objetivos:bloque("objetivos")?r.objetivos:"",
    alcance:bloque("alcance")?r.alcance:"",
    muestra:bloque("muestra")?r.muestra:{on:false,texto:""},
    diagIntro:diag?r.diagIntro:"",
    hallazgosClave:diag?r.hallazgosClave:[],
    recomendaciones:diag?r.recomendaciones:[],
    protopersonas:on.protopersonas===false?[]:(r.protopersonas||[]).filter(p=>!hid("protopersonas",p.id)),
    propuestas:on.propuestas===false?[]:(r.propuestas||[]).filter(p=>!hid("propuestas",p.id))};
  delete rr.ocultos; delete rr.publico; // nunca viaja al cliente
  return {r:rr,hallazgos:hz,flujos:[...flows,...jrs]};
}
