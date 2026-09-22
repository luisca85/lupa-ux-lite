import { LS } from "../core/util.js";

/* ============ Tema ============ */
export function initTheme(){
  const saved=LS.get("lupa:theme",null);
  if(saved)document.documentElement.setAttribute("data-theme",saved);
  document.getElementById("themeBtn").onclick=()=>{
    const cur=document.documentElement.getAttribute("data-theme");
    const isDark = cur==="dark" || (!cur && matchMedia("(prefers-color-scheme:dark)").matches);
    const next=isDark?"light":"dark";
    document.documentElement.setAttribute("data-theme",next); LS.set("lupa:theme",next);
  };
}
