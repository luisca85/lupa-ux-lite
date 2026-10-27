import { esc } from "../core/util.js";
import { SECCIONES_LEGALES } from "../views/legal.js";

/* ============ Entrar: login con código por email (spec cta, fase 2) ============
   Pantalla completa en modo servidor sin sesión (AUTH_MODE="cuentas"). Dos pasos, como
   Linear: 1) email + Turnstile → "Continuar con email"; 2) "Revisá tu email" con 6
   casillas: al completar el código se entra solo. El email también trae un botón que
   entra en ese navegador (/api/auth/verificar?t=…). Crear cuenta y entrar son el mismo
   flujo. Al entrar se recarga la app, que arranca ya con la sesión. */
const TS_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let tsCarga = null;
function cargarTurnstile(){
  if(!tsCarga) tsCarga = new Promise((res, rej) => {
    const s = document.createElement("script"); s.src = TS_SRC; s.async = true;
    s.onload = () => res(window.turnstile); s.onerror = () => rej(new Error("turnstile"));
    document.head.appendChild(s);
  });
  return tsCarga;
}
async function post(ruta, body){
  let r;
  try{ r = await fetch("api/auth/" + ruta, { method:"POST", credentials:"same-origin", headers:{ "content-type":"application/json" }, body:JSON.stringify(body || {}) }); }
  catch(e){ return { ok:false, status:0, error:"Sin conexión con el servidor. Revisá la conexión." }; }
  const j = await r.json().catch(() => ({}));
  return { ...j, ok:r.ok, status:r.status, error:j.error || (r.ok ? "" : "Error " + r.status) };
}

export function mostrarEntrada({ turnstile = null } = {}){
  document.body.classList.add("entrando");
  const prev = document.getElementById("entrar"); if(prev) prev.remove();
  const el = document.createElement("div"); el.id = "entrar"; el.className = "ent";
  document.body.appendChild(el);
  const params = new URLSearchParams(location.search);
  const avisoLink = params.get("entrar") === "vencido" ? "El botón del email venció o ya se usó. Pedí un código nuevo." : "";
  if(params.has("entrar")) history.replaceState(null, "", location.pathname);
  let email = "", tsToken = "", tsId = null, espera = 0, reloj = null;

  const marca = `<div class="ent-marca"><span class="brand-logo" aria-hidden="true"></span><span class="brand-txt"><b>uxuaria</b><small>Mutis UX</small></span></div>`;

  function pasoEmail(error){
    clearInterval(reloj);
    el.innerHTML = `<div class="ent-box">${marca}
      <h1 class="ent-t">Entrá o creá tu cuenta</h1>
      <p class="ent-s">Te mandamos un código a tu email. No hace falta contraseña.</p>
      <form class="ent-form" id="entForm" novalidate>
        <div class="pf"><label for="entEmail">Email</label><input id="entEmail" type="email" autocomplete="email" inputmode="email" placeholder="vos@ejemplo.com" value="${esc(email)}" required aria-describedby="entErr"></div>
        ${turnstile ? `<div class="ent-ts" id="entTs"></div>` : ""}
        <p class="ent-err" id="entErr" role="alert">${esc(error || "")}</p>
        <button type="submit" class="ent-btn" id="entGo">Continuar con email</button>
      </form>
      <p class="ent-pie">Al continuar aceptás los <button type="button" class="ent-link" data-legal="terminos">términos de uso</button> y la <button type="button" class="ent-link" data-legal="privacidad">política de privacidad</button>.</p>
    </div>`;
    const inp = el.querySelector("#entEmail"), btn = el.querySelector("#entGo"), err = el.querySelector("#entErr");
    el.querySelectorAll("[data-legal]").forEach(b => b.onclick = () => { email = inp.value.trim(); pasoLegal(b.dataset.legal); });
    if(turnstile){
      tsToken = "";
      cargarTurnstile().then(ts => { tsId = ts.render(el.querySelector("#entTs"), { sitekey:turnstile, callback:t => { tsToken = t; }, "expired-callback":() => { tsToken = ""; } }); })
        .catch(() => { err.textContent = "No se pudo cargar el chequeo anti-robots. Revisá la conexión y recargá."; });
    }
    el.querySelector("#entForm").onsubmit = async e => {
      e.preventDefault();
      email = inp.value.trim().toLowerCase();
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)){ err.textContent = "Escribí un email válido."; inp.focus(); return; }
      if(turnstile && !tsToken){ err.textContent = "Esperá a que termine el chequeo anti-robots."; return; }
      btn.disabled = true; btn.textContent = "Enviando…"; err.textContent = "";
      const r = await post("codigo", { email, turnstile:tsToken });
      if(r.ok){ return pasoCodigo(r.codigo); }
      if(r.status === 429 && r.espera) return pasoCodigo(null, r.error, r.espera); // ya hay un código en camino
      if(r.cupos || r.privada) return pasoCupos(r.error, r.privada ? "Beta privada" : "Cupos completos");
      btn.disabled = false; btn.textContent = "Continuar con email"; err.textContent = r.error;
      if(turnstile && window.turnstile && tsId != null){ window.turnstile.reset(tsId); tsToken = ""; }
    };
    inp.focus();
  }

  // codigoDev: solo en desarrollo y tests (AUTH_CODIGO_EN_RESPUESTA) se completa solo.
  function pasoCodigo(codigoDev, aviso, esperaInicial){
    el.innerHTML = `<div class="ent-box">${marca}
      <h1 class="ent-t">Revisá tu email</h1>
      <p class="ent-s">Te mandamos un código a <b>${esc(email)}</b>. Escribilo acá o tocá el botón del email.</p>
      <div class="ent-cod" id="entCod" role="group" aria-label="Código de 6 dígitos">${[0,1,2,3,4,5].map(i => `<input class="ent-d" inputmode="numeric" maxlength="1" aria-label="Dígito ${i+1}"${i ? "" : ' autocomplete="one-time-code"'}>`).join("")}</div>
      <p class="ent-err" id="entErr" role="alert">${esc(aviso || "")}</p>
      ${codigoDev ? `<p class="ent-dev">Desarrollo: el código es <b id="entDev">${esc(codigoDev)}</b></p>` : ""}
      <div class="ent-acts"><button type="button" class="ent-link" id="entVolver">← Volver</button><button type="button" class="ent-link" id="entOtro"></button></div>
    </div>`;
    const ds = [...el.querySelectorAll(".ent-d")], err = el.querySelector("#entErr"), otro = el.querySelector("#entOtro");
    let enviando = false;
    const leer = () => ds.map(d => d.value).join("");
    const completar = txt => { const v = String(txt).replace(/\D/g, "").slice(0, 6); ds.forEach((d, i) => d.value = v[i] || ""); (ds[Math.min(v.length, 5)]).focus(); if(v.length === 6) verificar(); };
    async function verificar(){
      if(enviando) return; enviando = true;
      err.textContent = "Entrando…"; ds.forEach(d => d.disabled = true);
      const r = await post("verificar", { email, codigo:leer() });
      if(r.ok){ location.replace(location.pathname || "/"); return; }
      enviando = false; ds.forEach(d => { d.disabled = false; d.value = ""; }); ds[0].focus();
      err.textContent = r.error;
      if(r.vencido){ espera = 0; pintarOtro(); }
    }
    ds.forEach((d, i) => {
      d.oninput = () => { const v = d.value.replace(/\D/g, ""); if(v.length > 1) return completar(v); d.value = v; if(v && i < 5) ds[i+1].focus(); if(leer().length === 6) verificar(); };
      d.onkeydown = e => { if(e.key === "Backspace" && !d.value && i > 0){ ds[i-1].focus(); ds[i-1].value = ""; e.preventDefault(); } else if(e.key === "ArrowLeft" && i > 0) ds[i-1].focus(); else if(e.key === "ArrowRight" && i < 5) ds[i+1].focus(); };
      d.onpaste = e => { e.preventDefault(); completar((e.clipboardData || window.clipboardData).getData("text")); };
    });
    function pintarOtro(){ otro.disabled = espera > 0; otro.textContent = espera > 0 ? `Podés pedir otro en ${espera} s` : "Mandar otro código"; }
    espera = esperaInicial || 60; pintarOtro();
    clearInterval(reloj); reloj = setInterval(() => { if(!el.isConnected) return clearInterval(reloj); if(espera > 0){ espera--; pintarOtro(); } }, 1000);
    otro.onclick = async () => {
      if(espera > 0) return;
      otro.disabled = true; otro.textContent = "Enviando…";
      if(turnstile) return pasoEmail("Volvé a pasar el chequeo anti-robots para pedir otro código."); // Turnstile se usa una sola vez
      const r = await post("codigo", { email });
      if(r.ok){ err.textContent = "Te mandamos un código nuevo."; espera = 60; const dev = el.querySelector("#entDev"); if(dev && r.codigo) dev.textContent = r.codigo; }
      else { err.textContent = r.error; espera = r.espera || 0; }
      pintarOtro();
    };
    el.querySelector("#entVolver").onclick = () => pasoEmail();
    ds[0].focus();
  }

  // Términos y privacidad, legibles antes de tener cuenta (la vista legal está detrás del login).
  function pasoLegal(id){
    const sec = SECCIONES_LEGALES.find(x => x.id === id) || SECCIONES_LEGALES[0];
    el.innerHTML = `<div class="ent-box ent-legal">${marca}
      <button type="button" class="ent-link" id="entVolver">← Volver</button>
      <nav class="ent-legal-nav" aria-label="Información legal">${SECCIONES_LEGALES.map(x => `<button type="button" class="ent-link${x.id === sec.id ? " on" : ""}" data-legal="${x.id}"${x.id === sec.id ? ' aria-current="page"' : ""}>${x.titulo}</button>`).join("")}</nav>
      <article class="legal-doc"><h1>${sec.titulo}</h1>${sec.html}</article>
    </div>`;
    el.querySelector("#entVolver").onclick = () => pasoEmail();
    el.querySelectorAll("[data-legal]").forEach(b => b.onclick = () => pasoLegal(b.dataset.legal));
    window.scrollTo(0, 0);
  }

  // Beta llena (MAX_CUENTAS) o privada (email sin autorizar): el email quedó en la lista
  // de espera; no se mandó nada.
  function pasoCupos(msg, titulo = "Cupos completos"){
    el.innerHTML = `<div class="ent-box">${marca}
      <h1 class="ent-t">${esc(titulo)}</h1>
      <p class="ent-s">${esc(msg || "Los cupos de la beta están completos. Te avisamos cuando haya lugar.")}</p>
      <p class="ent-s">Anotamos <b>${esc(email)}</b> en la lista de espera.</p>
      <div class="ent-acts"><button type="button" class="ent-link" id="entVolver">← Usar otro email</button></div>
    </div>`;
    el.querySelector("#entVolver").onclick = () => pasoEmail();
  }

  pasoEmail(avisoLink);
}
