/* ============ Estado y almacenamiento ============ */
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "id"+Date.now()+Math.random().toString(16).slice(2));
export const esc = s => (s==null?"":String(s)).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const stripId = o => { const c={...o}; delete c.id; return c; };
export const LS = {
  get(k,d){ try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;} },
  set(k,v){ try{localStorage.setItem(k,JSON.stringify(v));}catch(e){} },
  del(k){ try{localStorage.removeItem(k);}catch(e){} }
};
