/* app.js — Orquestación: navegación entre vistas, home dashboard, bootstrap. */
/* ========================= NAV ========================= */

/* TOPBAR NAV */
document.getElementById('moreNavBtn').addEventListener('click', (e)=>{
  e.stopPropagation();
  document.getElementById('moreNavMenu').classList.toggle('open');
});
document.addEventListener('click', (e)=>{
  if(!e.target.closest('#moreNavBtn') && !e.target.closest('#moreNavMenu')){
    document.getElementById('moreNavMenu').classList.remove('open');
  }
});
document.querySelectorAll('.topbar-nav-btn[data-view]').forEach(btn=>{
  btn.addEventListener('click', async (e)=>{
    e.stopPropagation();
    document.getElementById('moreNavMenu').classList.remove('open');
    await navigateTo(btn.dataset.view);
    document.querySelectorAll('.topbar-nav-btn[data-view]').forEach(b=>b.classList.toggle('active', b===btn));
  });
});
document.getElementById('brandHomeBtn').addEventListener('click', async ()=>{
  document.getElementById('moreNavMenu').classList.remove('open');
  await navigateTo('home');
  document.querySelectorAll('.topbar-nav-btn[data-view]').forEach(b=>b.classList.remove('active'));
});
document.querySelectorAll('#moreNavMenu button').forEach(btn=>{
  btn.addEventListener('click', async (e)=>{
    e.stopPropagation();
    document.getElementById('moreNavMenu').classList.remove('open');
    await navigateTo(btn.dataset.view);
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
    document.getElementById('homePreviewName').textContent = latest.name || 'Última carta editada';
    previewText.textContent = latest.summary || 'Seleccioná una ficha para ver sus detalles.';
    const folderName = latest.folderId ? (worldMeta.folders.find(f=>f.id===latest.folderId)?.name || 'Carpeta') : 'Sin carpeta';
    previewMeta.innerHTML = `<span>${escapeHtml(folderName)}</span>`;
    const recent = entriesIndex.slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).slice(0,5);
    recentList.innerHTML = recent.map(item=>`<div class="home-recent-item" data-id="${item.id}"><span>${escapeHtml(item.name||'Sin nombre')}</span><svg class="icon"><use href="#i-cards"/></svg></div>`).join('');
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

const HOME_GREETINGS = [
  'Bienvenido',
  'Qué alegría verte',
  'Qué gusto tenerte de vuelta',
  'Es un placer verte'
];

function renderHomeGreeting(){
  const userName = worldMeta.userName && worldMeta.userName.trim();
  if(!userName) return;
  const greeting = HOME_GREETINGS[Math.floor(Math.random() * HOME_GREETINGS.length)];
  document.getElementById('homeGreetTitle').textContent = `${greeting}, ${userName}.`;
  document.getElementById('homeGreetText').textContent = 'Tu mundo te está esperando.';
}

function openInitialWelcome(){
  openModal({
    title:'¡Bienvenido a tu Códice!', fields:[], submitLabel:'Conectar carpeta', showDelete:true, deleteLabel:'Empezar de cero',
    message:'¿Querés conectar una carpeta con un proyecto existente, o empezar de cero acá mismo?',
    onSubmit: connectFolder, onDelete: ()=>{}
  });
}

function requestUserName(showInitialWelcome){
  openModal({
    title:'¡Bienvenido a Códice!',
    message:'¿Cómo querés que te llamemos?',
    fields:[{ key:'userName', label:'Tu nombre', placeholder:'Ej: Ada' }],
    submitLabel:'Continuar',
    onSubmit: async (values) => {
      const userName = values.userName.trim();
      if(!userName){
        requestUserName(showInitialWelcome);
        return;
      }
      worldMeta.userName = userName;
      await storeSet('world-meta', worldMeta);
      markDirty();
      renderHomeGreeting();
      if(showInitialWelcome) openInitialWelcome();
    }
  });
}

async function loadWorld(){
  const meta = await storeGet('world-meta');
  const metaExisted = !!meta;
  if(meta) worldMeta = meta;
  worldMeta.folders = worldMeta.folders || [];
  worldMeta.settings = worldMeta.settings || {};
  document.getElementById('worldName').value = worldMeta.worldName;
  applyTheme();

  const brandLogo = document.getElementById('brandLogo');
  const brandText = document.getElementById('brandText');
  if(worldMeta.logoDataUrl){
    brandLogo.src = worldMeta.logoDataUrl;
    brandLogo.style.display = 'block';
    brandText.style.display = 'none';
  } else {
    brandLogo.style.display = 'none';
    brandText.style.display = 'block';
  }

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

  renderFolderList(); renderFichasGrid(); renderHomeDashboard(); renderHomeGreeting();
  renderWsFolderOptions(null);

  const showInitialWelcome = !metaExisted && entriesIndex.length === 0 && !dirHandle;
  if(!worldMeta.userName || !worldMeta.userName.trim()) requestUserName(showInitialWelcome);
  else if(showInitialWelcome) openInitialWelcome();
}
document.getElementById('worldName').addEventListener('change', async (e)=>{
  worldMeta.worldName = e.target.value.trim() || 'Mundo sin nombre';
  await storeSet('world-meta', worldMeta); markDirty();
});
/* ========================= CARPETAS (árbol) =========================
   Un solo concepto (worldMeta.folders) compartido por Fichas y Mapas.
   Cada carpeta: { id, name, parentId: string|null, color: string|null }.
   parentId y color son aditivos — una carpeta vieja sin esos campos es
   simplemente una carpeta raíz sin color propio, nada se migra. */
function folderChildren(parentId){
  return worldMeta.folders.filter(f => (f.parentId||null) === (parentId||null));
}
function folderDescendantIds(folderId){
  const ids = [];
  const walk = (pid) => { folderChildren(pid).forEach(f => { ids.push(f.id); walk(f.id); }); };
  walk(folderId);
  return ids;
}
function flattenFolderTree(expandedSet){
  const out = [];
  const walk = (parentId, depth) => {
    folderChildren(parentId).slice().sort((a,b)=>a.name.localeCompare(b.name)).forEach(f=>{
      out.push({ folder:f, depth });
      const hasKids = folderChildren(f.id).length > 0;
      if(!hasKids || !expandedSet || expandedSet.has(f.id)) walk(f.id, depth+1);
    });
  };
  walk(null, 0);
  return out;
}
async function createFolder(name, opts={}){
  const trimmed = (name||'').trim();
  if(!trimmed) return null;
  const folder = { id: uid(), name: trimmed, parentId: opts.parentId || null, color: opts.color || null };
  worldMeta.folders.push(folder);
  await storeSet('world-meta', worldMeta); markDirty();
  return folder;
}
async function updateFolder(fid, changes){
  const f = worldMeta.folders.find(x=>x.id===fid);
  if(!f) return null;
  Object.assign(f, changes);
  await storeSet('world-meta', worldMeta); markDirty();
  return f;
}
async function deleteFolder(fid){
  const target = worldMeta.folders.find(f=>f.id===fid);
  const parentId = target ? (target.parentId||null) : null;
  worldMeta.folders.forEach(f=>{ if(f.parentId===fid) f.parentId = parentId; }); // las subcarpetas suben un nivel, no se pierden
  worldMeta.folders = worldMeta.folders.filter(f=>f.id!==fid);
  for(const en of entriesIndex){
    if(en.folderId===fid){
      en.folderId = null;
      const full = await storeGet('entry:'+en.id);
      if(full){ full.folderId = null; await storeSet('entry:'+en.id, full); }
    }
  }
  for(const m of mapsIndex){ if(m.folderId===fid) m.folderId = null; }
  await storeSet('world-meta', worldMeta);
  await storeSet('entries-index', entriesIndex);
  await storeSet('maps-index', mapsIndex);
  markDirty();
  if(activeFolder===fid) activeFolder = 'all';
  if(activeMapFolder===fid) activeMapFolder = 'all';
}
/* Lista de carpetas indentada por profundidad, para selects de "mover a carpeta". */
function folderSelectOptions(){
  return flattenFolderTree().map(({folder:f,depth})=>({ value:f.id, label:'　'.repeat(depth)+f.name }));
}
function refreshAllFolderUI(){
  renderFolderList(); renderFichasGrid(); renderWsFolderOptions(document.getElementById('wsFolder').value);
  if(mapsLoaded){ renderMapFolderList(); renderMapList(); }
}
function openEditFolderModal(folder){
  const excludeIds = new Set([folder.id, ...folderDescendantIds(folder.id)]);
  const parentOptions = [{ value:'', label:'Raíz' }, ...flattenFolderTree()
    .filter(({folder:f})=>!excludeIds.has(f.id))
    .map(({folder:f,depth})=>({ value:f.id, label:'　'.repeat(depth)+f.name }))];
  openModal({
    title:'Editar carpeta',
    fields:[
      { key:'name', label:'Nombre', value: folder.name },
      { key:'parentId', label:'Carpeta superior', type:'select', value: folder.parentId||'', options: parentOptions },
      { key:'color', label:'Color', type:'color', value: folder.color || '#c9922f' }
    ],
    submitLabel:'Guardar', showDelete:true, deleteLabel:'Eliminar carpeta',
    onSubmit: async (v)=>{
      await updateFolder(folder.id, { name: v.name.trim() || folder.name, parentId: v.parentId || null, color: v.color });
      refreshAllFolderUI();
    },
    onDelete: ()=>{
      openConfirm({
        title:'Eliminar carpeta', message:'Las subcarpetas suben un nivel; las fichas y mapas dentro quedan sin carpeta. Esta acción no se puede deshacer.',
        onConfirm: async ()=>{ await deleteFolder(folder.id); refreshAllFolderUI(); }
      });
    }
  });
}
function openNewFolderModal(defaultParentId){
  const parentOptions = [{ value:'', label:'Raíz' }, ...flattenFolderTree().map(({folder:f,depth})=>({ value:f.id, label:'　'.repeat(depth)+f.name }))];
  openModal({
    title:'Nueva carpeta',
    fields:[
      { key:'name', label:'Nombre', placeholder:'ej: Reino del Norte' },
      { key:'parentId', label:'Carpeta superior', type:'select', value: defaultParentId||'', options: parentOptions },
      { key:'color', label:'Color', type:'color', value:'#c9922f' }
    ],
    submitLabel:'Crear',
    onSubmit: async (v)=>{
      const folder = await createFolder(v.name, { parentId: v.parentId||null, color: v.color });
      if(!folder) return;
      if(folder.parentId) folderExpandedIds.add(folder.parentId);
      refreshAllFolderUI();
    }
  });
}
/* Arrastre genérico: cualquier elemento con data-drag-item o data-drag-folder es una
   fuente de drag; el destino (una fila de carpeta) lee estos datos en su 'drop'. */
document.addEventListener('dragstart', (e)=>{
  const itemEl = e.target.closest('[data-drag-item]');
  const folderEl = e.target.closest('[data-drag-folder]');
  if(itemEl) e.dataTransfer.setData('text/x-codice-item', itemEl.dataset.dragItem);
  else if(folderEl) e.dataTransfer.setData('text/x-codice-folder', folderEl.dataset.dragFolder);
  else return;
  e.stopPropagation();
});
function itemsInFolder(items, folderId){
  return items.filter(it => (it.folderId||null) === (folderId||null)).sort((a,b)=>(a.name||'').localeCompare(b.name||''));
}
/* Construye y conecta un árbol de carpetas dentro de un contenedor del rail, con las
   fichas/mapas anidados como hojas (igual que VVD) y arrastre para reorganizar todo.
   opts: { containerId, items, activeId, onSelect(id), getThumb(item), onLeafClick(item), onMoveItem(itemId, folderId) } */
function renderFolderTree(opts){
  const el = document.getElementById(opts.containerId);
  const counts = { none: 0 };
  opts.items.forEach(it => { const k = it.folderId || 'none'; counts[k] = (counts[k]||0)+1; });
  const total = opts.items.length;

  const leafRow = (item, depth) => {
    const thumb = opts.getThumb ? opts.getThumb(item) : null;
    const thumbHtml = thumb
      ? `<span class="folder-leaf-thumb" style="background-image:url('${thumb}')"></span>`
      : `<span class="folder-leaf-thumb folder-leaf-thumb-empty"><svg class="icon"><use href="#i-cards"/></svg></span>`;
    return `<div class="rail-item folder-leaf" data-drag-item="${item.id}" draggable="true" style="padding-left:${depth*16}px;">
      <span class="folder-row-main">${thumbHtml}<span class="folder-row-label">${escapeHtml(item.name||'Sin nombre')}</span></span>
    </div>`;
  };
  const folderRow = (label, id, count, depth, folder) => {
    const hasChildren = folder ? folderChildren(folder.id).length > 0 : false;
    const hasLeaves = folder ? itemsInFolder(opts.items, folder.id).length > 0 : false;
    const isOpen = folder ? folderExpandedIds.has(folder.id) : false;
    const chevron = (hasChildren || hasLeaves)
      ? `<span class="folder-chevron ${isOpen?'open':''}" data-toggle="${folder.id}">▸</span>`
      : `<span class="folder-chevron-spacer"></span>`;
    const colorDot = folder && folder.color ? `<span class="folder-color-dot" style="background:${folder.color}"></span>` : '';
    const actions = folder
      ? `<span class="icon-btn" data-edit-folder="${folder.id}" title="Editar carpeta">✎</span><span class="icon-btn" data-del-folder="${folder.id}" title="Eliminar carpeta">✕</span>`
      : '';
    const dragAttrs = folder ? `draggable="true" data-drag-folder="${folder.id}"` : '';
    return `<div class="rail-item folder-row" data-folder="${id}" ${dragAttrs} style="padding-left:${depth*16}px;">
      <span class="folder-row-main">${chevron}${colorDot}<span class="folder-row-label">${escapeHtml(label)}</span></span>
      <span class="folder-row-actions"><span class="rail-count">${count}</span>${actions}</span>
    </div>`;
  };

  let html = `<div class="rail-item folder-row ${opts.activeId==='all'?'active':''}" data-folder="all"><span class="folder-row-main"><span class="folder-chevron-spacer"></span><span class="folder-row-label">Todas</span></span><span class="folder-row-actions"><span class="rail-count">${total}</span></span></div>`;
  html += `<div class="rail-item folder-row ${opts.activeId==='none'?'active':''}" data-folder="none"><span class="folder-row-main"><span class="folder-chevron-spacer"></span><span class="folder-row-label">Sin carpeta</span></span><span class="folder-row-actions"><span class="rail-count">${counts.none||0}</span></span></div>`;
  itemsInFolder(opts.items, null).forEach(item => { html += leafRow(item, 1); });

  const walk = (parentId, depth) => {
    folderChildren(parentId).slice().sort((a,b)=>a.name.localeCompare(b.name)).forEach(f=>{
      html += folderRow(f.name, f.id, counts[f.id]||0, depth, f);
      if(folderExpandedIds.has(f.id)){
        itemsInFolder(opts.items, f.id).forEach(item => { html += leafRow(item, depth+1); });
        walk(f.id, depth+1);
      }
    });
  };
  walk(null, 1);
  el.innerHTML = html;

  el.querySelectorAll('.folder-chevron').forEach(chev=>{
    chev.addEventListener('click', (e)=>{
      e.stopPropagation();
      const fid = chev.dataset.toggle;
      if(folderExpandedIds.has(fid)) folderExpandedIds.delete(fid); else folderExpandedIds.add(fid);
      renderFolderTree(opts);
    });
  });
  el.querySelectorAll('[data-edit-folder]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const folder = worldMeta.folders.find(f=>f.id===btn.dataset.editFolder);
      if(folder) openEditFolderModal(folder);
    });
  });
  el.querySelectorAll('[data-del-folder]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const fid = btn.dataset.delFolder;
      openConfirm({
        title:'Eliminar carpeta', message:'Las subcarpetas suben un nivel; las fichas y mapas dentro quedan sin carpeta. Esta acción no se puede deshacer.',
        onConfirm: async ()=>{ await deleteFolder(fid); refreshAllFolderUI(); }
      });
    });
  });
  el.querySelectorAll('.folder-leaf').forEach(leaf=>{
    leaf.addEventListener('click', ()=>{
      const item = opts.items.find(it=>it.id===leaf.dataset.dragItem);
      if(item) opts.onLeafClick(item);
    });
  });
  el.querySelectorAll('.folder-row[data-folder]').forEach(row=>{
    row.addEventListener('click', (e)=>{
      if(e.target.closest('[data-edit-folder],[data-del-folder],.folder-chevron')) return;
      opts.onSelect(row.dataset.folder);
    });
    const fid = row.dataset.folder;
    row.addEventListener('dragover', (e)=>{
      if(fid==='all') return;
      e.preventDefault();
      row.classList.add('drag-over');
    });
    row.addEventListener('dragleave', ()=> row.classList.remove('drag-over'));
    row.addEventListener('drop', async (e)=>{
      e.preventDefault();
      row.classList.remove('drag-over');
      if(fid==='all') return;
      const targetFolderId = fid==='none' ? null : fid;
      const itemId = e.dataTransfer.getData('text/x-codice-item');
      const draggedFolderId = e.dataTransfer.getData('text/x-codice-folder');
      if(itemId){
        await opts.onMoveItem(itemId, targetFolderId);
      } else if(draggedFolderId){
        if(draggedFolderId === targetFolderId) return;
        const excluded = new Set([draggedFolderId, ...folderDescendantIds(draggedFolderId)]);
        if(targetFolderId && excluded.has(targetFolderId)) return; // no dejar que una carpeta caiga dentro de sí misma
        await updateFolder(draggedFolderId, { parentId: targetFolderId });
        refreshAllFolderUI();
      }
    });
  });
}
document.getElementById('newFolderBtn').addEventListener('click', ()=>{
  const defaultParent = (activeFolder && activeFolder!=='all' && activeFolder!=='none') ? activeFolder : null;
  openNewFolderModal(defaultParent);
});

function updateClock(){
  const now = new Date();
  document.getElementById('topbarClock').textContent = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
}
updateClock(); setInterval(updateClock, 30000);

/* ========================= MANIFEST (PWA best-effort) ========================= */
/* Comentado: manifestLink no existe en el HTML
try{
  const manifest = { name:'Códice', short_name:'Códice', start_url:'.', display:'standalone', background_color:'#0d0906', theme_color:'#0d0906' };
  const manifestBlob = new Blob([JSON.stringify(manifest)], { type:'application/json' });
  document.getElementById('manifestLink').setAttribute('href', URL.createObjectURL(manifestBlob));
}catch(e){}
*/

async function loadExtras(){
  const jr = await storeGet('journal-entries'); journalEntries = jr || [];
  const sl = await storeGet('session-log'); sessionLog = sl || [];
  renderJournalGrid(); renderSessionList();
}
