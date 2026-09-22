import { esc } from "../core/util.js";
import { paraHTML } from "./comun.js";
import { x } from "../ui/iconos.js";

/* ---- Propuestas de trabajo ---- */
export function defaultPropuestas(){ return [
  {titulo:"Diagnóstico completo",tipo:"fixed",texto:"Completamos todo el diagnóstico, user journeys y user flows de toda la plataforma, y entregamos un documento completo para realizar un upgrade de tu MVP.",bullets:["Diagnóstico completo de la plataforma","Protopersonas","User journeys","Análisis heurísticos","Recomendaciones","Propuestas de diseño con artefactos interactivos del flujo principal","Biblioteca de tokens organizada","Prompts y estrategia IA de crecimiento"],precioModo:"monto",moneda:"USD",precio:300,lanz:{on:true,pct:20},descuentos:{mensual:null,trimestral:null,semestral:null,anual:null}},
  {titulo:"Plan Mensual - Aliado",tipo:"fixed",texto:"Trabajamos con un plan mensual y un fee fijo por tareas ilimitadas al mes. Sin contratos de permanencia.",bullets:["1 proyecto","1 sola tarea a la vez","Diseño UI y de interfaces","Análisis heurísticos","Comunicación vía chat y 1 reunión semanal"],precioModo:"monto",moneda:"USD",precio:500,lanz:{on:true,pct:20},descuentos:{mensual:null,trimestral:null,semestral:null,anual:null}},
  {titulo:"Propuesta Mensual Pro",tipo:"fixed",texto:"Trabajamos con un plan mensual y un fee fijo por tareas ilimitadas al mes. Sin contratos de permanencia.",bullets:["Hasta 2 proyectos diferentes","Hasta 2 tareas en paralelo","UI Design","UX Design","Evaluaciones heurísticas","Hasta 1 prueba con usuarios al mes","Reuniones ilimitadas"],precioModo:"monto",moneda:"USD",precio:1000,lanz:{on:true,pct:20},descuentos:{mensual:null,trimestral:null,semestral:null,anual:null}}
]; }
export function esSeedViejo(arr){ if(!Array.isArray(arr)||arr.length!==2)return false; const t=arr.map(p=>(p&&p.titulo)||""); return t[0]==="Plan mensual con fee fijo"&&t[1]==="Propuesta ad-hoc al proyecto"; }
export const PROP_DESC=[["mensual","Pago mensual",1],["trimestral","Trimestral (3 meses)",3],["semestral","Semestral (medio año)",6],["anual","Anual (12 meses)",12]];
const MONEDA_SYM={USD:"US$",ARS:"$",EUR:"€"};
export function propMoney(mon,n){ const s=MONEDA_SYM[mon]||(mon?mon+" ":""); return s+" "+Math.round(Number(n||0)).toLocaleString("es-AR"); }
export function propTipoLabel(t){ return t==="mensual"?"Plan fijo mensual":"Precio fijo"; }
export function normalizePropuesta(p){
  if(!p||typeof p!=="object")return p;
  if(p.tipo!=="mensual"&&p.tipo!=="fixed")p.tipo="fixed";
  if(p.precioModo!=="monto"&&p.precioModo!=="adefinir")p.precioModo="adefinir";
  if(!p.moneda)p.moneda="USD";
  if(p.precio===undefined)p.precio=null;
  if(!Array.isArray(p.bullets))p.bullets=[];
  if(!p.descuentos||typeof p.descuentos!=="object"||Array.isArray(p.descuentos))p.descuentos={mensual:null,trimestral:null,semestral:null,anual:null};
  PROP_DESC.forEach(([k])=>{ if(!(k in p.descuentos))p.descuentos[k]=null; });
  if(!p.lanz||typeof p.lanz!=="object")p.lanz={on:false,pct:20};
  if(p.lanz.pct==null||p.lanz.pct==="")p.lanz.pct=20;
  return p;
}
/* Precio de lanzamiento: el precio guardado YA tiene el descuento aplicado.
   El "antes" se deriva y se redondea a múltiplos de 5. */
export function propLaunch(p){
  if(!p.lanz||!p.lanz.on)return null;
  if(p.precioModo==="adefinir"||p.precio==null||p.precio==="")return null;
  const pct=Number(p.lanz.pct||0); if(pct<=0||pct>=100)return null;
  const antes=Math.round((Number(p.precio)/(1-pct/100))/5)*5;
  if(antes<=Number(p.precio))return null;
  return {antes,pct};
}
export function propPriceLine(p){
  if(p.precioModo==="adefinir"||p.precio==null||p.precio==="")return "A definir";
  return propMoney(p.moneda,p.precio)+(p.tipo==="mensual"?" /mes":"");
}
export function propDiscRows(p){
  const d=p.descuentos||{}, rows=[];
  const base=(p.precioModo!=="adefinir"&&p.precio!=null&&p.precio!=="")?Number(p.precio):null;
  PROP_DESC.forEach(([k,label,mult])=>{
    const pct=d[k];
    if(pct==null||pct===""||Number(pct)<=0)return;
    let extra="";
    if(base!=null&&p.tipo==="mensual"){
      const total=base*mult*(1-Number(pct)/100);
      extra=" · "+propMoney(p.moneda,total)+(mult>1?" ("+propMoney(p.moneda,total/mult)+"/mes)":"");
    }
    rows.push({label,pct:Number(pct),extra});
  });
  return rows;
}
/* Builder de tarjeta de propuesta (reporte del cliente en la app).
   escFn/paraFn se inyectan para poder replicar la misma vista en la página autónoma. */
export function propuestaCardHTML(p,escFn,paraFn){
  const E=escFn||esc, PA=paraFn||paraHTML;
  const rows=propDiscRows(p);
  const disc=rows.length?`<div class="cr-prop-disc"><b>Descuentos por pago adelantado</b><ul>${rows.map(r=>`<li><span>${E(r.label)}</span><span>-${r.pct}%${r.extra?E(r.extra):""}</span></li>`).join("")}</ul></div>`:"";
  const incl=(p.bullets&&p.bullets.length)?`<ul>${p.bullets.map(x=>`<li>${E(x)}</li>`).join("")}</ul>`:"";
  const L=propLaunch(p);
  const priceHTML=L
    ? `<div class="cr-prop-price has-launch"><span class="cr-prop-was">${E(propMoney(p.moneda,L.antes)+(p.tipo==="mensual"?" /mes":""))}</span><span class="cr-prop-now">${E(propPriceLine(p))}</span><span class="cr-prop-launch">Lanzamiento -${L.pct}%</span></div><div class="cr-prop-urg">Precio de lanzamiento por tiempo limitado. Reservás este valor al confirmar el servicio.</div>`
    : `<div class="cr-prop-price">${E(propPriceLine(p))}</div>`;
  return `<div class="cr-prop"><div class="cr-prop-top"><h4>${E(p.titulo)}</h4><span class="cr-prop-tag">${E(propTipoLabel(p.tipo))}</span></div>
    ${priceHTML}
    <div class="cr-prose">${PA(p.texto)}${incl}</div>${disc}</div>`;
}
