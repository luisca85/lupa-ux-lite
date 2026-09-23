import { esc } from "../core/util.js";

/* ============ Sesión visible (Cloudflare Access) ============ */
// El login lo hace Access antes de que cargue la app; acá solo mostramos quién
// entró (GET /api/me) y ofrecemos el logout estándar de Access.
const LOGOUT_URL = "/cdn-cgi/access/logout";

export async function mountSesion(){
  const slot = document.getElementById("userSlot");
  if(!slot) return;
  let user = null;
  try{
    const r = await fetch("api/me", { headers:{ accept:"application/json" } });
    if(r.ok && (r.headers.get("content-type")||"").includes("application/json")) user = await r.json();
  }catch(e){}
  if(!user) return;

  const email = user.email || "";
  const label = user.local ? "Desarrollo local" : (email || "Sesión activa");
  const initial = user.local ? "·" : (email.trim()[0] || "?").toUpperCase();
  slot.innerHTML = `
    <button class="user-chip" id="userChip" aria-haspopup="menu" aria-expanded="false" title="${esc(label)}">
      <span class="user-av">${esc(initial)}</span><span class="user-mail">${esc(label)}</span>
    </button>
    <div class="user-menu hidden" id="userMenu" role="menu">
      <div class="user-menu-h">
        <span class="user-av lg">${esc(initial)}</span>
        <div><div class="user-menu-t">${esc(label)}</div>
        <div class="user-menu-s">${user.local ? "Sin login (AUTH_MODE = none)" : "Sesión de Cloudflare Access"}</div></div>
      </div>
      <div class="user-menu-mode">Datos guardados en el servidor</div>
      ${user.local
        ? `<div class="user-menu-note">En producción acá aparece el email con el que entraste y el botón para cerrar sesión.</div>`
        : `<a class="user-menu-item" role="menuitem" href="${LOGOUT_URL}">Cerrar sesión</a>`}
    </div>`;

  const chip = slot.querySelector("#userChip"), menu = slot.querySelector("#userMenu");
  const close = () => { menu.classList.add("hidden"); chip.setAttribute("aria-expanded","false"); };
  chip.onclick = e => {
    e.stopPropagation();
    const open = menu.classList.toggle("hidden") === false;
    chip.setAttribute("aria-expanded", String(open));
  };
  document.addEventListener("click", e => { if(!slot.contains(e.target)) close(); });
  document.addEventListener("keydown", e => { if(e.key === "Escape") close(); });
}
