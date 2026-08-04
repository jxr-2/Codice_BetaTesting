/* app.js — Orquestación: navegación entre vistas, home dashboard, bootstrap. */
/* ========================= NAV ========================= */
document.getElementById('navMenuBtn').addEventListener('click', (e)=>{ e.stopPropagation(); document.getElementById('navMenu').classList.toggle('open'); });
document.addEventListener('click', ()=> document.getElementById('navMenu').classList.remove('open'));
document.querySelectorAll('#navMenu button').forEach(btn=>{
  btn.addEventListener('click', async (e)=>{
    e.stopPropagation();
    document.getElementById('navMenu').classList.remove('open');
    await navigateTo(btn.dataset.view);
    document.querySelectorAll('#navMenu button').forEach(b=>b.classList.toggle('active', b===btn));
  });
});
document.getElementById('railToggleBtn').addEventListener('click', ()=>{
  const rail = document.querySelector('.view.active .rail');
  if(rail) rail.classList.toggle('open');
});
function switchView(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active', v.id === 'view-'+view));
  if(view === 'canvas' && !canvasLoaded) initCanvas();
  if(view === 'mapas' && !mapsLoaded) initMapas();
  if(view === 'grimorio' && !grimorioInited) initGrimorio();
}
async function navigateTo(view){
  const leavingFichasEditor = document.getElementById('view-fichas').classList.contains('active') && fichasMode==='editor' && view !== 'fichas';
  if(leavingFichasEditor && wsDirty){
    openUnsavedGuard(document.getElementById('wsName').value,
      async ()=>{ await saveCurrentWorkspace(); switchView(view); },
      async ()=>{ wsDirty=false; setFichasMode('grid'); switchView(view); });
    return;
  }
  switchView(view);
}

async function renderHomeDashboard(){
  const previewText = document.getElementById('homePreviewText');
  const previewMeta = document.getElementById('homePreviewMeta');
  const recentList = document.getElementById('homeRecentList');
  const mapPreview = document.getElementById('homeMapPreview');
  if(entriesIndex.length === 0){
    previewText.textContent = 'Creá una ficha y aparecerá aquí una vista previa instantánea.';
    previewMeta.innerHTML = '';
    recentList.innerHTML = '<div class="home-recent-item"><span>No hay fichas aún.</span></div>';
  } else {
    const latest = entriesIndex.slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0];
    previewText.textContent = latest.summary || 'Seleccioná una ficha para ver sus detalles.';
    const typeLabel = TYPES[latest.type] ? `${TYPES[latest.type].glyph} ${TYPES[latest.type].label}` : 'Ficha';
    const folderName = latest.folderId ? (worldMeta.folders.find(f=>f.id===latest.folderId)?.name || 'Carpeta') : 'Sin carpeta';
    previewMeta.innerHTML = `<span>${escapeHtml(typeLabel)}</span><span>${escapeHtml(folderName)}</span>`;
    const recent = entriesIndex.slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).slice(0,5);
    recentList.innerHTML = recent.map(item=>`<div class="home-recent-item" data-id="${item.id}"><span>${escapeHtml(item.name||'Sin nombre')}</span><span>${TYPES[item.type].glyph}</span></div>`).join('');
    recentList.querySelectorAll('.home-recent-item').forEach(item=> item.addEventListener('click', ()=> openFichaEditor(item.dataset.id)));
  }
  if(currentMap){
    mapPreview.innerHTML = `<img src="${currentMap.image}" alt="${escapeHtml(currentMap.name)}"><div class="map-info"><strong>${escapeHtml(currentMap.name)}</strong></div>`;
  } else if(mapsIndex.length){
    mapPreview.innerHTML = `<div class="map-empty">Hay ${mapsIndex.length} mapa(s) guardado(s). Abrí la pestaña Mapas.</div>`;
  } else {
    mapPreview.innerHTML = `<div class="map-empty">No hay mapa cargado todavía.</div>`;
  }
}

async function loadWorld(){
  const meta = await storeGet('world-meta');
  const metaExisted = !!meta;
  if(meta) worldMeta = meta;
  worldMeta.folders = worldMeta.folders || [];
  worldMeta.settings = worldMeta.settings || {};
  document.getElementById('worldName').value = worldMeta.worldName;
  applyTheme();

  const idx = await storeGet('entries-index');
  entriesIndex = idx || [];
  const mapsIdx = await storeGet('maps-index');
  mapsIndex = mapsIdx || [];

  if(worldMeta.lastMapId && mapsIndex.some(m=>m.id===worldMeta.lastMapId)){
    await loadMap(worldMeta.lastMapId);
  } else {
    currentMap = null;
    document.getElementById('mapEmpty').style.display = 'block';
    document.getElementById('mapWorkspace').style.display = 'none';
  }

  renderFolderList(); renderTypeFilterList(); renderFichasGrid(); renderHomeDashboard();
  renderWsFolderOptions(null);

  if(!metaExisted && entriesIndex.length === 0 && !dirHandle){
    openModal({
      title:'¡Bienvenido a tu Códice!', fields:[], submitLabel:'Conectar carpeta', showDelete:true, deleteLabel:'Empezar de cero',
      message:'¿Querés conectar una carpeta con un proyecto existente, o empezar de cero acá mismo?',
      onSubmit: connectFolder, onDelete: ()=>{}
    });
  }
}
document.getElementById('worldName').addEventListener('change', async (e)=>{
  worldMeta.worldName = e.target.value.trim() || 'Mundo sin nombre';
  await storeSet('world-meta', worldMeta); markDirty();
});
document.getElementById('newFolderBtn').addEventListener('click', ()=>{
  openModal({
    title:'Nueva carpeta', fields:[{ key:'name', label:'Nombre', placeholder:'ej: Reino del Norte' }], submitLabel:'Crear',
    onSubmit: async (v) => {
      if(!v.name.trim()) return;
      worldMeta.folders.push({ id: uid(), name: v.name.trim() });
      await storeSet('world-meta', worldMeta); markDirty();
      renderFolderList(); renderWsFolderOptions(document.getElementById('wsFolder').value);
    }
  });
});

function updateClock(){
  const now = new Date();
  document.getElementById('topbarClock').textContent = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
}
updateClock(); setInterval(updateClock, 30000);

/* ========================= MANIFEST (PWA best-effort) ========================= */
try{
  const manifest = { name:'Códice', short_name:'Códice', start_url:'.', display:'standalone', background_color:'#0d0906', theme_color:'#0d0906' };
  const manifestBlob = new Blob([JSON.stringify(manifest)], { type:'application/json' });
  document.getElementById('manifestLink').setAttribute('href', URL.createObjectURL(manifestBlob));
}catch(e){}

async function loadExtras(){
  const jr = await storeGet('journal-entries'); journalEntries = jr || [];
  const sl = await storeGet('session-log'); sessionLog = sl || [];
  renderJournalList(); renderSessionList();
}
