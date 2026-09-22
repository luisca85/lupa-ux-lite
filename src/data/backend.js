export let DB=null, USE_DB=false;
/* Adaptador IndexedDB con la MISMA API tipo Firestore que espera store/flowStore/
   brandStore (DB.collection(path).get() y DB.doc(path).get()/set()/delete()).
   Es el backend de persistencia cuando no hay API (archivo local u hosting estático).
   Un único object store "docs" indexado por la ruta completa; las colecciones se
   resuelven por prefijo tomando solo los hijos directos. */
function makeIDBAdapter(){
  const DBNAME="lupaux", STORE="docs", VER=1;
  let _p=null;
  function open(){
    if(_p)return _p;
    _p=new Promise((res,rej)=>{
      const rq=indexedDB.open(DBNAME,VER);
      rq.onupgradeneeded=()=>{ const db=rq.result; if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:"_path"}); };
      rq.onsuccess=()=>res(rq.result);
      rq.onerror=()=>rej(rq.error);
    });
    return _p;
  }
  function tx(mode){ return open().then(db=>db.transaction(STORE,mode).objectStore(STORE)); }
  const clone=o=>JSON.parse(JSON.stringify(o==null?{}:o));
  const lastSeg=p=>{ const i=p.lastIndexOf("/"); return i<0?p:p.slice(i+1); };
  function docGet(path){ return tx("readonly").then(os=>new Promise((res,rej)=>{ const rq=os.get(path); rq.onsuccess=()=>{ const rec=rq.result; res({ exists:!!rec, id:lastSeg(path), data:()=> rec?clone(rec.data):{} }); }; rq.onerror=()=>rej(rq.error); })); }
  function docSet(path,data){ return tx("readwrite").then(os=>new Promise((res,rej)=>{ const rq=os.put({_path:path,data:clone(data)}); rq.onsuccess=()=>res(); rq.onerror=()=>rej(rq.error); })); }
  function docDelete(path){ return tx("readwrite").then(os=>new Promise((res,rej)=>{ const rq=os.delete(path); rq.onsuccess=()=>res(); rq.onerror=()=>rej(rq.error); })); }
  function collectionGet(path){ return tx("readonly").then(os=>new Promise((res,rej)=>{ const out=[]; const lo=path+"/"; const range=IDBKeyRange.bound(lo,lo+"￿",false,false); const rq=os.openCursor(range); rq.onsuccess=()=>{ const cur=rq.result; if(!cur){ res({docs:out}); return; } const rest=String(cur.key).slice(lo.length); if(rest && rest.indexOf("/")===-1){ const snap=clone(cur.value.data); out.push({ id:rest, data:()=>snap }); } cur.continue(); }; rq.onerror=()=>rej(rq.error); })); }
  function dumpAll(){ return tx("readonly").then(os=>new Promise((res,rej)=>{ const rq=os.getAll(); rq.onsuccess=()=>res(rq.result.map(r=>({path:r._path,data:r.data}))); rq.onerror=()=>rej(rq.error); })); }
  return {
    ready:()=>open(),
    dumpAll,
    collection:(path)=>({ get:()=>collectionGet(path) }),
    doc:(path)=>({ get:()=>docGet(path), set:(d)=>docSet(path,d), delete:()=>docDelete(path) })
  };
}
/* Adaptador HTTP: misma API, contra la API de Cloudflare Pages Functions + D1
   (functions/api). Se usa cuando la app está hosteada con backend. La sesión de
   Cloudflare Access viaja en la cookie, no hace falta manejar tokens acá. */
function makeHTTPAdapter(base){
  base=base||"api";
  async function call(method,route,path,body){
    let r;
    try{
      r=await fetch(base+"/"+route+(path?"?path="+encodeURIComponent(path):""),{
        method, credentials:"same-origin", headers:body!==undefined?{"content-type":"application/json"}:{},
        body:body!==undefined?JSON.stringify(body):undefined
      });
    }catch(e){ throw new Error("Sin conexión con el servidor (o la sesión venció: recargá la página)."); }
    const ct=r.headers.get("content-type")||"";
    if(!ct.includes("application/json")) throw new Error("La sesión venció o el servidor no respondió bien. Recargá la página.");
    const j=await r.json();
    if(!r.ok) throw new Error(j.error||("Error "+r.status));
    return j;
  }
  const lastSeg=p=>{ const i=p.lastIndexOf("/"); return i<0?p:p.slice(i+1); };
  return {
    ready:()=>call("GET","health"),
    dumpAll:async()=>(await call("GET","export")).docs,
    collection:(path)=>({ get:async()=>{ const j=await call("GET","collection",path); return {docs:j.docs.map(d=>({id:d.id,data:()=>d.data}))}; } }),
    doc:(path)=>({
      get:async()=>{ const j=await call("GET","doc",path); return {exists:j.exists,id:lastSeg(path),data:()=>j.data||{}}; },
      set:(d)=>call("PUT","doc",path,d==null?{}:d).then(()=>{}),
      delete:()=>call("DELETE","doc",path).then(()=>{})
    })
  };
}
/* Backend activo: "server" (API + D1),
   "idb" (IndexedDB del navegador) o "none" (sin persistencia disponible). */
export let DB_MODE="none";
/* Elige el backend. Devuelve un mensaje de error si la API existe pero falla
   (en ese caso NO se cae a IndexedDB), o null si quedó un backend listo. */
export async function initBackend(){
  // Hosteado con backend (Cloudflare Pages + D1): si /api/health responde, usamos el servidor.
  // Solo caemos a IndexedDB si la API NO existe (404 o respuesta que no es JSON, típico
  // de un hosting estático). Si la API existe pero falla, mostramos el error: guardar
  // en el navegador creyendo que es el servidor partiría los datos en dos lugares.
  if(/^https?:$/.test(location.protocol)){
    try{
      const r=await fetch("api/health",{credentials:"same-origin",cache:"no-store",signal:AbortSignal.timeout(6000)});
      const isJson=(r.headers.get("content-type")||"").includes("application/json");
      if(r.ok&&isJson){ DB=makeHTTPAdapter("api"); USE_DB=true; DB_MODE="server"; return null; }
      if(isJson){ const j=await r.json().catch(()=>({})); return j.error||("Error "+r.status); }
    }catch(e){ return "No se pudo contactar al servidor. Revisá la conexión."; }
  }
  // Sin backend (archivo local u hosting estático): IndexedDB del navegador.
  if(window.indexedDB){ try{ const idb=makeIDBAdapter(); await idb.ready(); DB=idb; USE_DB=true; DB_MODE="idb"; }catch(e){} }
  return null;
}
