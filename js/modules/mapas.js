/* modules/mapas.js — Mapas, pines y regiones. */
/* ========================= MAPAS ========================= */
async function initMapas(){
  mapsLoaded = true;
  const idx = await storeGet('maps-index');
  mapsIndex = idx || [];
  renderMapList();
}
function renderMapList(){
  const el = document.getElementById('mapList');
  el.innerHTML = mapsIndex.map(m => `<div class="rail-item ${currentMap && currentMap.id===m.id ? 'active':''}" data-map="${m.id}"><span>🗺 ${escapeHtml(m.name)}</span></div>`).join('');
  el.querySelectorAll('.rail-item').forEach(item=> item.addEventListener('click', ()=> loadMap(item.dataset.map)));
}
document.getElementById('newMapBtn').addEventListener('click', ()=> document.getElementById('mapFileInput').click());
document.getElementById('mapFileInput').addEventListener('change', async (e)=>{
  const file = e.target.files[0]; if(!file) return;
  const dataUrl = await resizeImageFile(file, 1600, 0.78);
  e.target.value = '';
  openModal({
    title:'Nombre del mapa', fields:[{ key:'name', label:'Nombre', placeholder:'ej: Continente Occidental' }], submitLabel:'Crear mapa',
    onSubmit: async (v)=>{
      const id = uid(); const name = v.name.trim() || 'Mapa sin nombre';
      mapsIndex.push({ id, name });
      await storeSet('maps-index', mapsIndex);
      await storeSet('map:'+id, { id, name, image: dataUrl, pins: [], regions: [] });
      markDirty(); renderMapList(); loadMap(id); renderHomeDashboard();
    }
  });
});
async function loadMap(id){
  const data = await storeGet('map:'+id);
  if(!data) return;
  currentMap = data;
  worldMeta.lastMapId = id;
  await storeSet('world-meta', worldMeta);
  renderMapList();
  document.getElementById('mapEmpty').style.display = 'none';
  document.getElementById('mapWorkspace').style.display = 'flex';
  const img = document.getElementById('mapImage');
  img.style.opacity = '0'; img.src = currentMap.image;
  const renderAll = () => { img.style.opacity = '1'; renderPins(); renderRegions(); };
  if(img.complete && img.naturalWidth !== 0){ renderAll(); } else { img.onload = renderAll; }
}
window.addEventListener('resize', ()=>{ if(currentMap) renderRegions(); });
async function saveCurrentMap(){ if(currentMap){ await storeSet('map:'+currentMap.id, currentMap); markDirty(); renderHomeDashboard(); } }
document.getElementById('mapRenameBtn').addEventListener('click', ()=>{
  if(!currentMap) return;
  openModal({
    title:'Renombrar mapa', fields:[{ key:'name', label:'Nombre', value: currentMap.name }], submitLabel:'Guardar',
    onSubmit: async (v)=>{
      currentMap.name = v.name.trim() || currentMap.name;
      const idxEntry = mapsIndex.find(m=>m.id===currentMap.id);
      if(idxEntry) idxEntry.name = currentMap.name;
      await storeSet('maps-index', mapsIndex); await saveCurrentMap(); renderMapList();
    }
  });
});
document.getElementById('mapDeleteBtn').addEventListener('click', ()=>{
  if(!currentMap) return;
  openConfirm({
    title:'Eliminar mapa', message:'Se borrarán también todos sus pines y regiones.',
    onConfirm: async ()=>{
      const deletedId = currentMap.id;
      await storeDelete('map:'+deletedId);
      mapsIndex = mapsIndex.filter(m=>m.id!==deletedId);
      await storeSet('maps-index', mapsIndex);
      if(worldMeta.lastMapId === deletedId){ worldMeta.lastMapId = null; await storeSet('world-meta', worldMeta); }
      markDirty(); currentMap = null;
      document.getElementById('mapEmpty').style.display = 'block';
      document.getElementById('mapWorkspace').style.display = 'none';
      renderMapList(); renderHomeDashboard();
    }
  });
});
document.getElementById('pinModeBtn').addEventListener('click', ()=> setMapMode('pin'));
document.getElementById('regionModeBtn').addEventListener('click', ()=> setMapMode('region'));
function setMapMode(mode){
  mapMode = mode; regionDraft = [];
  document.getElementById('pinModeBtn').classList.toggle('active', mode==='pin');
  document.getElementById('regionModeBtn').classList.toggle('active', mode==='region');
  document.getElementById('finishRegionBtn').style.display = mode==='region' ? 'inline-block' : 'none';
  document.getElementById('mapHint').textContent = mode==='pin' ? 'Click sobre el mapa para agregar un pin' : 'Click para marcar los vértices de una región, luego "Cerrar región"';
  renderRegions();
}
document.getElementById('mapImageWrap').addEventListener('click', (e)=>{
  if(!currentMap) return;
  if(e.target.closest('.map-pin')) return;
  const img = document.getElementById('mapImage');
  const rect = img.getBoundingClientRect();
  const px = ((e.clientX - rect.left) / rect.width) * 100;
  const py = ((e.clientY - rect.top) / rect.height) * 100;
  if(px<0||px>100||py<0||py>100) return;
  if(mapMode === 'pin'){
    openModal({
      title:'Nuevo pin', fields:[
        { key:'title', label:'Título', placeholder:'ej: Puerto de las Sombras' },
        { key:'note', label:'Nota', type:'textarea', placeholder:'Detalles de este punto' },
        { key:'entryId', label:'Vincular a ficha (opcional)', type:'select', options:[{value:'',label:'— Ninguna —'}, ...entriesIndex.map(en=>({value:en.id,label:en.name}))] }
      ],
      submitLabel:'Crear pin',
      onSubmit: async (v)=>{
        currentMap.pins.push({ id: uid(), x:px, y:py, title:v.title||'Sin título', note:v.note||'', entryId:v.entryId||null });
        await saveCurrentMap(); renderPins();
      }
    });
  } else { regionDraft.push({ x:px, y:py }); renderRegions(); }
});
document.getElementById('finishRegionBtn').addEventListener('click', ()=>{
  if(regionDraft.length < 3){ regionDraft = []; renderRegions(); return; }
  openModal({
    title:'Nueva región', fields:[
      { key:'name', label:'Nombre de la región', placeholder:'ej: Bosque Encantado' },
      { key:'color', label:'Color', type:'color', value:'#8fc4b0' }
    ],
    submitLabel:'Crear región',
    onSubmit: async (v)=>{
      currentMap.regions.push({ id: uid(), name: v.name||'Región sin nombre', color: v.color||'#8fc4b0', points: regionDraft });
      regionDraft = []; await saveCurrentMap(); renderRegions();
    }
  });
});
function renderPins(){
  const layer = document.getElementById('mapPinsLayer'); layer.innerHTML = '';
  if(!currentMap) return;
  currentMap.pins.forEach(pin=>{
    const el = document.createElement('div');
    el.className = 'map-pin'; el.style.left = pin.x+'%'; el.style.top = pin.y+'%';
    el.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22"><path fill="#c9922f" stroke="#2b2018" stroke-width="1" d="M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8z"/><circle cx="12" cy="10" r="3" fill="#2b2018"/></svg>`;
    el.title = pin.title;
    el.addEventListener('click', (e)=>{
      e.stopPropagation();
      openModal({
        title: pin.title, fields:[{ key:'title', label:'Título', value:pin.title }, { key:'note', label:'Nota', type:'textarea', value:pin.note }],
        submitLabel:'Guardar', showDelete:true,
        onSubmit: async (v)=>{ pin.title=v.title; pin.note=v.note; await saveCurrentMap(); renderPins(); },
        onDelete: async ()=>{ currentMap.pins = currentMap.pins.filter(p=>p.id!==pin.id); await saveCurrentMap(); renderPins(); }
      });
    });
    layer.appendChild(el);
  });
}
function renderRegions(){
  const svg = document.getElementById('mapRegionsSvg');
  const img = document.getElementById('mapImage');
  if(!img) return;
  svg.innerHTML = '';
  document.querySelectorAll('.map-region-label').forEach(l=>l.remove());
  if(!currentMap) return;
  const w = img.clientWidth || 1, h = img.clientHeight || 1;
  currentMap.regions.forEach(region=>{
    const pts = region.points.map(p => `${p.x/100*w},${p.y/100*h}`).join(' ');
    const poly = document.createElementNS('http://www.w3.org/2000/svg','polygon');
    poly.setAttribute('points', pts); poly.setAttribute('fill', region.color + '55'); poly.setAttribute('stroke', region.color); poly.setAttribute('stroke-width', '2');
    poly.style.cursor = 'pointer';
    poly.addEventListener('click', (e)=>{
      e.stopPropagation();
      openModal({
        title: region.name, fields:[{ key:'name', label:'Nombre', value:region.name }, { key:'color', label:'Color', type:'color', value:region.color }],
        submitLabel:'Guardar', showDelete:true,
        onSubmit: async (v)=>{ region.name=v.name; region.color=v.color; await saveCurrentMap(); renderRegions(); },
        onDelete: async ()=>{ currentMap.regions = currentMap.regions.filter(r=>r.id!==region.id); await saveCurrentMap(); renderRegions(); }
      });
    });
    svg.appendChild(poly);
    const cx = region.points.reduce((s,p)=>s+p.x,0)/region.points.length;
    const cy = region.points.reduce((s,p)=>s+p.y,0)/region.points.length;
    const label = document.createElement('div');
    label.className = 'map-region-label'; label.style.left = cx+'%'; label.style.top = cy+'%'; label.textContent = region.name;
    document.getElementById('mapImageWrap').appendChild(label);
  });
  if(regionDraft.length){
    const pts = regionDraft.map(p => `${p.x/100*w},${p.y/100*h}`).join(' ');
    const poly = document.createElementNS('http://www.w3.org/2000/svg','polyline');
    poly.setAttribute('points', pts); poly.setAttribute('fill', 'none'); poly.setAttribute('stroke', '#8fc4b0');
    poly.setAttribute('stroke-dasharray', '4'); poly.setAttribute('stroke-width', '2');
    svg.appendChild(poly);
  }
}

