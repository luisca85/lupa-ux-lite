import { render } from "../app/render.js";
import { state } from "../core/state.js";
import { DB } from "./backend.js";
import { store } from "./store.js";
import { brandStore } from "../reportes/comun.js";
import { downloadFile } from "../ui/descargas.js";
import { toast } from "../ui/modales.js";

/* ============ Respaldo: exportar / importar ============ */
/* Formato: {app:"lupaux", version:1, exportedAt, docs:[{path,data}]}. Sirve para
   pasar datos de IndexedDB (un navegador) al servidor, o entre equipos. Usa solo
   la API de DB (dumpAll + doc().set), así funciona igual con cualquier backend. */
export async function exportAllData(btn){
  try{
    if(btn)btn.disabled=true;
    const docs=await DB.dumpAll();
    const payload=JSON.stringify({app:"lupaux",version:1,exportedAt:new Date().toISOString(),docs});
    const fecha=new Date().toISOString().slice(0,10);
    downloadFile({filename:"lupaux-respaldo-"+fecha+".json",data:new Blob([payload],{type:"application/json"})});
    toast("Respaldo exportado ("+docs.length+" documentos)");
  }catch(e){ toast("No se pudo exportar: "+e.message); }
  finally{ if(btn)btn.disabled=false; }
}
export function importAllData(){
  const inp=document.createElement("input"); inp.type="file"; inp.accept="application/json,.json";
  inp.onchange=async()=>{
    const f=inp.files&&inp.files[0]; if(!f)return;
    let j;
    try{ j=JSON.parse(await f.text()); }catch(e){ toast("El archivo no es un JSON válido"); return; }
    if(!j||j.app!=="lupaux"||!Array.isArray(j.docs)){ toast("El archivo no es un respaldo de Lupa UX"); return; }
    if(!confirm("Se van a importar "+j.docs.length+" documentos. Los que ya existan con la misma ruta se reemplazan. ¿Continuar?"))return;
    let ok=0, fail=0; const queue=j.docs.slice();
    const worker=async()=>{ while(queue.length){ const d=queue.shift(); if(!d||typeof d.path!=="string")continue; try{ await DB.doc(d.path).set(d.data||{}); ok++; }catch(e){ fail++; } } };
    toast("Importando…");
    await Promise.all([worker(),worker(),worker(),worker()]);
    state.estudios=await store.listEstudios(); state.marca=await brandStore.get();
    state.customHeur=await store.listCustom("heur"); state.customSesgos=await store.listCustom("sesgo");
    render();
    toast(fail?("Importados "+ok+", fallaron "+fail):("Importados "+ok+" documentos"));
  };
  inp.click();
}
