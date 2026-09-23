import { HEUR_NIELSEN, SESGOS_BASE } from "./catalogo-base.js";

export const state = {
  view:"home", studyTab:"hallazgos", estudios:[], hallazgos:[], customHeur:[], customSesgos:[],
  activeId:null, catFilter:"todos", catQuery:"",
  hzTipo:"todos", hzSev:"todos", hzHeur:"todos", hzQuery:"", homeQuery:"",
  flujos:[], _flujosFor:null, flowMode:"list", activeFlowId:null, activeNodeId:null,
  flowVP:{x:40,y:40,k:1}, marca:null
};
export const STUDY_TABS=[
  {id:"hallazgos",label:"Hallazgos"},
  {id:"flujos",label:"Flujos"},
  {id:"protopersonas",label:"Protopersonas"},
  {id:"metricas",label:"Métricas"},
  {id:"reportes",label:"Reportes"}
];
export function allHeur(){ return [...HEUR_NIELSEN.map(h=>({...h,src:"Nielsen"})), ...state.customHeur.map((h,i)=>({...h,num:HEUR_NIELSEN.length+i+1,src:"Propia",custom:true}))]; }
export function allSesgos(){ return [...SESGOS_BASE.map(s=>({...s,base:true})), ...state.customSesgos.map(s=>({...s,custom:true}))]; }
export function heurById(id){ return allHeur().find(h=>h.id===id); }
export function sesgoById(id){ return allSesgos().find(s=>s.id===id); }
export function activeStudy(){ return state.estudios.find(e=>e.id===state.activeId)||null; }
