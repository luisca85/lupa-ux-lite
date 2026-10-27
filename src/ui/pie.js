import { DB } from "../data/backend.js";
import { exportAllData, importAllData } from "../data/respaldo.js";
import { abrirLegal, SECCIONES_LEGALES } from "../views/legal.js";

/* ============ Pie de página: datos de uxuaria, legales y respaldo ============
   Barra inferior de la home y de las páginas legales (en un estudio no se muestra). */
export function renderPie(){
  const pie=document.getElementById("sitePie"); if(!pie) return;
  const respaldo=DB&&DB.dumpAll?`<div class="pie-col"><b>Tus datos</b><button type="button" class="pie-link" id="dataExport" title="Descargar un respaldo JSON de todos los datos">Exportar datos</button><button type="button" class="pie-link" id="dataImport" title="Cargar un respaldo JSON (de este u otro equipo)">Importar datos</button></div>`:"";
  pie.innerHTML=`<div class="pie-in">
    <div class="pie-marca"><span class="brand-logo" aria-hidden="true"></span><div><b>uxuaria</b><span>Mutis UX · diagnóstico de experiencia con criterio humano</span><span>Luis Carlos Romero León · Consultor en diseño de experiencia de usuario</span></div></div>
    <div class="pie-col"><b>Contacto</b><a href="mailto:info@uxuaria.com">info@uxuaria.com</a><a href="https://uxuaria.com" target="_blank" rel="noopener">uxuaria.com</a></div>
    <div class="pie-col"><b>Legal</b>${SECCIONES_LEGALES.map(s=>`<button type="button" class="pie-link" data-legal="${s.id}">${s.titulo}</button>`).join("")}</div>
    ${respaldo}
  </div>
  <div class="pie-base">© ${new Date().getFullYear()} uxuaria. Todos los derechos reservados.</div>`;
  pie.querySelectorAll("[data-legal]").forEach(b=>b.onclick=()=>abrirLegal(b.dataset.legal));
  const ex=pie.querySelector("#dataExport"); if(ex) ex.onclick=()=>exportAllData(ex);
  const im=pie.querySelector("#dataImport"); if(im) im.onclick=importAllData;
}
