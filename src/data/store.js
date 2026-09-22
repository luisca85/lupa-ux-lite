import { LS, stripId } from "../core/util.js";
import { DB, USE_DB } from "./backend.js";
import { x } from "../ui/iconos.js";

export const store = {
  async listEstudios(){
    if(USE_DB){const s=await DB.collection("estudios").get();return s.docs.map(d=>({id:d.id,...d.data()}));}
    return LS.get("lupa:estudios",[]);
  },
  async saveEstudio(e){
    if(USE_DB){await DB.doc("estudios/"+e.id).set(stripId(e));}
    else{const a=LS.get("lupa:estudios",[]);const i=a.findIndex(x=>x.id===e.id);i>=0?a[i]=e:a.push(e);LS.set("lupa:estudios",a);}
  },
  async delEstudio(id){
    if(USE_DB){
      const hs=await DB.collection("estudios/"+id+"/hallazgos").get();
      for(const d of hs.docs){
        const imgs=await DB.collection("estudios/"+id+"/hallazgos/"+d.id+"/imgs").get();
        await Promise.all(imgs.docs.map(im=>DB.doc("estudios/"+id+"/hallazgos/"+d.id+"/imgs/"+im.id).delete()));
        await DB.doc("estudios/"+id+"/hallazgos/"+d.id).delete();
      }
      await DB.doc("estudios/"+id).delete();
    } else {
      LS.get("lupa:hz:"+id,[]).forEach(h=>LS.del("lupa:full:"+h.id));
      LS.set("lupa:estudios",LS.get("lupa:estudios",[]).filter(x=>x.id!==id));LS.del("lupa:hz:"+id);
    }
  },
  async listHallazgos(sid){
    if(USE_DB){const s=await DB.collection("estudios/"+sid+"/hallazgos").get();return s.docs.map(d=>({id:d.id,...d.data()}));}
    return LS.get("lupa:hz:"+sid,[]);
  },
  async saveHallazgo(sid,h){
    if(USE_DB){await DB.doc("estudios/"+sid+"/hallazgos/"+h.id).set(stripId(h));}
    else{const a=LS.get("lupa:hz:"+sid,[]);const i=a.findIndex(x=>x.id===h.id);i>=0?a[i]=h:a.push(h);LS.set("lupa:hz:"+sid,a);}
  },
  async delHallazgo(sid,id){
    if(USE_DB){
      const imgs=await DB.collection("estudios/"+sid+"/hallazgos/"+id+"/imgs").get();
      await Promise.all(imgs.docs.map(im=>DB.doc("estudios/"+sid+"/hallazgos/"+id+"/imgs/"+im.id).delete()));
      await DB.doc("estudios/"+sid+"/hallazgos/"+id).delete();
    } else {LS.set("lupa:hz:"+sid,LS.get("lupa:hz:"+sid,[]).filter(x=>x.id!==id));LS.del("lupa:full:"+id);}
  },
  async getFull(sid,hid,imgId){
    if(USE_DB){const d=await DB.doc("estudios/"+sid+"/hallazgos/"+hid+"/imgs/"+imgId).get();return d.exists?d.data().full:null;}
    const m=LS.get("lupa:full:"+hid,{});return m[imgId]?m[imgId].full:null;
  },
  async getImg(sid,hid,imgId){
    let x=null;
    if(USE_DB){const d=await DB.doc("estudios/"+sid+"/hallazgos/"+hid+"/imgs/"+imgId).get();if(d.exists)x=d.data();}
    else{const m=LS.get("lupa:full:"+hid,{});x=m[imgId]||null;}
    return x?{base:x.full||x.base,w:x.w,h:x.h,ann:x.ann||[]}:null;
  },
  async putFull(sid,hid,imgId,rec){
    if(USE_DB){await DB.doc("estudios/"+sid+"/hallazgos/"+hid+"/imgs/"+imgId).set(rec);}
    else{const m=LS.get("lupa:full:"+hid,{});m[imgId]=rec;LS.set("lupa:full:"+hid,m);}
  },
  async delFull(sid,hid,imgId){
    if(USE_DB){await DB.doc("estudios/"+sid+"/hallazgos/"+hid+"/imgs/"+imgId).delete();}
    else{const m=LS.get("lupa:full:"+hid,{});delete m[imgId];LS.set("lupa:full:"+hid,m);}
  },
  async listCustom(kind){ // "heur" | "sesgo"
    const coll="cat_"+kind, key="lupa:cat:"+kind;
    if(USE_DB){const s=await DB.collection(coll).get();return s.docs.map(d=>({id:d.id,...d.data()}));}
    return LS.get(key,[]);
  },
  async saveCustom(kind,item){
    const coll="cat_"+kind, key="lupa:cat:"+kind;
    if(USE_DB){await DB.doc(coll+"/"+item.id).set(stripId(item));}
    else{const a=LS.get(key,[]);const i=a.findIndex(x=>x.id===item.id);i>=0?a[i]=item:a.push(item);LS.set(key,a);}
  },
  async delCustom(kind,id){
    const coll="cat_"+kind, key="lupa:cat:"+kind;
    if(USE_DB){await DB.doc(coll+"/"+id).delete();}
    else{LS.set(key,LS.get(key,[]).filter(x=>x.id!==id));}
  }
};
