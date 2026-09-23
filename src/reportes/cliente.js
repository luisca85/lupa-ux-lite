import { state } from "../core/state.js";
import { store } from "../data/store.js";
import { flowStore } from "../flujos/flujos.js";
import { collectShareData, montarVistaPrevia } from "../share/compartir.js";
import { brandStore } from "./comun.js";
import { toast } from "../ui/modales.js";

/* ============ Vista previa del reporte del cliente ============ */
// Usa el MISMO render que el link público y la página autónoma (SR_boot, con los
// mismos filtros de "Qué ve el cliente"), sin PIN ni consentimiento. No hay otro
// render del reporte en la app: no volver a duplicarlo.
export async function openClientReport(estId){
  const est=state.estudios.find(e=>e.id===estId);
  if(!est){ toast("No encontramos el estudio."); return; }
  try{
    // collectShareData lee los hallazgos y flujos del estudio activo desde state.
    if(state._flujosFor!==estId){ state.flujos=await flowStore.list(estId); state._flujosFor=estId; }
    state.hallazgos=await store.listHallazgos(estId); state.activeId=estId;
    state.marca=await brandStore.get();
    montarVistaPrevia(await collectShareData(est));
  }catch(e){ console.error("vista previa",e); toast("No se pudo abrir la vista previa: "+((e&&e.message)||e)); }
}
