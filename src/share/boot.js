/* ============ Página HTML autónoma para compartir ============ */
/* SR_boot corre DENTRO del archivo generado (self-contained). No usa db ni
   localStorage: renderiza el reporte del cliente desde el objeto D embebido. */
function SR_boot(D){
  const root=document.getElementById("shareRoot"); if(!root)return;
  const esc=s=>(s==null?"":String(s)).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const linesOf=t=>String(t||"").split("\n").map(s=>s.replace(/^[-•]\s*/,"").trim()).filter(Boolean);
  const bullets=t=>{const l=linesOf(t);if(!l.length)return"";if(l.length===1)return"<p>"+esc(l[0])+"</p>";return"<ul>"+l.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul>";};
  const para=t=>String(t||"").split(/\n{2,}/).map(p=>p.trim()).filter(Boolean).map(p=>"<p>"+esc(p).replace(/\n/g,"<br>")+"</p>").join("");
  const PROP_DESC=[["mensual","Pago mensual",1],["trimestral","Trimestral (3 meses)",3],["semestral","Semestral (medio año)",6],["anual","Anual (12 meses)",12]];
  const MSYM={USD:"US$",ARS:"$",EUR:"€"};
  const money=(m,n)=>(MSYM[m]||(m?m+" ":""))+" "+Math.round(Number(n||0)).toLocaleString("es-AR");
  const priceLine=p=>(p.precioModo==="adefinir"||p.precio==null||p.precio==="")?"A definir":money(p.moneda,p.precio)+(p.tipo==="mensual"?" /mes":"");
  function propCard(p){
    const base=(p.precioModo!=="adefinir"&&p.precio!=null&&p.precio!=="")?Number(p.precio):null;
    const rows=PROP_DESC.map(([k,label,mult])=>{ const d=(p.descuentos||{})[k]; if(d==null||d===""||Number(d)<=0)return null; let ex=""; if(base!=null&&p.tipo==="mensual"){ const tot=base*mult*(1-Number(d)/100); ex=" · "+money(p.moneda,tot)+(mult>1?" ("+money(p.moneda,tot/mult)+"/mes)":""); } return {label,pct:Number(d),ex}; }).filter(Boolean);
    const disc=rows.length?'<div class="cr-prop-disc"><b>Descuentos por pago adelantado</b><ul>'+rows.map(r=>'<li><span>'+esc(r.label)+'</span><span>-'+r.pct+'%'+(r.ex?esc(r.ex):"")+'</span></li>').join("")+'</ul></div>':"";
    const incl=(p.bullets&&p.bullets.length)?'<ul>'+p.bullets.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>':"";
    let priceHTML='<div class="cr-prop-price">'+esc(priceLine(p))+'</div>';
    if(p.lanz&&p.lanz.on&&base!=null){ const pct=Number(p.lanz.pct||0); if(pct>0&&pct<100){ const antes=Math.round((base/(1-pct/100))/5)*5; if(antes>base){ priceHTML='<div class="cr-prop-price has-launch"><span class="cr-prop-was">'+esc(money(p.moneda,antes)+(p.tipo==="mensual"?" /mes":""))+'</span><span class="cr-prop-now">'+esc(priceLine(p))+'</span><span class="cr-prop-launch">Lanzamiento -'+pct+'%</span></div><div class="cr-prop-urg">Precio de lanzamiento por tiempo limitado. Reservás este valor al confirmar el servicio.</div>'; } } }
    return '<div class="cr-prop"><div class="cr-prop-top"><h4>'+esc(p.titulo)+'</h4><span class="cr-prop-tag">'+esc(p.tipo==="mensual"?"Plan fijo mensual":"Precio fijo")+'</span></div>'+priceHTML+'<div class="cr-prose">'+para(p.texto)+incl+'</div>'+disc+'</div>';
  }
  const SEV=[{l:"No es problema"},{l:"Cosmético"},{l:"Menor"},{l:"Mayor"},{l:"Catástrofe"}];
  const RSEV=["#8b95a5","#3aa76d","#8fbf3f","#e0a52b","#e5484d"];
  const EMO=[{e:"😣",l:"Muy negativo"},{e:"🙁",l:"Negativo"},{e:"😐",l:"Neutral"},{e:"🙂",l:"Positivo"},{e:"😄",l:"Muy positivo"}];
  const CARR=[{id:"touchpoint",label:"Touchpoint"},{id:"emocion",label:"Emocionalidad"},{id:"acciones",label:"Acciones"},{id:"expectativas",label:"Expectativas / pensamiento"},{id:"pain",label:"Pain points"},{id:"oportunidades",label:"Oportunidades"}];
  const JW=224;
  const hzById={}; D.hallazgos.forEach(h=>hzById[h.id]=h);
  const SVG=(w,p,sw)=>'<svg width="'+w+'" height="'+w+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'+(sw||1.8)+'" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>';
  const ICP={home:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',flag:'<path d="M5 21V4M5 4h11l-2 3.5L16 11H5"/>',flow:'<circle cx="6" cy="6" r="2.2"/><circle cx="18" cy="6" r="2.2"/><circle cx="12" cy="18" r="2.2"/><path d="M8.2 6H16M6 8.2V13a3 3 0 0 0 3 3h1M18 8.2V13a3 3 0 0 1-3 3h-1"/>',chart:'<path d="M4 20V4M4 20h16M8 20v-6M12 20V9M16 20v-9"/>',user:'<circle cx="12" cy="8" r="3.4"/><path d="M5 20a7 7 0 0 1 14 0"/>',report:'<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',spark:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'};
  const crIco=t=>SVG(16,ICP[t]||"");
  const chevR='<svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>';
  const chevL='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg>';
  const xIco='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  const flowIco='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="6" height="5" rx="1"/><rect x="15" y="15" width="6" height="5" rx="1"/><path d="M9 6.5h4a2 2 0 0 1 2 2v9"/></svg>';
  const flagIco='<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 3.5L16 11H5"/></svg>';
  const camIco='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8a2 2 0 0 1 2-2h1.6l.9-1.5h5l.9 1.5H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><circle cx="12" cy="12.5" r="3.2"/></svg>';
  function pinColor(h){ if(!h)return"#8b95a5"; if(h.severidad!=null&&h.severidad!=="")return RSEV[h.severidad]||"#8b95a5"; return h.tipo==="Oportunidad"?"#12a594":(h.tipo==="Observación"?"#64748b":"#e5484d"); }
  function emoTop(e){ return 8+(4-(e!=null?e:2))/4*50; }
  const m=D.brand, on=D.report.online||{};
  const V={section:"inicio",hzOpen:null,flowOpen:null,nodeOpen:null,flowHzOpen:null,jrOpen:null};
  function brandMark(){ return m.headerImg?'<img src="'+m.headerImg+'" alt="" style="max-height:30px;max-width:150px;object-fit:contain">':'<span class="cr-word">'+esc(m.wordmark)+'</span>'; }
  function crHref(u){u=String(u||"");return /^https?:\/\//i.test(u)?u:("https://"+u);}
  function sections(){
    const list=[{id:"inicio",label:"Inicio",icon:crIco("home")}];
    if(on.hallazgos!==false)list.push({id:"hallazgos",label:"Hallazgos",icon:crIco("flag"),count:D.hallazgos.length});
    if(on.flujos!==false&&D.flows.length)list.push({id:"flujos",label:"Flujos",icon:crIco("flow"),count:D.flows.length});
    if(on.journeys!==false&&D.journeys.length)list.push({id:"journeys",label:"User Journeys",icon:crIco("chart"),count:D.journeys.length});
    if(on.protopersonas!==false&&D.report.protopersonas.length)list.push({id:"protopersonas",label:"Protopersonas",icon:crIco("user"),count:D.report.protopersonas.length});
    if(on.diagnostico!==false&&(D.report.diagIntro||D.report.hallazgosClave.length||D.report.recomendaciones.length))list.push({id:"diagnostico",label:"Diagnóstico",icon:crIco("report")});
    if(on.propuestas!==false&&D.report.propuestas.length)list.push({id:"propuestas",label:"Trabajemos juntos",icon:crIco("spark")});
    if(on.contacto!==false)list.push({id:"contacto",label:"Contacto",icon:crIco("mail")});
    return list;
  }
  function shell(){
    const secs=sections(); if(!secs.find(s=>s.id===V.section))V.section="inicio";
    root.innerHTML='<div class="cr-app"><header class="cr-top"><div class="cr-brand">'+brandMark()+'</div><div class="cr-study"><div class="cr-cli">'+esc(D.est.cliente||"Diagnóstico UX")+'</div><div class="cr-name">'+esc(D.est.nombre)+'</div></div></header><div class="cr-body"><nav class="cr-nav">'+secs.map(s=>'<button data-s="'+s.id+'" class="'+(V.section===s.id?"on":"")+'">'+s.icon+" "+s.label+(s.count!=null?'<span class="cr-cnt">'+s.count+"</span>":"")+"</button>").join("")+'</nav><main class="cr-main" id="crMain"></main></div></div>';
    root.querySelectorAll(".cr-nav button").forEach(b=>b.onclick=()=>{V.section=b.dataset.s;V.hzOpen=V.flowOpen=V.nodeOpen=V.flowHzOpen=V.jrOpen=null;shell();});
    render(document.getElementById("crMain"));
  }
  function render(main){
    ({inicio:secInicio,hallazgos:secHz,flujos:secFlujos,journeys:secJourneys,protopersonas:secProto,diagnostico:secDiag,propuestas:secProp,contacto:secContacto}[V.section]||secInicio)(main);
    const r=D.report, f=document.createElement("div"); f.className="cr-foot";
    f.innerHTML=((r.muestra&&r.muestra.on&&r.muestra.texto&&V.section!=="inicio")?'<div class="cr-foot-note">'+esc(r.muestra.texto)+"</div>":"")+"<div>"+esc(m.wordmark)+(m.sitio?" · "+esc(m.sitio):"")+"</div>";
    main.appendChild(f); root.scrollTop=0;
  }
  function chip(h){ const sev=(h.severidad!=null&&h.severidad!=="")?SEV[h.severidad]:null; return '<span class="type-chip type-'+esc(h.tipo)+'">'+esc(h.tipo)+'</span>'+(sev?'<span class="sev-chip" style="background:'+RSEV[h.severidad]+'">Sev '+h.severidad+' · '+esc(sev.l)+'</span>':''); }
  // ---- Lightbox ----
  function lb(urls,i){ i=i||0; let el=document.getElementById("shLB"); if(!el){el=document.createElement("div");el.id="shLB";el.className="lb-bg";document.body.appendChild(el);}
    const draw=()=>{ el.innerHTML='<button class="lb-close">'+xIco+'</button><img src="'+urls[i]+'" alt=""><div class="lb-bar"><button '+(urls.length<2?'style="visibility:hidden"':'')+' data-d="-1">&#8249;</button><span class="cnt">'+(i+1)+' / '+urls.length+'</span><button '+(urls.length<2?'style="visibility:hidden"':'')+' data-d="1">&#8250;</button></div>';
      el.querySelector(".lb-close").onclick=()=>el.remove(); el.onclick=e=>{if(e.target===el)el.remove();};
      el.querySelectorAll(".lb-bar button").forEach(b=>b.onclick=()=>{i=(i+ +b.dataset.d+urls.length)%urls.length;draw();}); };
    draw();
  }
  // ---- Secciones ----
  function secInicio(main){
    const r=D.report, mt=D.metrics, tiles=[["Hallazgos",mt.total],["Problemas",mt.problemas],["Oportunidades",mt.oportunidades],["Severidad alta",mt.sevAlta]];
    main.innerHTML=((r.muestra&&r.muestra.on&&r.muestra.texto)?'<div class="cr-teaser">'+crIco("spark")+'<span>'+esc(r.muestra.texto)+'</span></div>':'')
      +'<div class="cr-hero"><h1>'+esc(D.est.nombre)+'</h1>'+(D.est.cliente?'<div class="cr-sub">'+esc(D.est.cliente)+'</div>':'')+'<div class="cr-meta">'+[D.est.plataforma,D.est.fecha].filter(Boolean).map(v=>'<span>'+esc(v)+'</span>').join("")+'</div></div>'
      +(r.resumen?'<div class="cr-prose">'+para(r.resumen)+'</div>':'')
      +'<div class="cr-tiles">'+tiles.map(t=>'<div class="cr-tile"><b>'+t[1]+'</b><span>'+t[0]+'</span></div>').join("")+'</div>'
      +(r.objetivos?'<h3>Objetivos</h3><div class="cr-prose">'+bullets(r.objetivos)+'</div>':'')
      +(r.alcance?'<h3>Alcance</h3><div class="cr-prose">'+bullets(r.alcance)+'</div>':'');
  }
  function hzRow(h){ const sev=(h.severidad!=null&&h.severidad!=="")?SEV[h.severidad]:null; const heur=(h.heur||[]).join(", ");
    return '<button class="cr-row" data-hz="'+h.id+'"><span class="cr-row-sev" style="background:'+(sev?RSEV[h.severidad]:"var(--line-strong)")+'">'+(sev?h.severidad:"·")+'</span><span class="cr-row-main"><span class="cr-row-t">'+esc(h.titulo)+'</span>'+(heur?'<span class="cr-row-sub">'+esc(heur)+'</span>':'')+'</span>'+chevR+'</button>'; }
  function secHz(main){ if(V.hzOpen)return hzDetail(main,V.hzOpen);
    main.innerHTML='<h2>Hallazgos</h2><div class="cr-rows">'+(D.hallazgos.length?D.hallazgos.map(hzRow).join(""):'<div class="cr-empty">Sin hallazgos.</div>')+'</div>';
    main.querySelectorAll("[data-hz]").forEach(b=>b.onclick=()=>{V.hzOpen=b.dataset.hz;shell();});
  }
  function hzDetail(main,id,opts){ opts=opts||{}; const h=hzById[id]; if(!h){V.hzOpen=null;return secHz(main);}
    main.innerHTML='<button class="cr-back" data-back="1">'+chevL+' '+esc(opts.backLabel||"Hallazgos")+'</button>'
      +'<div class="cr-detail-head">'+chip(h)+(h.pantalla?'<span class="pantalla">'+esc(h.pantalla)+'</span>':'')+'</div>'
      +'<h2 style="margin-top:6px">'+esc(h.titulo)+'</h2>'
      +(h.descripcion?'<div class="cr-field"><b>Descripción</b><p>'+esc(h.descripcion)+'</p></div>':'')
      +(h.recomendacion?'<div class="cr-field"><b>Recomendación</b><p>'+esc(h.recomendacion)+'</p></div>':'')
      +(((h.heur||[]).length||(h.sesgos||[]).length)?'<div class="rels" style="margin:12px 0">'+(h.heur||[]).map(x=>'<span class="rel-chip h">'+esc(x)+'</span>').join("")+(h.sesgos||[]).map(x=>'<span class="rel-chip s">'+esc(x)+'</span>').join("")+'</div>':'')
      +((h.tags&&h.tags.length)?'<div class="rels" style="margin-bottom:12px">'+h.tags.map(t=>'<span class="tag-chip">'+esc(t)+'</span>').join("")+'</div>':'')
      +'<div class="cr-figs">'+((h.imgs||[]).map((im,ix)=>'<figure class="cr-fig"><img data-img="'+ix+'" src="'+im.url+'" alt="" style="cursor:zoom-in">'+((im.pins&&im.pins.length)?'<ol class="cr-pins">'+im.pins.map(p=>'<li><span class="cr-pinn" style="background:'+(p.color||"#e2483d")+'">'+p.n+'</span><span>'+esc(p.comment||"")+'</span></li>').join("")+'</ol>':'')+'</figure>').join(""))+'</div>';
    main.querySelector("[data-back]").onclick=opts.back||(()=>{V.hzOpen=null;shell();});
    const urls=(h.imgs||[]).map(im=>im.url);
    main.querySelectorAll("[data-img]").forEach(im=>im.onclick=()=>lb(urls,+im.dataset.img));
  }
  function secFlujos(main){
    if(V.flowHzOpen)return hzDetail(main,V.flowHzOpen,{backLabel:"Interacción",back:()=>{V.flowHzOpen=null;shell();}});
    if(V.flowOpen&&V.nodeOpen)return nodeDetail(main);
    if(V.flowOpen)return flowDiagram(main);
    main.innerHTML='<h2>Flujos de usuario</h2><p class="cr-lead">Elegí un flujo para ver su diagrama de interacciones.</p><div class="cr-cards">'+(D.flows.length?D.flows.map(f=>{const hz=(f.nodes||[]).reduce((s,n)=>s+((n.markers||[]).length),0);return '<button class="cr-card2" data-flow="'+f.id+'"><div class="cr-card2-h"><h3>'+esc(f.nombre)+'</h3>'+chevR+'</div>'+(f.descripcion?'<p>'+esc(f.descripcion)+'</p>':'')+'<div class="cr-card2-meta">'+f.nodes.length+' interacciones · '+f.edges.length+' conexiones · '+hz+' hallazgos</div></button>';}).join(""):'<div class="cr-empty">Sin flujos.</div>')+'</div>';
    main.querySelectorAll("[data-flow]").forEach(b=>b.onclick=()=>{V.flowOpen=b.dataset.flow;V.nodeOpen=null;shell();});
  }
  function flowDiagram(main){
    const flow=D.flows.find(f=>f.id===V.flowOpen); if(!flow){V.flowOpen=null;return secFlujos(main);}
    main.innerHTML='<button class="cr-back" data-back="1">'+chevL+' Flujos</button><h2>'+esc(flow.nombre)+'</h2>'+(flow.descripcion?'<p class="cr-lead">'+esc(flow.descripcion)+'</p>':'')
      +'<div class="fl-legend" style="margin-bottom:10px"><span><i class="lg happy"></i>Happy path</span><span><i class="lg desvio"></i>Desvío</span></div>'
      +'<div class="cr-diagram"><div class="cr-canvas" id="shCanvas"><svg class="flow-edges" id="shEdges"><defs><marker id="shh" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="var(--accent)"/></marker><marker id="shd" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="var(--sev3)"/></marker></defs></svg></div></div><p class="cr-hint">Tocá una interacción para ver su detalle.</p>';
    main.querySelector("[data-back]").onclick=()=>{V.flowOpen=null;shell();};
    const canvas=main.querySelector("#shCanvas"), svg=main.querySelector("#shEdges"), els={};
    flow.nodes.forEach((n,i)=>{ const el=document.createElement("button"); el.className="cr-fnode"; el.dataset.node=n.id; el.style.left=(n.x||0)+"px"; el.style.top=(n.y||0)+"px"; const hzc=(n.markers||[]).length;
      el.innerHTML='<div class="cr-fnode-h"><span class="fnode-n">'+(i+1)+'</span><span class="fnode-t">'+esc(n.titulo||"Interacción")+'</span></div>'+(n.thumb?'<div class="cr-fnode-img"><img src="'+n.thumb+'" alt=""></div>':'<div class="fnode-noimg">'+camIco+' sin imagen</div>')+'<div class="cr-fnode-foot">'+flagIco+' '+hzc+' '+(hzc===1?'hallazgo':'hallazgos')+'</div>';
      canvas.appendChild(el); els[n.id]=el; });
    requestAnimationFrame(()=>{ let mx=0,my=0; flow.nodes.forEach(n=>{const el=els[n.id];if(el){mx=Math.max(mx,(n.x||0)+el.offsetWidth);my=Math.max(my,(n.y||0)+el.offsetHeight);}});
      canvas.style.width=(mx+60)+"px";canvas.style.height=(my+60)+"px";svg.setAttribute("width",mx+60);svg.setAttribute("height",my+60);
      const A=n=>{const el=els[n.id];const w=el?el.offsetWidth:212,h=el?el.offsetHeight:80;return{sx:(n.x||0)+w,sy:(n.y||0)+h/2,tx:(n.x||0),ty:(n.y||0)+h/2};};
      const map={};flow.nodes.forEach(n=>map[n.id]=n);
      const paths=flow.edges.map(e=>{const a=map[e.from],b=map[e.to];if(!a||!b)return"";const p=A(a),q=A(b),dx=Math.max(46,Math.abs(q.tx-p.sx)/2),d="M "+p.sx+" "+p.sy+" C "+(p.sx+dx)+" "+p.sy+", "+(q.tx-dx)+" "+q.ty+", "+q.tx+" "+q.ty,col=e.tipo==="desvio"?"var(--sev3)":"var(--accent)";
        return '<path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="2" '+(e.tipo==="desvio"?'stroke-dasharray="6 5"':'')+' marker-end="url(#'+(e.tipo==="desvio"?"shd":"shh")+')"/>'+(e.label?'<text class="edge-label" x="'+((p.sx+q.tx)/2)+'" y="'+((p.sy+q.ty)/2-8)+'" text-anchor="middle">'+esc(e.label)+'</text>':'');}).join("");
      svg.innerHTML=svg.querySelector("defs").outerHTML+paths; });
    canvas.querySelectorAll(".cr-fnode").forEach(el=>el.onclick=()=>{V.nodeOpen=el.dataset.node;shell();});
  }
  function nodeDetail(main){
    const flow=D.flows.find(f=>f.id===V.flowOpen), node=flow?flow.nodes.find(n=>n.id===V.nodeOpen):null; if(!node){V.nodeOpen=null;return flowDiagram(main);}
    const ms=(node.markers||[]).map(mk=>({mk,hz:hzById[mk.hallazgoId]})).filter(o=>o.hz);
    main.innerHTML='<button class="cr-back" data-back="1">'+chevL+' '+esc(flow.nombre)+'</button>'
      +'<div class="cr-detail-head"><span class="fnode-n" style="position:static">'+(flow.nodes.findIndex(n=>n.id===node.id)+1)+'</span><h2 style="margin:0">'+esc(node.titulo||"Interacción")+'</h2></div>'
      +((node.ve||node.hace)?'<div class="cr-field" style="margin-top:10px">'+(node.ve?'<p><b>Ve:</b> '+esc(node.ve)+'</p>':'')+(node.hace?'<p><b>Hace:</b> '+esc(node.hace)+'</p>':'')+'</div>':'')
      +'<div class="cr-nd-img">'+(node.full?'<div class="cr-shot"><img src="'+node.full+'" alt="" data-full="1" style="cursor:zoom-in">'+ms.map((o,i)=>'<span class="rpt-pin" style="left:'+(o.mk.x*100)+'%;top:'+(o.mk.y*100)+'%;background:'+pinColor(o.hz)+'">'+(i+1)+'</span>').join("")+'</div>':'<div class="cr-empty">Sin imagen.</div>')+'</div>'
      +'<h3>Hallazgos de esta interacción</h3><div class="cr-rows">'+(ms.length?ms.map((o,i)=>'<button class="cr-row" data-hz="'+o.hz.id+'"><span class="cr-row-sev" style="background:'+pinColor(o.hz)+'">'+(i+1)+'</span><span class="cr-row-main"><span class="cr-row-t">'+esc(o.hz.titulo)+'</span>'+((o.hz.heur||[]).length?'<span class="cr-row-sub">'+esc((o.hz.heur||[]).join(", "))+'</span>':'')+'</span>'+chevR+'</button>').join(""):'<div class="cr-empty">Sin hallazgos marcados.</div>')+'</div>';
    main.querySelector("[data-back]").onclick=()=>{V.nodeOpen=null;shell();};
    const fu=main.querySelector("[data-full]"); if(fu&&node.full)fu.onclick=()=>lb([node.full],0);
    main.querySelectorAll("[data-hz]").forEach(b=>b.onclick=()=>{V.flowHzOpen=b.dataset.hz;shell();});
  }
  function secJourneys(main){ if(V.jrOpen)return jrDetail(main);
    main.innerHTML='<h2>User Journeys</h2><p class="cr-lead">Elegí un journey para ver el mapa completo.</p><div class="cr-cards">'+(D.journeys.length?D.journeys.map(j=>'<button class="cr-card2" data-jr="'+j.id+'"><div class="cr-card2-h"><h3>'+esc(j.nombre)+'</h3>'+chevR+'</div>'+(j.descripcion?'<p>'+esc(j.descripcion)+'</p>':'')+'<div class="cr-card2-meta">'+(j.etapas||[]).length+' etapas · '+(j.pasos||[]).length+' pasos</div></button>').join(""):'<div class="cr-empty">Sin journeys.</div>')+'</div>';
    main.querySelectorAll("[data-jr]").forEach(b=>b.onclick=()=>{V.jrOpen=b.dataset.jr;shell();});
  }
  function jrDetail(main){ const j=D.journeys.find(x=>x.id===V.jrOpen); if(!j){V.jrOpen=null;return secJourneys(main);}
    main.innerHTML='<button class="cr-back" data-back="1">'+chevL+' User Journeys</button>'+jrMatrix(j);
    main.querySelector("[data-back]").onclick=()=>{V.jrOpen=null;shell();};
  }
  function jrMatrix(j){ const car=j.carriles||{}, pasos=j.pasos||[], n=pasos.length;
    if(!n)return '<div class="cr-flow"><div class="cr-flow-h"><h3>'+esc(j.nombre)+'</h3></div><div class="cr-empty">Sin pasos.</div></div>';
    let bands=[],st=0; for(let i=1;i<=n;i++){if(i===n||pasos[i].etapaId!==pasos[st].etapaId){bands.push({etapaId:pasos[st].etapaId,len:i-st});st=i;}}
    const bandRow=bands.map(b=>{const et=(j.etapas||[]).find(e=>e.id===b.etapaId);const w=b.len*JW-8;return et?'<div class="jr-band" style="width:'+w+'px;background:'+(et.color||"#555")+'">'+esc(et.nombre)+'</div>':'<div class="jr-band empty" style="width:'+w+'px">sin etapa</div>';}).join("");
    const heads=pasos.map((p,i)=>'<div class="jr-cell"><div class="jr-pnum">'+(i+1)+'</div><div class="jr-pname">'+esc(p.nombre||"Paso")+'</div></div>').join("");
    const lbl=id=>{const k=CARR.find(x=>x.id===id);return k.label;};
    const pills=(arr,cloud)=>'<div class="jr-pills '+(cloud?"cloud":"")+'">'+((arr||[]).map(t=>'<span class="jr-pill '+(cloud?"cloud":"")+'">'+esc(t)+'</span>').join("")||'<span class="cr-dash">—</span>')+'</div>';
    let rows="";
    if(car.touchpoint!==false)rows+='<div class="jr-row"><div class="jr-lbl">'+lbl("touchpoint")+'</div><div class="jr-cells">'+pasos.map(p=>'<div class="jr-cell">'+pills(p.tpPills)+(p.touchpoint?'<div class="cr-tp-desc">'+esc(p.touchpoint)+'</div>':'')+'</div>').join("")+'</div></div>';
    if(car.emocion!==false){const emo=pasos.map(p=>{const e=(p.emocion!=null?p.emocion:2);return '<div class="jr-emo-cell"><span class="jr-emo-btn" style="top:'+emoTop(e)+'px;cursor:default">'+EMO[e].e+'</span></div>';}).join("");const pts=pasos.map((p,i)=>[i*JW+JW/2,emoTop(p.emocion)+22]);rows+='<div class="jr-row jr-emo"><div class="jr-lbl">'+lbl("emocion")+'</div><div class="jr-cells jr-emo-cells"><svg width="'+(n*JW)+'" height="110"><polyline points="'+pts.map(p=>p.join(",")).join(" ")+'" fill="none" stroke="var(--accent)" stroke-width="2"/>'+pts.map(p=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3" fill="var(--accent)"/>').join("")+'</svg>'+emo+'</div></div>';}
    if(car.acciones!==false)rows+='<div class="jr-row"><div class="jr-lbl">'+lbl("acciones")+'</div><div class="jr-cells">'+pasos.map(p=>'<div class="jr-cell">'+pills(p.acciones)+'</div>').join("")+'</div></div>';
    if(car.expectativas!==false)rows+='<div class="jr-row exp"><div class="jr-lbl">'+lbl("expectativas")+'</div><div class="jr-cells">'+pasos.map(p=>'<div class="jr-cell">'+pills(p.expectativas,true)+'</div>').join("")+'</div></div>';
    if(car.pain!==false)rows+='<div class="jr-row pain"><div class="jr-lbl">'+lbl("pain")+'</div><div class="jr-cells">'+pasos.map(p=>'<div class="jr-cell">'+pills(p.pain)+'</div>').join("")+'</div></div>';
    if(car.oportunidades!==false)rows+='<div class="jr-row"><div class="jr-lbl">'+lbl("oportunidades")+'</div><div class="jr-cells">'+pasos.map(p=>'<div class="jr-cell">'+pills(p.oportunidades)+'</div>').join("")+'</div></div>';
    return '<div class="cr-flow"><div class="cr-flow-h"><h3>'+esc(j.nombre)+'</h3>'+(j.descripcion?'<p>'+esc(j.descripcion)+'</p>':'')+'</div><div class="jr-scroll"><div class="jr-matrix"><div class="jr-row jr-etapas"><div class="jr-lbl">Etapas</div><div class="jr-cells">'+bandRow+'</div></div><div class="jr-row jr-head"><div class="jr-lbl">Pasos</div><div class="jr-cells">'+heads+'</div></div>'+rows+'</div></div></div>';
  }
  function secProto(main){ main.innerHTML='<h2>Protopersonas</h2><div class="cr-personas">'+D.report.protopersonas.map(p=>'<div class="cr-persona"><div class="pp-head">'+(p.foto?'<img src="'+p.foto+'">':'<div class="pp-ph"></div>')+'<div><div class="pp-name">'+esc(p.nombre)+(p.edad?", "+esc(p.edad):"")+'</div><div class="pp-title">'+esc(p.titulo||"")+'</div>'+(p.ubicacion?'<div class="pp-meta">Ubicación: '+esc(p.ubicacion)+'</div>':'')+(p.ocupacion?'<div class="pp-meta">Ocupación: '+esc(p.ocupacion)+'</div>':'')+'</div></div>'+(p.bio?'<div class="pp-sec"><b>Bio</b><p>'+esc(p.bio)+'</p></div>':'')+((p.necesidades&&p.necesidades.length)?'<div class="pp-sec"><b>Necesidades</b><ul>'+p.necesidades.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul></div>':'')+((p.objetivos&&p.objetivos.length)?'<div class="pp-sec"><b>Objetivos</b><ul>'+p.objetivos.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul></div>':'')+((p.dolores&&p.dolores.length)?'<div class="pp-sec"><b>Dolores</b><ul>'+p.dolores.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul></div>':'')+'</div>').join("")+'</div>'; }
  function secDiag(main){ const r=D.report; main.innerHTML='<h2>Diagnóstico estratégico</h2>'+(r.diagIntro?'<div class="cr-prose">'+para(r.diagIntro)+'</div>':'')+(r.hallazgosClave.length?'<h3>Hallazgos clave</h3>'+r.hallazgosClave.map(b=>'<div class="cr-block"><h4>'+esc(b.titulo)+'</h4><div class="cr-prose">'+para(b.texto)+'</div></div>').join(""):'')+(r.recomendaciones.length?'<h3>Recomendaciones prioritarias</h3>'+r.recomendaciones.map(b=>'<div class="cr-block"><h4>'+esc(b.titulo)+'</h4><div class="cr-prose">'+para(b.texto)+((b.bullets&&b.bullets.length)?'<ul>'+b.bullets.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>':'')+'</div>'+(b.impacto?'<p class="cr-imp"><b>Impacto esperado:</b> '+esc(b.impacto)+'</p>':'')+'</div>').join(""):''); }
  function contactoCard(){ const svc=(m.servicioNombre||m.servicioDesc)?'<div class="cr-svc"><div class="cr-svc-badge">'+esc(m.servicioNombre||"Servicio")+'</div>'+(m.servicioDesc?'<p>'+esc(m.servicioDesc)+'</p>':'')+(m.servicioUrl?'<a class="cr-svc-link" href="'+crHref(m.servicioUrl)+'" target="_blank" rel="noopener">Conocer más</a>':'')+'</div>':'';
    return '<div class="cr-contact"><div class="cr-contact-main"><div class="cr-word">'+esc(m.wordmark)+'</div><div class="cr-contact-name">'+esc(m.nombre)+'</div><div class="cr-contact-rol">'+esc(m.rol)+'</div><div class="cr-contact-lines">'+(m.sitio?'<a href="'+crHref(m.sitio)+'" target="_blank" rel="noopener">'+esc(m.sitio)+'</a>':'')+(m.email?'<a href="mailto:'+esc(m.email)+'">'+esc(m.email)+'</a>':'')+(m.tel?'<span>'+esc(m.tel)+'</span>':'')+'</div></div>'+svc+'</div>'; }
  function secProp(main){ main.innerHTML='<h2>Trabajemos juntos</h2><p class="cr-lead">Formas de seguir avanzando sobre este diagnóstico.</p><div class="cr-props">'+D.report.propuestas.map(propCard).join("")+'</div>'+contactoCard(); }
  function secContacto(main){ main.innerHTML='<h2>Contacto</h2>'+contactoCard(); }
  document.documentElement.setAttribute("data-theme","light");
  shell();
}
