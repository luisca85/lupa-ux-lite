import { HEUR_NIELSEN, SESGOS_BASE } from "./catalogo-base.js";

export const state = {
  view:"home", studyTab:"resumen", estudios:[], hallazgos:[], customHeur:[], customSesgos:[],
  activeId:null, catFilter:"todos", catQuery:"",
  hzTipo:"todos", hzSev:"todos", hzHeur:"todos", hzQuery:"", homeQuery:"",
  hzPage:null, pantallas:[], hzGroup:null, hzQuick:null, hzForm:null, hzFormNuevo:false, hzSevF:"todas", hzSel:null, hzPanel:"lista", hzCatTab:"heur", flujos:[], _flujosFor:null, _flujosLoading:false, _flujosErr:null, flowMode:"list", activeFlowId:null, activeNodeId:null,
  flowVP:{x:40,y:40,k:1}, marca:null
};
export const STUDY_TABS=[
  {id:"resumen",label:"Resumen",ico:"grid"},
  {id:"hallazgos",label:"Hallazgos",ico:"flag"},
  {id:"flujos",label:"Flujos",ico:"flow"},
  {id:"protopersonas",label:"Protopersonas",ico:"user"},
  {id:"metricas",label:"Métricas",ico:"chart",grupo:"salida",oculta:true}, // oculta por ahora
  {id:"reportes",label:"Reportes",ico:"report",grupo:"salida"},
  {id:"proyecto",label:"Configuración",ico:"gear",grupo:"salida"}
];
export function allHeur(){ return [...HEUR_NIELSEN.map(h=>({...h,src:"Nielsen"})), ...state.customHeur.map((h,i)=>({...h,num:HEUR_NIELSEN.length+i+1,src:"Propia",custom:true}))]; }
export function allSesgos(){ return [...SESGOS_BASE.map(s=>({...s,base:true})), ...state.customSesgos.map(s=>({...s,custom:true}))]; }
export function heurById(id){ return allHeur().find(h=>h.id===id); }
export function sesgoById(id){ return allSesgos().find(s=>s.id===id); }
/* Catálogo de un hallazgo: catalogoIds (modelo v2) con respaldo en heuristicas/sesgos (v1). */
export const catalogoIdsDe=h=>Array.isArray(h&&h.catalogoIds)?h.catalogoIds:[...((h&&h.heuristicas)||[]),...((h&&h.sesgos)||[])];
export const heurDe=h=>catalogoIdsDe(h).map(heurById).filter(Boolean);
export const sesgosDe=h=>catalogoIdsDe(h).map(sesgoById).filter(Boolean);
export function activeStudy(){ return state.estudios.find(e=>e.id===state.activeId)||null; }
