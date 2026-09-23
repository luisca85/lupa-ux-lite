import "./styles/base.css";
import "./styles/reportes.css";
import "./styles/flujos.css";
import "./styles/journey.css";
import "./styles/cliente.css";
import { goHome, render, view } from "./app/render.js";
import { state } from "./core/state.js";
import { esc } from "./core/util.js";
import { DB_MODE, initBackend } from "./data/backend.js";
import { store } from "./data/store.js";
import { mountSesion } from "./ui/sesion.js";
import { abrirReportePublico, idPublicoDeLaURL } from "./share/publico.js";
import { brandStore } from "./reportes/comun.js";
import { toast } from "./ui/modales.js";
import { initTheme } from "./ui/tema.js";

/* ============ Init ============ */
async function init(){
  // Link público /r/{id}: solo pide el PIN y muestra la foto publicada; no inicia la app.
  const pubId=idPublicoDeLaURL();
  if(pubId){ abrirReportePublico(pubId); return; }
  // Un guardado que falla (sin conexión, sesión vencida, documento muy grande) no
  // debe pasar en silencio: lo mostramos como aviso.
  window.addEventListener("unhandledrejection",e=>{ const m=e.reason&&e.reason.message; if(m&&DB_MODE==="server")toast(m); });
  initTheme();
  document.getElementById("brandBtn").onclick=goHome;
  const apiErr=await initBackend();
  if(apiErr){
    view.innerHTML=`<div class="empty"><h3>El servidor no está disponible</h3><p>${esc(apiErr)}</p><button class="btn primary" onclick="location.reload()">Reintentar</button></div>`;
    return;
  }
  const badge=document.getElementById("localBadge");
  badge.classList.remove("hidden");
  if(DB_MODE==="server"){ badge.textContent="servidor"; badge.title="Los datos se guardan en la base de datos del servidor"; }
  if(DB_MODE==="none"){ badge.textContent="almacenamiento limitado"; badge.title="IndexedDB no está disponible en este navegador: se usa localStorage (~5 MB, las imágenes pueden no entrar)"; }
  try{ state.customHeur=await store.listCustom("heur"); state.customSesgos=await store.listCustom("sesgo"); }catch(e){}
  // carga normal (workspace)
  try{
    state.estudios=await store.listEstudios();
    state.marca=await brandStore.get();
    if(DB_MODE==="server") mountSesion();
  }catch(e){
    view.innerHTML=`<div class="empty"><h3>No se pudieron cargar los datos</h3><p>${esc(e.message)}</p><button class="btn primary" onclick="location.reload()">Reintentar</button></div>`;
    return;
  }
  state.view="home";
  render();
}
init();
