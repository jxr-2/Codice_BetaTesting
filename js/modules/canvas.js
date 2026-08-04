/* modules/canvas.js — Lienzo de relaciones. */
/* ========================= CANVAS ========================= */
async function initCanvas(){
  canvasLoaded = true;
  const data = await storeGet('canvas-data');
  if(data) canvasData = data;
  applyCanvasTransform(); renderCanvasNodes(); renderCanvasEdges();
}
function applyCanvasTransform(){
  document.getElementById('canvasInner').style.transform = `translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${canvasZoom})`;
}
async function saveCanvas(){ await storeSet('canvas-data', canvasData); markDirty(); }
function renderCanvasNodes(){
  const inner = document.getElementById('canvasInner');
  inner.querySelectorAll('.canvas-node').forEach(n=>n.remove());
  canvasData.nodes.forEach(node => inner.appendChild(buildNodeEl(node)));
}
function buildNodeEl(node){
  const el = document.createElement('div');
  el.className = 'canvas-node'; el.style.left = node.x+'px'; el.style.top = node.y+'px'; el.dataset.id = node.id;
  if(node.kind === 'entry'){
    const entry = entriesIndex.find(e=>e.id===node.entryId);
    const t = TYPES[(entry&&entry.type)||'personaje'];
    el.style.setProperty('--type-color', t.color);
    el.innerHTML = `<span class="node-del" data-del="${node.id}">✕</span>
      ${entry && entry.coverThumb ? `<div class="node-thumb" style="background-image:url('${entry.coverThumb}')"></div>` : ''}
      <div class="node-type">${t.glyph} ${t.label}</div>
      <div class="node-title">${escapeHtml(entry ? entry.name : 'Ficha eliminada')}</div>`;
    el.addEventListener('dblclick', (e)=>{ e.stopPropagation(); if(entry) openFichaEditor(entry.id); });
  } else {
    el.innerHTML = `<span class="node-del" data-del="${node.id}">✕</span>`;
    const ta = document.createElement('textarea');
    ta.placeholder = 'Nota libre…'; ta.value = node.text || '';
    ta.addEventListener('mousedown', ev => ev.stopPropagation());
    ta.addEventListener('input', ()=>{ node.text = ta.value; saveCanvas(); });
    el.appendChild(ta);
  }
  el.querySelector('.node-del').addEventListener('click', (e)=>{
    e.stopPropagation();
    canvasData.nodes = canvasData.nodes.filter(n=>n.id!==node.id);
    canvasData.edges = canvasData.edges.filter(ed=>ed.from!==node.id && ed.to!==node.id);
    saveCanvas(); renderCanvasNodes(); renderCanvasEdges();
  });
  el.addEventListener('mousedown', (e)=>{
    if(e.target.closest('.node-del') || e.target.tagName==='TEXTAREA') return;
    if(connectMode){ e.stopPropagation(); handleConnectClick(node.id, el); return; }
    e.stopPropagation();
    draggingNode = { id: node.id, startX: e.clientX, startY: e.clientY, origX: node.x, origY: node.y };
  });
  return el;
}
function handleConnectClick(nodeId, el){
  if(!connectSrc){ connectSrc = nodeId; el.classList.add('connecting-src'); }
  else if(connectSrc !== nodeId){
    canvasData.edges.push({ id: uid(), from: connectSrc, to: nodeId, label: '' });
    saveCanvas(); renderCanvasEdges();
    document.querySelectorAll('.canvas-node').forEach(n=>n.classList.remove('connecting-src'));
    connectSrc = null;
  } else {
    document.querySelectorAll('.canvas-node').forEach(n=>n.classList.remove('connecting-src'));
    connectSrc = null;
  }
}
function renderCanvasEdges(){
  const svg = document.getElementById('canvasEdges'); svg.innerHTML = '';
  canvasData.edges.forEach(edge=>{
    const a = canvasData.nodes.find(n=>n.id===edge.from), b = canvasData.nodes.find(n=>n.id===edge.to);
    if(!a || !b) return;
    const ax = a.x+85, ay = a.y+30, bx = b.x+85, by = b.y+30;
    const line = document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1', ax); line.setAttribute('y1', ay); line.setAttribute('x2', bx); line.setAttribute('y2', by);
    svg.appendChild(line);
    const mx = (ax+bx)/2, my = (ay+by)/2;
    if(edge.label){
      const text = document.createElementNS('http://www.w3.org/2000/svg','text');
      text.setAttribute('x', mx); text.setAttribute('y', my-8); text.setAttribute('text-anchor','middle'); text.textContent = edge.label;
      svg.appendChild(text);
    }
    const del = document.createElementNS('http://www.w3.org/2000/svg','circle');
    del.setAttribute('class','edge-del'); del.setAttribute('cx', mx); del.setAttribute('cy', my); del.setAttribute('r', 7);
    del.addEventListener('click', ()=>{
      openModal({
        title:'Editar conexión', fields:[{key:'label', label:'Etiqueta de la relación', value:edge.label, placeholder:'ej: aliado de, enemigo de'}],
        submitLabel:'Guardar', showDelete:true,
        onSubmit: async(v)=>{ edge.label=v.label; await saveCanvas(); renderCanvasEdges(); },
        onDelete: async()=>{ canvasData.edges = canvasData.edges.filter(e=>e.id!==edge.id); await saveCanvas(); renderCanvasEdges(); }
      });
    });
    svg.appendChild(del);
  });
}
document.getElementById('addNoteBtn').addEventListener('click', ()=>{
  canvasData.nodes.push({ id: uid(), kind:'note', text:'', x: 200 - canvasPan.x + 100, y: 150 - canvasPan.y + 60 });
  saveCanvas(); renderCanvasNodes(); renderCanvasEdges();
});
document.getElementById('addFichaNodeBtn').addEventListener('click', ()=>{
  if(entriesIndex.length===0){ openModal({title:'No hay fichas todavía', fields:[], submitLabel:'Cerrar'}); return; }
  openModal({
    title:'Elegí una ficha', fields:[{ key:'entryId', label:'Ficha', type:'select', options: entriesIndex.map(e=>({value:e.id,label:`${TYPES[e.type].glyph} ${e.name}`})) }],
    submitLabel:'Agregar al lienzo',
    onSubmit: async (v)=>{
      canvasData.nodes.push({ id: uid(), kind:'entry', entryId: v.entryId, x: 220 - canvasPan.x + 100, y: 180 - canvasPan.y + 60 });
      await saveCanvas(); renderCanvasNodes(); renderCanvasEdges();
    }
  });
});
document.getElementById('connectModeBtn').addEventListener('click', (e)=>{
  connectMode = !connectMode; connectSrc = null;
  e.target.classList.toggle('active', connectMode);
  document.getElementById('canvasHint').textContent = connectMode ? 'Click en dos fichas para conectarlas' : 'Arrastrá el fondo para mover el lienzo, o arrastrá los chips de la derecha';
  document.querySelectorAll('.canvas-node').forEach(n=>n.classList.remove('connecting-src'));
});
document.getElementById('zoomInBtn').addEventListener('click', ()=>{ canvasZoom = Math.min(2, canvasZoom+0.15); applyCanvasTransform(); });
document.getElementById('zoomOutBtn').addEventListener('click', ()=>{ canvasZoom = Math.max(0.4, canvasZoom-0.15); applyCanvasTransform(); });
const canvasViewport = document.getElementById('canvasViewport');
canvasViewport.addEventListener('mousedown', (e)=>{
  if(connectMode) return;
  if(e.target.closest('.canvas-node') || e.target.closest('.edge-del') || e.target.closest('.palette-chip')) return;
  e.preventDefault();
  canvasViewport.classList.add('panning');
  panningCanvas = { startX: e.clientX, startY: e.clientY, origX: canvasPan.x, origY: canvasPan.y };
});
window.addEventListener('mousemove', (e)=>{
  if(draggingNode){
    const node = canvasData.nodes.find(n=>n.id===draggingNode.id);
    if(node){
      node.x = draggingNode.origX + (e.clientX - draggingNode.startX)/canvasZoom;
      node.y = draggingNode.origY + (e.clientY - draggingNode.startY)/canvasZoom;
      const el = document.querySelector(`.canvas-node[data-id="${node.id}"]`);
      if(el){ el.style.left = node.x+'px'; el.style.top = node.y+'px'; }
      renderCanvasEdges();
    }
  } else if(panningCanvas && typeof panningCanvas === 'object'){
    canvasPan.x = panningCanvas.origX + (e.clientX - panningCanvas.startX);
    canvasPan.y = panningCanvas.origY + (e.clientY - panningCanvas.startY);
    applyCanvasTransform();
  }
});
window.addEventListener('mouseup', ()=>{
  if(draggingNode) saveCanvas();
  draggingNode = null; panningCanvas = false; canvasViewport.classList.remove('panning');
});
canvasViewport.addEventListener('wheel', (e)=>{
  e.preventDefault();
  canvasZoom = Math.max(0.4, Math.min(2, canvasZoom + (e.deltaY < 0 ? 0.08 : -0.08)));
  applyCanvasTransform();
}, { passive:false });
document.querySelectorAll('.palette-chip').forEach(chip=>{
  chip.addEventListener('dragstart', (e)=>{ e.dataTransfer.setData('text/kind', chip.dataset.kind); });
});
canvasViewport.addEventListener('dragover', (e)=> e.preventDefault());
canvasViewport.addEventListener('drop', async (e)=>{
  e.preventDefault();
  const kind = e.dataTransfer.getData('text/kind');
  if(!kind) return;
  const rect = canvasViewport.getBoundingClientRect();
  const x = (e.clientX - rect.left - canvasPan.x)/canvasZoom;
  const y = (e.clientY - rect.top - canvasPan.y)/canvasZoom;
  if(kind === 'note'){
    canvasData.nodes.push({ id: uid(), kind:'note', text:'', x, y });
    await saveCanvas(); renderCanvasNodes(); renderCanvasEdges();
  } else if(kind === 'entry'){
    if(entriesIndex.length===0) return;
    openModal({
      title:'Elegí una ficha', fields:[{ key:'entryId', label:'Ficha', type:'select', options: entriesIndex.map(en=>({value:en.id,label:`${TYPES[en.type].glyph} ${en.name}`})) }],
      submitLabel:'Agregar',
      onSubmit: async (v)=>{ canvasData.nodes.push({ id: uid(), kind:'entry', entryId: v.entryId, x, y }); await saveCanvas(); renderCanvasNodes(); renderCanvasEdges(); }
    });
  }
});

