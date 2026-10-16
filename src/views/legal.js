import { goHome, render, view } from "../app/render.js";
import { state } from "../core/state.js";

/* ============ Legal: términos de uso, política de privacidad y almacenamiento ============
   Textos escritos a partir de lo que la app hace hoy (qué guarda, dónde y quién lo recibe).
   Si cambia el tratamiento de datos (nuevos servicios, analítica, pagos), actualizar acá
   y la fecha de ACTUALIZADO. */
const ACTUALIZADO="15 de octubre de 2026";
const CONTACTO='<a href="mailto:info@uxuaria.com">info@uxuaria.com</a>';
export const SECCIONES_LEGALES=[
  { id:"terminos", titulo:"Términos de uso", html:`
    <p>Lupa UX es una herramienta de uxuaria para la evaluación heurística y el diagnóstico de experiencia de usuario. Al usarla aceptás estos términos.</p>
    <h3>Para qué sirve</h3>
    <p>Lupa UX te ayuda a registrar hallazgos, organizarlos y compartir un reporte con tu cliente. El análisis, las conclusiones y las recomendaciones son tuyos: la herramienta no genera diagnósticos automáticos.</p>
    <h3>Tu contenido</h3>
    <p>Lo que cargás (estudios, capturas, hallazgos, textos, propuestas) sigue siendo tuyo o de tu cliente. Sos responsable de tener permiso para usar las capturas y la información que subís, y de no incluir datos personales de terceros que no sean necesarios.</p>
    <h3>Reportes compartidos</h3>
    <p>Cuando compartís un reporte se genera un link con un PIN. Quien tenga ambos puede verlo en modo lectura. Cuidá a quién se los das; podés generar un PIN nuevo o despublicar el reporte en cualquier momento.</p>
    <h3>Uso adecuado</h3>
    <p>No uses la herramienta para actividades ilegales, para intentar acceder a datos de otras personas ni para afectar su funcionamiento.</p>
    <h3>Disponibilidad</h3>
    <p>Trabajamos para que Lupa UX funcione de forma continua, pero puede tener interrupciones o cambios. Te recomendamos exportar un respaldo de tus datos de forma periódica.</p>
    <h3>Cambios</h3>
    <p>Podemos actualizar estos términos. La fecha de la última actualización figura al pie de esta página.</p>` },
  { id:"privacidad", titulo:"Política de privacidad", html:`
    <p>Esta política explica qué datos trata Lupa UX, para qué y con quién se comparten. El responsable de los datos es Luis Carlos Romero, que ofrece Lupa UX con su marca uxuaria. Podés escribir a ${CONTACTO} por cualquier consulta.</p>
    <h3>Qué datos se guardan</h3>
    <ul>
      <li><b>Tu cuenta:</b> el email con el que ingresás, que verifica Cloudflare Access para darte acceso.</li>
      <li><b>Tu trabajo:</b> estudios, pantallas, hallazgos, flujos, textos del reporte, propuestas y los datos de marca que cargás (nombre, rol, contacto).</li>
      <li><b>De tus clientes, al abrir un reporte compartido:</b> el nombre que escriben, la aceptación de las condiciones y la fecha. Si reservan una propuesta, también la propuesta elegida y la fecha.</li>
    </ul>
    <h3>Para qué se usan</h3>
    <p>Solo para que la herramienta funcione: guardar tu trabajo, mostrar el reporte a quien tenga el link y el PIN, registrar quién lo abrió y avisarte cuando un cliente reserva una propuesta. No se venden datos ni se usan para publicidad.</p>
    <h3>Dónde se guardan y quién los recibe</h3>
    <ul>
      <li><b>Cloudflare</b> aloja la aplicación y su base de datos, y gestiona el inicio de sesión.</li>
      <li><b>Resend</b> envía el correo de aviso cuando un cliente reserva una propuesta.</li>
      <li><b>Google Fonts</b> sirve las tipografías de la interfaz; tu navegador las descarga desde sus servidores.</li>
      <li>Si usás Lupa UX sin servidor, tu trabajo queda guardado solo en tu navegador.</li>
    </ul>
    <h3>Seguridad</h3>
    <p>Del lado público, el PIN de cada reporte no se guarda en claro sino como un hash, y el acceso se bloquea 15 minutos después de 5 intentos fallidos. Los reportes compartidos se muestran en modo lectura.</p>
    <h3>Cuánto tiempo</h3>
    <p>Tus datos se conservan mientras uses la herramienta o hasta que los borres. Al despublicar un reporte se eliminan su copia pública, los consentimientos y las reservas asociadas.</p>
    <h3>Tus derechos</h3>
    <p>Podés pedir acceso, corrección o eliminación de tus datos escribiendo a ${CONTACTO}. También podés exportar tus datos desde la pantalla de estudios.</p>` },
  { id:"almacenamiento", titulo:"Cookies y almacenamiento", html:`
    <p>Lupa UX no usa cookies de publicidad ni de analítica.</p>
    <h3>Cookies necesarias</h3>
    <p>Cloudflare Access usa una cookie de sesión para mantenerte conectado de forma segura. Sin ella no se puede ingresar.</p>
    <h3>Almacenamiento en tu navegador</h3>
    <p>La app guarda en tu navegador algunas preferencias para que la experiencia sea cómoda:</p>
    <ul>
      <li>el tema claro u oscuro;</li>
      <li>el último estudio que abriste;</li>
      <li>si ya viste la introducción.</li>
    </ul>
    <p>Si usás Lupa UX sin servidor, tu trabajo completo también se guarda en el almacenamiento de tu navegador. Podés borrar todo esto desde la configuración de tu navegador; en ese caso perderías los datos guardados solo localmente.</p>` }
];

export function abrirLegal(id){ state.view="legal"; state.legalTab=id||"terminos"; render(); window.scrollTo(0,0); }

export function renderLegal(){
  const actual=SECCIONES_LEGALES.find(s=>s.id===state.legalTab)||SECCIONES_LEGALES[0];
  view.innerHTML=`<div class="legal">
    <button type="button" class="cf-back" id="legalBack"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg> Volver a estudios</button>
    <div class="legal-in">
      <nav class="legal-nav" aria-label="Información legal">${SECCIONES_LEGALES.map(s=>`<button type="button" class="cf-item${s.id===actual.id?" on":""}" data-legal="${s.id}"${s.id===actual.id?' aria-current="page"':""}><span class="cf-txt"><b>${s.titulo}</b></span></button>`).join("")}</nav>
      <article class="legal-doc"><h1>${actual.titulo}</h1>${actual.html}<p class="legal-fecha">Última actualización: ${ACTUALIZADO}</p></article>
    </div>
  </div>`;
  view.querySelector("#legalBack").onclick=goHome;
  view.querySelectorAll("[data-legal]").forEach(b=>b.onclick=()=>{ state.legalTab=b.dataset.legal; renderLegal(); window.scrollTo(0,0); });
}
