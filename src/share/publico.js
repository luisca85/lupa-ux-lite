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
  gate.innerHTML = `<form class="pub-card" id="pubForm" autocomplete="off" novalidate>
      <div class="pub-brand"><span class="brand-mark"><span class="fig-ico ico-view" aria-hidden="true"></span></span>
        <span class="brand-txt"><b>uxuaria</b><small>Lupa Ux</small></span></div>
      <h1>Reporte de diagnóstico UX</h1>
      <p>Ingresá el PIN de 6 dígitos que te compartieron para ver el reporte.</p>
      <input id="pubPin" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" placeholder="••••••" aria-label="PIN de 6 dígitos" required>
      <label class="pub-lbl" for="pubEmail">Tu email</label>
      <input id="pubEmail" class="pub-nombre" type="email" maxlength="254" placeholder="nombre@empresa.com" autocomplete="email" inputmode="email" required>
      <div class="pub-terms">
        <b>Condiciones de uso</b>
        <p>Este reporte es confidencial y de solo lectura. Para abrirlo registramos tu email, que aceptaste estas condiciones y la fecha, y se lo mostramos a quien te lo compartió.</p>
        <p>Quien preparó el reporte puede mencionar que lo realizó y compartir aprendizajes generales sobre la experiencia, <b>sin revelar información clave ni datos confidenciales</b> de tu empresa o producto.</p>
        <p>Más detalles en las <a href="/legal/reportes" target="_blank" rel="noopener">condiciones de los reportes</a> y la <a href="/legal/privacidad" target="_blank" rel="noopener">política de privacidad</a>.</p>
        <label class="pub-check"><input type="checkbox" id="pubAcepto"> Acepto las condiciones de uso</label>
      </div>
      <button class="btn primary" id="pubBtn" type="submit">Ver reporte</button>
      <p class="pub-err" id="pubErr" role="alert"></p>
    </form>`;
  document.body.appendChild(gate);
  const pinEl = gate.querySelector("#pubPin"), err = gate.querySelector("#pubErr"), btn = gate.querySelector("#pubBtn");
  const mailEl = gate.querySelector("#pubEmail"), acEl = gate.querySelector("#pubAcepto");
  pinEl.focus();
  pinEl.oninput = () => { pinEl.value = pinEl.value.replace(/\D/g,"").slice(0,6); err.textContent = ""; };
  gate.querySelector("#pubForm").onsubmit = async e => {
    e.preventDefault();
    if(!/^\d{6}$/.test(pinEl.value)){ err.textContent = "El PIN tiene 6 dígitos."; return; }
    const email = mailEl.value.trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ err.textContent = "Escribí un email válido."; mailEl.focus(); return; }
    if(!acEl.checked){ err.textContent = "Para ver el reporte tenés que aceptar las condiciones de uso."; return; }
    btn.disabled = true; btn.textContent = "Abriendo...";
    try{
      const r = await fetch("/api/publico", { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify({ id, pin:pinEl.value, email, acepto:acEl.checked }) });
      const ct = r.headers.get("content-type") || "";
      if(r.ok && ct.includes("application/json")){ montarReportePublico({ ...(await r.json()), publico:{ id, pin:pinEl.value, email } }); return; }
      const j = ct.includes("application/json") ? await r.json() : {};
      err.textContent = j.error || "No se pudo abrir el reporte.";
    }catch(_){ err.textContent = "Sin conexión. Probá de nuevo."; }
    btn.disabled = false; btn.textContent = "Ver reporte"; pinEl.select();
  };
}
