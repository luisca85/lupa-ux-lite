import { montarReportePublico } from "./compartir.js";

/* ============ Página pública del reporte: /r/{id} ============ */
// No inicia la app ni toca el backend interno (que está detrás de Access): solo pide
// el PIN y llama a POST /api/publico, la única ruta sin login.

export function idPublicoDeLaURL(){
  const m = location.pathname.match(/^\/r\/([A-Za-z0-9-]{16,64})\/?$/);
  return m ? m[1] : null;
}

export function abrirReportePublico(id){
  document.title = "Reporte · Lupa UX";
  const hd = document.querySelector("header.top"); if(hd) hd.remove();
  const app = document.querySelector(".app"); if(app) app.remove();
  const gate = document.createElement("div");
  gate.className = "pub-gate";
  gate.innerHTML = `<form class="pub-card" id="pubForm" autocomplete="off">
      <div class="pub-brand"><span class="brand-mark"><span class="fig-ico ico-view" aria-hidden="true"></span></span>
        <span class="brand-txt"><b>uxuaria</b><small>Lupa Ux</small></span></div>
      <h1>Reporte de diagnóstico UX</h1>
      <p>Ingresá el PIN de 6 dígitos que te compartieron para ver el reporte.</p>
      <input id="pubPin" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" placeholder="••••••" aria-label="PIN de 6 dígitos" required>
      <label class="pub-lbl" for="pubNombre">Tu nombre</label>
      <input id="pubNombre" class="pub-nombre" maxlength="80" placeholder="Nombre y apellido" autocomplete="name" required>
      <div class="pub-terms">
        <b>Condiciones de uso</b>
        <p>Este reporte es confidencial y de solo lectura. Para abrirlo registramos tu nombre, que aceptaste estas condiciones y la fecha, y se lo mostramos a quien te lo compartió. Más detalles en las <a href="/legal/reportes" target="_blank" rel="noopener">condiciones de los reportes</a> y la <a href="/legal/privacidad" target="_blank" rel="noopener">política de privacidad</a>.</p>
        <label class="pub-check"><input type="checkbox" id="pubAcepto"> Acepto las condiciones de uso</label>
      </div>
      <div class="pub-terms" id="pubMencionBox" hidden>
        <b>Una condición más de uxuaria</b>
        <p>Este reporte lo preparó uxuaria. Al ingresar, aceptás que uxuaria pueda mencionar que realizó este diagnóstico y compartir aprendizajes generales sobre la experiencia en sus redes y portfolio, <b>sin revelar información clave ni datos confidenciales</b> de tu empresa o producto.</p>
        <label class="pub-check"><input type="checkbox" id="pubMencion"> Acepto que uxuaria lo mencione</label>
      </div>
      <button class="btn primary" id="pubBtn" type="submit">Ver reporte</button>
      <p class="pub-err" id="pubErr" role="alert"></p>
    </form>`;
  document.body.appendChild(gate);
  const pinEl = gate.querySelector("#pubPin"), err = gate.querySelector("#pubErr"), btn = gate.querySelector("#pubBtn");
  const nomEl = gate.querySelector("#pubNombre"), acEl = gate.querySelector("#pubAcepto");
  const menBox = gate.querySelector("#pubMencionBox"), menEl = gate.querySelector("#pubMencion");
  pinEl.focus();
  pinEl.oninput = () => { pinEl.value = pinEl.value.replace(/\D/g,"").slice(0,6); err.textContent = ""; };
  gate.querySelector("#pubForm").onsubmit = async e => {
    e.preventDefault();
    if(!/^\d{6}$/.test(pinEl.value)){ err.textContent = "El PIN tiene 6 dígitos."; return; }
    if(!nomEl.value.trim()){ err.textContent = "Escribí tu nombre."; nomEl.focus(); return; }
    if(!acEl.checked){ err.textContent = "Para ver el reporte tenés que aceptar las condiciones de uso."; return; }
    if(!menBox.hidden && !menEl.checked){ err.textContent = "Para ver este reporte tenés que aceptar la condición de uxuaria."; return; }
    btn.disabled = true; btn.textContent = "Abriendo...";
    try{
      const r = await fetch("/api/publico", { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify({ id, pin:pinEl.value, nombre:nomEl.value.trim(), acepto:acEl.checked, aceptoMencion:menEl.checked }) });
      const ct = r.headers.get("content-type") || "";
      if(r.ok && ct.includes("application/json")){ montarReportePublico({ ...(await r.json()), publico:{ id, pin:pinEl.value, nombre:nomEl.value.trim() } }); return; }
      const j = ct.includes("application/json") ? await r.json() : {};
      // Reporte de uxuaria: pide además la condición de mención (la decide el servidor).
      if(j.mencion){ menBox.hidden = false; err.textContent = j.error; btn.disabled = false; btn.textContent = "Ver reporte"; menEl.focus(); return; }
      err.textContent = j.error || "No se pudo abrir el reporte.";
    }catch(_){ err.textContent = "Sin conexión. Probá de nuevo."; }
    btn.disabled = false; btn.textContent = "Ver reporte"; pinEl.select();
  };
}
