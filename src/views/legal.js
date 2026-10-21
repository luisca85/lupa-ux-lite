import { goHome, render, view } from "../app/render.js";
import { state } from "../core/state.js";

/* ============ Legal: términos de uso, política de privacidad y almacenamiento ============
   Textos escritos a partir de lo que la app hace hoy (qué guarda, dónde y quién lo recibe).
   Si cambia el tratamiento de datos (nuevos servicios, analítica, pagos), actualizar acá
   y la fecha de ACTUALIZADO. */
const ACTUALIZADO="21 de octubre de 2026";
const CONTACTO='<a href="mailto:info@uxuaria.com">info@uxuaria.com</a>';
export const SECCIONES_LEGALES=[
  { id:"terminos", titulo:"Términos de uso", html:`
    <p>Lupa UX es una herramienta de uxuaria para la evaluación heurística y el diagnóstico de experiencia de usuario. Al crear tu cuenta o usarla aceptás estos términos.</p>
    <h3>Tu cuenta</h3>
    <p>Entrás con tu email: te mandamos un código o un botón para entrar, sin contraseña. La cuenta es personal; no compartas los códigos. Podés pedir que borremos tu cuenta y tus datos escribiendo a ${CONTACTO}.</p>
    <h3>Versión beta</h3>
    <p>Lupa UX está en beta gratuita con cupos limitados. En esta versión cada cuenta puede tener 1 estudio a la vez, de hasta 15 pantallas, además del estudio de ejemplo, que es de solo lectura. Estos límites pueden cambiar.</p>
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
    <p>Podemos actualizar estos términos. La fecha de la última actualización figura al pie de esta página.</p>
    <h3>Ley aplicable y jurisdicción</h3>
    <p>Estos términos se rigen por las leyes de la República Argentina. Ante cualquier conflicto, intervienen los tribunales competentes de la República Argentina.</p>` },
  { id:"privacidad", titulo:"Política de privacidad", html:`
    <p>Esta política explica qué datos trata Lupa UX, para qué y con quién se comparten. El responsable de los datos es Luis Carlos Romero León, que ofrece Lupa UX con su marca uxuaria. Los datos se tratan según la Ley 25.326 de Protección de Datos Personales de la República Argentina. Podés escribir a ${CONTACTO} por cualquier consulta.</p>
    <h3>Qué datos se guardan</h3>
    <ul>
      <li><b>Tu cuenta:</b> el email con el que ingresás y la fecha en que creaste la cuenta. Para entrar te mandamos un código de un solo uso; guardamos solo una versión cifrada (hash), nunca el código en claro.</li>
      <li><b>Lista de espera:</b> si los cupos de la beta están completos, guardamos tu email y la fecha para avisarte cuando haya lugar.</li>
      <li><b>Tu trabajo:</b> estudios, pantallas, hallazgos, flujos, textos del reporte, propuestas y los datos de marca que cargás (nombre, rol, contacto).</li>
      <li><b>De tus clientes, al abrir un reporte compartido:</b> la aceptación de las condiciones y la fecha (no se les pide ningún dato personal). Si reservan una propuesta, también la propuesta elegida y la fecha.</li>
    </ul>
    <h3>Para qué se usan</h3>
    <p>Solo para que la herramienta funcione: dejarte entrar a tu cuenta, guardar tu trabajo, mostrar el reporte a quien tenga el link y el PIN, registrar quién lo abrió y avisarte cuando un cliente reserva una propuesta. No se venden datos ni se usan para publicidad. Cada cuenta ve solo su propio trabajo.</p>
    <h3>Dónde se guardan y quién los recibe</h3>
    <ul>
      <li><b>Cloudflare</b> aloja la aplicación y su base de datos. Su servicio Turnstile verifica que quien pide un código no sea un robot.</li>
      <li><b>Resend</b> envía los correos con el código para entrar y el aviso cuando un cliente reserva una propuesta.</li>
      <li><b>Google Fonts</b> sirve las tipografías de la interfaz; tu navegador las descarga desde sus servidores.</li>
      <li>Si usás Lupa UX sin servidor, tu trabajo queda guardado solo en tu navegador.</li>
    </ul>
    <p>Estos proveedores pueden guardar o procesar los datos en servidores fuera de la Argentina.</p>
    <h3>Seguridad</h3>
    <p>Los códigos para entrar valen 10 minutos y una sola vez, y se bloquean después de 5 intentos fallidos. Del lado público, el PIN de cada reporte no se guarda en claro sino como un hash, y el acceso se bloquea 15 minutos después de 5 intentos fallidos. Los reportes compartidos se muestran en modo lectura.</p>
    <h3>Cuánto tiempo</h3>
    <p>Tus datos se conservan mientras uses la herramienta o hasta que los borres. Al despublicar un reporte se eliminan su copia pública, los consentimientos y las reservas asociadas.</p>
    <h3>Tus derechos</h3>
    <p>Podés pedir acceso, corrección o eliminación de tus datos y de tu cuenta escribiendo a ${CONTACTO}. También podés exportar tus datos desde la pantalla de estudios. El acceso a tus datos es gratuito y podés pedirlo cada seis meses, salvo que tengas un interés legítimo para hacerlo antes.</p>
    <p>La Agencia de Acceso a la Información Pública, como órgano de control de la Ley 25.326, atiende las denuncias y los reclamos de quienes consideren afectados sus derechos sobre sus datos personales.</p>` },
  { id:"reportes", titulo:"Reportes compartidos", html:`
    <p>Estas condiciones valen para quien abre un reporte que le compartieron con un link y un PIN.</p>
    <h3>Qué es un reporte compartido</h3>
    <p>Es un diagnóstico de experiencia de usuario que preparó quien te lo compartió, usando Lupa UX. El contenido, el análisis y las recomendaciones son suyos. uxuaria solo ofrece la herramienta, salvo que el reporte lo haya preparado uxuaria.</p>
    <h3>Confidencialidad</h3>
    <p>El reporte es confidencial y de solo lectura. No lo reenvíes ni compartas el PIN con personas ajenas a tu equipo sin permiso de quien te lo envió.</p>
    <h3>Qué registramos al abrirlo</h3>
    <p>Para abrirlo pedimos que aceptes estas condiciones. Guardamos la aceptación y la fecha, y se los mostramos a quien te compartió el reporte. Si reservás una propuesta, también guardamos cuál elegiste y le avisamos por email. Más detalles en la política de privacidad.</p>
    <h3>Mención del trabajo</h3>
    <p>Al aceptar estas condiciones, aceptás que quien preparó el reporte pueda mencionar que lo realizó y compartir aprendizajes generales sobre la experiencia (por ejemplo, en sus redes o su portfolio), sin revelar información clave ni datos confidenciales de tu empresa o producto.</p>` },
  { id:"almacenamiento", titulo:"Cookies y almacenamiento", html:`
    <p>Lupa UX no usa cookies de publicidad ni de analítica.</p>
    <h3>Cookies necesarias</h3>
    <p>Lupa UX usa una cookie de sesión propia (<code>lupa_sesion</code>) para mantenerte conectado durante 30 días. No se puede leer desde la página, viaja solo por conexiones seguras y se borra al cerrar sesión. Sin ella no se puede ingresar.</p>
    <p>Al pedir un código, Cloudflare Turnstile puede guardar datos técnicos en tu navegador para verificar que no seas un robot.</p>
    <h3>Almacenamiento en tu navegador</h3>
    <p>La app guarda en tu navegador algunas preferencias para que la experiencia sea cómoda:</p>
    <ul>
      <li>el tema claro u oscuro;</li>
      <li>el último estudio que abriste;</li>
      <li>si ya viste la introducción.</li>
    </ul>
    <p>Si usás Lupa UX sin servidor, tu trabajo completo también se guarda en el almacenamiento de tu navegador. Podés borrar todo esto desde la configuración de tu navegador; en ese caso perderías los datos guardados solo localmente.</p>` }
];

// Página pública /legal/{id}: se lee sin cuenta (desde la pantalla de entrada o el link
// de un reporte). No inicia la app ni consulta la API.
export function idLegalDeLaURL(){
  const m = location.pathname.match(/^\/legal\/([a-z]+)\/?$/);
  return m && SECCIONES_LEGALES.some(s => s.id === m[1]) ? m[1] : null;
}
export function abrirLegalPublica(id){
  const actual = SECCIONES_LEGALES.find(s => s.id === id) || SECCIONES_LEGALES[0];
  document.title = actual.titulo + " · Lupa UX";
  const hd = document.querySelector("header.top"); if(hd) hd.remove();
  const pie = document.getElementById("sitePie"); if(pie) pie.remove();
  view.innerHTML = `<div class="legal legal-pub">
    <div class="ent-marca"><span class="brand-logo" aria-hidden="true"></span><span class="brand-txt"><b>uxuaria</b><small>Lupa Ux</small></span></div>
    <div class="legal-in">
      <nav class="legal-nav" aria-label="Información legal">${SECCIONES_LEGALES.map(s => `<a class="cf-item${s.id === actual.id ? " on" : ""}" href="/legal/${s.id}"${s.id === actual.id ? ' aria-current="page"' : ""}><span class="cf-txt"><b>${s.titulo}</b></span></a>`).join("")}</nav>
      <article class="legal-doc"><h1>${actual.titulo}</h1>${actual.html}<p class="legal-fecha">Última actualización: ${ACTUALIZADO}</p></article>
    </div>
  </div>`;
}

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
