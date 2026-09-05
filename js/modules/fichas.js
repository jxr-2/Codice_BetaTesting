/* modules/fichas.js — Carpetas, grilla de fichas, editor completo, impresión. */
function renderFolderList(){
  renderFolderTree({
    containerId: 'folderList',
    items: entriesIndex,
    activeId: activeFolder,
    getThumb: (e)=> e.coverThumb || null,
    onLeafClick: (e)=> openFichaEditor(e.id),
    onMoveItem: moveEntryToFolder,
    onSelect: (id)=>{ activeFolder = id; setFichasMode('grid'); renderFolderList(); renderFichasGrid(); }
  });
}
async function moveEntryToFolder(entryId, folderId){
  const full = await storeGet('entry:'+entryId);
  if(full){ full.folderId = folderId; await storeSet('entry:'+entryId, full); }
  const light = entriesIndex.find(e=>e.id===entryId); if(light) light.folderId = folderId;
  await storeSet('entries-index', entriesIndex); markDirty();
  renderFolderList(); renderFichasGrid();
}
/* ========================= FICHAS GRID (auto-fit summary) ========================= */
document.getElementById('searchFichas').addEventListener('input', (e)=>{ searchTerm = e.target.value; renderFichasGrid(); });
function filteredEntries(){
  let list = entriesIndex;
  if(activeFolder === 'none') list = list.filter(e=>!e.folderId);
  else if(activeFolder !== 'all') list = list.filter(e=>e.folderId===activeFolder);
  if(searchTerm.trim()){
    const q = searchTerm.toLowerCase();
    list = list.filter(e => (e.name||'').toLowerCase().includes(q) || (e.summary||'').toLowerCase().includes(q) || (e.tags||[]).some(t=>t.toLowerCase().includes(q)));
  }
  return list.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||''));
}
function setFichasMode(mode){
  fichasMode = mode;
  document.getElementById('fichasGridWrap').style.display = mode==='grid' ? 'block' : 'none';
  document.getElementById('workspaceInline').style.display = mode==='editor' ? 'block' : 'none';
}
function renderFichasGrid(){
  const grid = document.getElementById('fichasGrid');
  const list = filteredEntries();
  if(entriesIndex.length === 0){
    grid.innerHTML = `<div class="empty"><div class="glyph"><svg class="icon"><use href="#i-cards"/></svg></div><div class="title">El taller está vacío</div><div class="sub">Creá tu primera ficha de personaje, lugar u objeto.</div></div>`;
    document.getElementById('bulkBar').style.display = 'none';
    return;
  }
  if(list.length === 0){
    grid.innerHTML = `<div class="empty"><div class="glyph">◌</div><div class="title">Sin resultados</div><div class="sub">Nada coincide con esa búsqueda o filtro.</div></div>`;
    return;
  }
  grid.innerHTML = `<div class="cards-grid">${list.map(e=>{
    const folder = e.folderId ? worldMeta.folders.find(f=>f.id===e.folderId) : null;
    const accentColor = (folder && folder.color) || 'var(--verdigris)';
    const pos = e.coverPosition || {x:50,y:50};
    const zoom = e.coverZoom || 1;
    const coverStyle = e.coverThumb ? `background-image:url('${e.coverThumb}');background-position:${pos.x}% ${pos.y}%;background-size:${zoom*100}%;` : '';
    const checked = selectedIds.has(e.id);
    return `<div class="ficha-card" style="--type-color:${accentColor}" data-id="${e.id}" draggable="true" data-drag-item="${e.id}">
      ${selectMode ? `<input type="checkbox" class="ficha-check" data-check="${e.id}" ${checked?'checked':''}>` : ''}
      <div class="ficha-cover" style="${coverStyle}">${e.coverThumb ? '' : '<svg class="icon icon-lg"><use href="#i-cards"/></svg>'}</div>
      <div class="ficha-body">
        ${folder ? `<div class="ficha-type">${escapeHtml(folder.name)}</div>` : ''}
        <div class="ficha-name">${escapeHtml(e.name||'Sin nombre')}</div>
        <div class="ficha-summary" data-summary>${escapeHtml(e.summary||'')}</div>
        ${(e.tags&&e.tags.length) ? `<div class="ficha-tags">${e.tags.map(tg=>`<span class="tag-pill">${escapeHtml(tg)}</span>`).join('')}</div>` : ''}
      </div>
    </div>`;
  }).join('')}</div>`;
  grid.querySelectorAll('.ficha-card').forEach(card=>{
    card.addEventListener('click', (e)=>{
      const id = card.dataset.id;
      if(selectMode){
        if(e.target.dataset.check !== undefined){ /* handled by change listener */ }
        else { if(selectedIds.has(id)) selectedIds.delete(id); else selectedIds.add(id); renderFichasGrid(); }
        return;
      }
      openFichaEditor(id);
    });
  });
  grid.querySelectorAll('[data-check]').forEach(chk=>{
    chk.addEventListener('click', (e)=>e.stopPropagation());
    chk.addEventListener('change', ()=>{
      if(chk.checked) selectedIds.add(chk.dataset.check); else selectedIds.delete(chk.dataset.check);
      renderBulkBar();
    });
  });
  renderBulkBar();
  autoFitSummaries();
}
function autoFitSummaries(){
  document.querySelectorAll('[data-summary]').forEach(el=>{
    let size = 13.5;
    el.style.fontSize = size+'px';
    let guard = 0;
    while(el.scrollHeight > el.clientHeight + 1 && size > 10 && guard < 12){
      size -= 0.5; el.style.fontSize = size+'px'; guard++;
    }
  });
}
window.addEventListener('resize', ()=>{ if(fichasMode==='grid') autoFitSummaries(); });

document.getElementById('selectModeBtn').addEventListener('click', ()=>{
  selectMode = !selectMode; selectedIds.clear();
  document.getElementById('selectModeBtn').classList.toggle('active', selectMode);
  renderFichasGrid();
});
function renderBulkBar(){
  const bar = document.getElementById('bulkBar');
  if(!selectMode || selectedIds.size===0){ bar.style.display='none'; return; }
  bar.style.display='flex';
  document.getElementById('bulkCount').textContent = selectedIds.size + ' seleccionada(s)';
}
document.getElementById('bulkCancelBtn').addEventListener('click', ()=>{ selectMode=false; selectedIds.clear(); document.getElementById('selectModeBtn').classList.remove('active'); renderFichasGrid(); });
document.getElementById('bulkFolderBtn').addEventListener('click', ()=>{
  openModal({
    title:'Mover a carpeta', fields:[{ key:'folderId', label:'Carpeta', type:'select', options:[{value:'',label:'Sin carpeta'}, ...folderSelectOptions()] }],
    submitLabel:'Mover',
    onSubmit: async (v)=>{
      for(const id of selectedIds){
        const full = await storeGet('entry:'+id);
        if(full){ full.folderId = v.folderId || null; await storeSet('entry:'+id, full); }
        const light = entriesIndex.find(e=>e.id===id); if(light) light.folderId = v.folderId || null;
      }
      await storeSet('entries-index', entriesIndex); markDirty();
      selectMode=false; selectedIds.clear(); document.getElementById('selectModeBtn').classList.remove('active');
      renderFolderList(); renderFichasGrid();
    }
  });
});
document.getElementById('bulkDeleteBtn').addEventListener('click', ()=>{
  openConfirm({ title:'Eliminar fichas', message:`Se eliminarán ${selectedIds.size} ficha(s) de forma permanente.`, onConfirm: async ()=>{
    for(const id of selectedIds){ await storeDelete('entry:'+id); }
    entriesIndex = entriesIndex.filter(e=>!selectedIds.has(e.id));
    await storeSet('entries-index', entriesIndex); markDirty();
    selectMode=false; selectedIds.clear(); document.getElementById('selectModeBtn').classList.remove('active');
    renderFolderList(); renderFichasGrid(); renderHomeDashboard();
  }});
});
document.getElementById('bulkPrintBtn').addEventListener('click', async ()=>{
  const items = [];
  for(const id of selectedIds){ const full = await storeGet('entry:'+id); if(full) items.push(full); }
  printEntries(items);
});

/* ========================= WORKSPACE (Fichas, unificado) ========================= */
function defaultEntry(){
  return { name:'', folderId:null, tags:[], summary:'', blocks:[], coverImage:null, coverThumb:null,
    coverPosition:{x:50,y:50}, coverZoom:1, enable5eSheet:false, stats:{}, spells:'', inventory:'' };
}
function renderWsFolderOptions(selected){
  let html = `<option value="">Sin carpeta</option>`;
  html += folderSelectOptions().map(o=>`<option value="${o.value}" ${o.value===selected?'selected':''}>${escapeHtml(o.label)}</option>`).join('');
  document.getElementById('wsFolder').innerHTML = html;
}
function applyCoverStyle(){
  const cover = document.getElementById('wsCover');
  cover.style.backgroundImage = wsCoverData ? `url('${wsCoverData}')` : '';
  cover.style.backgroundPosition = `${wsCoverPos.x}% ${wsCoverPos.y}%`;
  cover.style.backgroundSize = `${wsCoverZoom*100}%`;
  document.getElementById('wsCoverHint').style.display = wsCoverData ? 'none' : 'block';
  document.getElementById('wsCoverControls').style.display = wsCoverData ? 'flex' : 'none';
}
function update5EVisibility(){
  const panel = document.getElementById('ws5ePanel');
  panel.classList.toggle('active', wsEnable5E);
  document.getElementById('wsToggle5E').textContent = wsEnable5E ? 'Ocultar hoja 5E' : 'Activar hoja 5E';
}
function miniToolbarHtml(id){
  return `<button type="button" class="mini-fmt-btn" data-fmt="bold" data-target="${id}"><b>N</b></button>
    <button type="button" class="mini-fmt-btn" data-fmt="italic" data-target="${id}"><i>K</i></button>
    <button type="button" class="mini-fmt-btn" data-fmt="underline" data-target="${id}"><u>S</u></button>`;
}
function renderBlocks(){
  const wrap = document.getElementById('wsBlocks');
  wrap.innerHTML = currentBlocks.map(b=>`
    <div class="ws-block" data-id="${b.id}">
      <div class="ws-block-header">
        <input class="ws-block-title" value="${escapeHtml(b.title)}" data-block-title="${b.id}">
        <div class="ws-block-toolbar">${miniToolbarHtml(b.id)}</div>
        <button class="icon-btn mini-fmt-btn" data-block-img="${b.id}" title="Insertar imagen" type="button"><svg class="icon"><use href="#i-image"/></svg></button>
        <button class="icon-btn mini-fmt-btn" data-block-del="${b.id}" title="Eliminar sección" type="button">✕</button>
      </div>
      <div class="ws-content" contenteditable="true" data-block-content="${b.id}" data-placeholder="Escribí aquí…">${b.html||''}</div>
    </div>`).join('') || '<div class="hint" style="margin:14px 32px;">Sin secciones todavía. Usá "+ Añadir sección de texto" para empezar a escribir.</div>';
  wireBlockEvents();
}
function wireBlockEvents(){
  document.querySelectorAll('[data-block-title]').forEach(inp=>{
    inp.addEventListener('input', ()=>{ const b = currentBlocks.find(x=>x.id===inp.dataset.blockTitle); if(b){ b.title = inp.value; markWsDirty(); } });
  });
  document.querySelectorAll('[data-block-content]').forEach(el=>{
    el.addEventListener('input', ()=>{ const b = currentBlocks.find(x=>x.id===el.dataset.blockContent); if(b){ b.html = el.innerHTML; markWsDirty(); } });
    const blockId = el.dataset.blockContent;
    wireImageBlocksIn(el, ()=> syncBlock(blockId, el));
  });
  document.querySelectorAll('[data-fmt]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const target = document.querySelector(`[data-block-content="${btn.dataset.target}"]`);
      if(target){ target.focus(); document.execCommand(btn.dataset.fmt); markWsDirty(); }
    });
  });
  document.querySelectorAll('[data-block-img]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const fileInput = document.getElementById('contentImgFile');
      fileInput.dataset.forBlock = btn.dataset.blockImg;
      fileInput.click();
    });
  });
  document.querySelectorAll('[data-block-del]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      currentBlocks = currentBlocks.filter(b=>b.id!==btn.dataset.blockDel);
      markWsDirty(); renderBlocks();
    });
  });
}
document.getElementById('addBlockBtn').addEventListener('click', ()=>{
  currentBlocks.push({ id: uid(), title:'Nueva sección', html:'' });
  markWsDirty(); renderBlocks();
});
document.getElementById('contentImgFile').addEventListener('change', async (e)=>{
  const file = e.target.files[0]; if(!file) return;
  const dataUrl = await resizeImageFile(file, 1200, 0.8);
  const blockId = e.target.dataset.forBlock;
  const target = document.querySelector(`[data-block-content="${blockId}"]`);
  if(target){
    target.focus();
    const block = createImageBlock(dataUrl, ()=> syncBlock(blockId, target));
    insertNodeAtCursor(target, block);
    const b = currentBlocks.find(x=>x.id===blockId);
    if(b) b.html = target.innerHTML;
    markWsDirty();
  }
  e.target.value = '';
});

function syncBlock(blockId, container){
  const b = currentBlocks.find(x=>x.id===blockId);
  if(b){ b.html = container.innerHTML; markWsDirty(); }
}

async function loadEntryIntoWorkspace(id){
  setFichasMode('editor');
  currentEntryId = id || null;
  let full = defaultEntry();
  if(id){
    const loaded = await storeGet('entry:'+id);
    if(loaded) full = Object.assign(defaultEntry(), loaded);
    if(!loaded?.blocks && loaded?.content){ full.blocks = [{ id: uid(), title:'Notas', html: loaded.content }]; }
  }
  currentBlocks = (full.blocks||[]).map(b=>({...b}));
  wsCoverData = full.coverImage || null;
  wsCoverPos = full.coverPosition || { x:50, y:50 };
  wsCoverZoom = full.coverZoom || 1;
  wsEnable5E = full.enable5eSheet || false;
  renderWsFolderOptions(full.folderId);
  document.getElementById('wsName').value = full.name || '';
  document.getElementById('wsTags').value = (full.tags||[]).join(', ');
  document.getElementById('wsSummary').value = full.summary || '';
  document.getElementById('wsSTR').value = full.stats?.STR || '';
  document.getElementById('wsDEX').value = full.stats?.DEX || '';
  document.getElementById('wsCON').value = full.stats?.CON || '';
  document.getElementById('wsINT').value = full.stats?.INT || '';
  document.getElementById('wsWIS').value = full.stats?.WIS || '';
  document.getElementById('wsCHA').value = full.stats?.CHA || '';
  document.getElementById('wsHP').value = full.stats?.HP || '';
  document.getElementById('wsAC').value = full.stats?.AC || '';
  document.getElementById('wsSpeed').value = full.stats?.Speed || '';
  document.getElementById('wsProf').value = full.stats?.Prof || '';
  document.getElementById('wsSpells').value = full.spells || '';
  document.getElementById('wsInventory').value = full.inventory || '';
  document.getElementById('wsCoverZoomInput').value = wsCoverZoom;
  applyCoverStyle();
  document.getElementById('wsDelete').style.display = id ? 'inline-block' : 'none';
  update5EVisibility();
  renderBlocks();
  wsDirty = false;
  clearTimeout(wsAutosaveTimer);
  document.getElementById('wsDirtyHint').textContent = '';
  await renderWsBacklinks();
}
/* "Dónde aparece esta ficha": junta referencias que ya existen en Bitácora (linkedEntryIds),
   Canvas (nodo kind:'entry') y Mapas (pin.entryId) — no agrega datos nuevos, solo los muestra. */
async function renderWsBacklinks(){
  const panel = document.getElementById('wsBacklinks');
  const list = document.getElementById('wsBacklinksList');
  if(!currentEntryId){ panel.style.display = 'none'; return; }
  const entryId = currentEntryId;
  const items = [];
  sessionLog.filter(s => (s.linkedEntryIds||[]).includes(entryId)).forEach(s=>{
    items.push(`<div class="linked-ficha-check"><svg class="icon"><use href="#i-notebook"/></svg> Sesión: <a href="#" data-goto-session="${s.id}">${escapeHtml(s.title||'Sesión')}</a></div>`);
  });
  const canvasSrc = canvasLoaded ? canvasData : ((await storeGet('canvas-data')) || { nodes:[], edges:[] });
  if(canvasSrc.nodes.some(n=>n.kind==='entry' && n.entryId===entryId)){
    items.push(`<div class="linked-ficha-check"><svg class="icon"><use href="#i-link"/></svg> <a href="#" data-goto-canvas="1">Aparece en el lienzo de conexiones</a></div>`);
  }
  for(const m of mapsIndex){
    const mapData = await storeGet('map:'+m.id);
    if(!mapData || !mapData.pins) continue;
    mapData.pins.filter(p=>p.entryId===entryId).forEach(p=>{
      items.push(`<div class="linked-ficha-check"><svg class="icon"><use href="#i-pin"/></svg> Pin "${escapeHtml(p.title||'Sin título')}" en <a href="#" data-goto-map="${m.id}">${escapeHtml(m.name)}</a></div>`);
    });
  }
  if(currentEntryId !== entryId) return; // cambiaste de ficha mientras se buscaban los mapas
  if(!items.length){ panel.style.display = 'none'; return; }
  panel.style.display = 'block';
  list.innerHTML = items.join('');
  list.querySelectorAll('[data-goto-session]').forEach(a=> a.addEventListener('click', (e)=>{ e.preventDefault(); navigateTo('bitacora').then(()=> loadSession(a.dataset.gotoSession)); }));
  list.querySelectorAll('[data-goto-map]').forEach(a=> a.addEventListener('click', (e)=>{ e.preventDefault(); navigateTo('mapas').then(()=> loadMap(a.dataset.gotoMap)); }));
  list.querySelectorAll('[data-goto-canvas]').forEach(a=> a.addEventListener('click', (e)=>{ e.preventDefault(); navigateTo('canvas'); }));
}
let wsAutosaveTimer = null;
function markWsDirty(){
  wsDirty = true;
  document.getElementById('wsDirtyHint').textContent = '● cambios sin guardar';
  clearTimeout(wsAutosaveTimer);
  wsAutosaveTimer = setTimeout(async ()=>{
    if(!document.getElementById('wsName').value.trim()) return;
    document.getElementById('wsDirtyHint').textContent = 'Guardando…';
    const ok = await saveCurrentWorkspace({ silent:true });
    document.getElementById('wsDirtyHint').textContent = ok ? '✓ Guardado' : '● cambios sin guardar';
  }, 2500);
}
['wsName','wsTags','wsSummary','wsSTR','wsDEX','wsCON','wsINT','wsWIS','wsCHA','wsHP','wsAC','wsSpeed','wsProf','wsSpells','wsInventory'].forEach(id=>{
  document.getElementById(id).addEventListener('input', markWsDirty);
});
document.getElementById('wsFolder').addEventListener('change', markWsDirty);
document.getElementById('wsToggle5E').addEventListener('click', ()=>{ wsEnable5E = !wsEnable5E; markWsDirty(); update5EVisibility(); });

document.getElementById('wsCover').addEventListener('click', ()=>{ if(!wsCoverData) document.getElementById('wsCoverFile').click(); });
document.getElementById('wsCoverFile').addEventListener('change', async (e)=>{
  const file = e.target.files[0]; if(!file) return;
  wsCoverData = await resizeImageFile(file, 900, 0.75);
  wsCoverPos = { x:50, y:50 }; wsCoverZoom = 1;
  document.getElementById('wsCoverZoomInput').value = 1;
  applyCoverStyle(); markWsDirty();
});
document.getElementById('wsCover').addEventListener('mousedown', (e)=>{
  if(!wsCoverData || e.target.closest('.ws-cover-controls')) return;
  coverDragState = { startX:e.clientX, startY:e.clientY, origX:wsCoverPos.x, origY:wsCoverPos.y, rect: document.getElementById('wsCover').getBoundingClientRect() };
});
document.getElementById('wsCoverRemove').addEventListener('click', (e)=>{
  e.stopPropagation();
  wsCoverData = null; wsCoverPos = { x:50, y:50 }; wsCoverZoom = 1;
  document.getElementById('wsCoverZoomInput').value = 1;
  applyCoverStyle(); markWsDirty();
});
window.addEventListener('mousemove', (e)=>{
  if(coverDragState){
    const dx = (e.clientX - coverDragState.startX) / coverDragState.rect.width * 100;
    const dy = (e.clientY - coverDragState.startY) / coverDragState.rect.height * 100;
    wsCoverPos.x = Math.min(100, Math.max(0, coverDragState.origX - dx));
    wsCoverPos.y = Math.min(100, Math.max(0, coverDragState.origY - dy));
    applyCoverStyle(); markWsDirty();
  }
});
window.addEventListener('mouseup', ()=>{ coverDragState = null; });
document.getElementById('wsCoverZoomInput').addEventListener('input', (e)=>{ wsCoverZoom = parseFloat(e.target.value); applyCoverStyle(); markWsDirty(); });

async function saveCurrentWorkspace(opts={}){
  const silent = !!opts.silent;
  const name = document.getElementById('wsName').value.trim();
  if(!name){ if(!silent) document.getElementById('wsName').focus(); return false; }
  const folderId = document.getElementById('wsFolder').value || null;
  const tags = document.getElementById('wsTags').value.split(',').map(t=>t.trim()).filter(Boolean);
  const summary = document.getElementById('wsSummary').value.trim();
  const stats = {
    STR: document.getElementById('wsSTR').value, DEX: document.getElementById('wsDEX').value, CON: document.getElementById('wsCON').value,
    INT: document.getElementById('wsINT').value, WIS: document.getElementById('wsWIS').value, CHA: document.getElementById('wsCHA').value,
    HP: document.getElementById('wsHP').value, AC: document.getElementById('wsAC').value, Speed: document.getElementById('wsSpeed').value, Prof: document.getElementById('wsProf').value
  };
  const spells = document.getElementById('wsSpells').value.trim();
  const inventory = document.getElementById('wsInventory').value.trim();
  const id = currentEntryId || uid();
  const now = Date.now();
  const full = { id, name, folderId, tags, summary, blocks: currentBlocks, stats, spells, inventory, enable5eSheet: wsEnable5E,
    coverImage: wsCoverData, coverThumb: wsCoverData, coverPosition: wsCoverPos, coverZoom: wsCoverZoom, updatedAt: now, createdAt: currentEntryId ? undefined : now };
  const prevIdx = entriesIndex.findIndex(e=>e.id===id);
  if(prevIdx>-1 && full.createdAt===undefined) full.createdAt = entriesIndex[prevIdx].createdAt || now;
  await storeSet('entry:'+id, full); markDirty();
  const lightEntry = { id, name, folderId, tags, summary, coverThumb: wsCoverData, coverPosition: wsCoverPos, coverZoom: wsCoverZoom, updatedAt: now, createdAt: full.createdAt };
  if(prevIdx>-1) entriesIndex[prevIdx] = lightEntry; else entriesIndex.push(lightEntry);
  await storeSet('entries-index', entriesIndex);
  currentEntryId = id; wsDirty = false;
  clearTimeout(wsAutosaveTimer);
  renderFolderList(); renderFichasGrid(); renderHomeDashboard();
  if(canvasLoaded){ renderCanvasNodes(); renderCanvasEdges(); }
  if(!silent) setFichasMode('grid'); else await renderWsBacklinks();
  return true;
}
document.getElementById('wsSave').addEventListener('click', ()=> saveCurrentWorkspace());

/* Al borrar una ficha, tanto el canvas como los mapas pueden tener referencias a su id
   (nodo de canvas, pin.entryId). Si esos módulos no fueron abiertos en esta sesión, sus
   datos en memoria son solo el default vacío — hay que leerlos de storage para limpiarlos
   de verdad, no solo el estado en memoria. */
async function cleanupOrphanedMapPins(entryId){
  for(const m of mapsIndex){
    const mapData = await storeGet('map:'+m.id);
    if(!mapData || !mapData.pins || !mapData.pins.length) continue;
    const before = mapData.pins.length;
    mapData.pins = mapData.pins.filter(p=>p.entryId !== entryId);
    if(mapData.pins.length !== before){
      await storeSet('map:'+m.id, mapData);
      if(currentMap && currentMap.id === m.id){ currentMap = mapData; if(mapsLoaded) renderPins(); }
    }
  }
}
document.getElementById('wsDelete').addEventListener('click', ()=>{
  if(!currentEntryId) return;
  openConfirm({
    title:'Eliminar ficha', message:'Esta ficha se borrará de tu códice de forma permanente.',
    onConfirm: async ()=>{
      const deletedId = currentEntryId;
      await storeDelete('entry:'+deletedId);
      entriesIndex = entriesIndex.filter(e=>e.id!==deletedId);
      await storeSet('entries-index', entriesIndex);
      const canvasSrc = canvasLoaded ? canvasData : ((await storeGet('canvas-data')) || { nodes:[], edges:[] });
      const removedIds = canvasSrc.nodes.filter(n=>n.kind==='entry'&&n.entryId===deletedId).map(n=>n.id);
      if(removedIds.length){
        canvasSrc.nodes = canvasSrc.nodes.filter(n=>!removedIds.includes(n.id));
        canvasSrc.edges = canvasSrc.edges.filter(ed=>!removedIds.includes(ed.from)&&!removedIds.includes(ed.to));
        canvasData = canvasSrc;
        await saveCanvas();
        if(canvasLoaded){ renderCanvasNodes(); renderCanvasEdges(); }
      }
      await cleanupOrphanedMapPins(deletedId);
      markDirty();
      renderFolderList(); renderFichasGrid(); renderHomeDashboard();
      setFichasMode('grid');
    }
  });
});

async function openFichaEditor(id){
  switchView('fichas');
  const proceed = async ()=>{ await loadEntryIntoWorkspace(id); };
  if(wsDirty){
    openUnsavedGuard(document.getElementById('wsName').value,
      async ()=>{ const ok = await saveCurrentWorkspace(); if(ok) await proceed(); },
      async ()=>{ wsDirty=false; await proceed(); });
  } else { await proceed(); }
}
document.getElementById('newFichaBtn').addEventListener('click', ()=> openFichaEditor(null));
document.getElementById('newFichaBtnHome').addEventListener('click', ()=> openFichaEditor(null));
document.getElementById('backToGridBtn').addEventListener('click', ()=>{
  if(wsDirty){
    openUnsavedGuard(document.getElementById('wsName').value,
      async ()=>{ await saveCurrentWorkspace(); },
      ()=>{ wsDirty=false; setFichasMode('grid'); });
  } else { setFichasMode('grid'); }
});
document.getElementById('wsSwitchBtn').addEventListener('click', ()=>{
  if(entriesIndex.length===0) return;
  openModal({
    title:'Cambiar de ficha', wide:false,
    fields:[{ key:'id', label:'Ficha', type:'select', options: entriesIndex.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||'')).map(e=>({value:e.id,label:e.name||'Sin nombre'})) }],
    submitLabel:'Abrir',
    onSubmit: (v)=> openFichaEditor(v.id)
  });
});
document.getElementById('goToCanvasBtn').addEventListener('click', ()=> navigateTo('canvas'));
document.getElementById('goToMapsBtn').addEventListener('click', ()=> navigateTo('mapas'));

/* Grimorio picker (básico, panel lateral de la ficha) */
document.getElementById('openGrimoireBtn').addEventListener('click', async ()=>{
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  box.style.width = 'min(520px,92vw)';
  box.innerHTML = '<div class="modal-title">Grimorio básico</div><div class="hint">Cargando hechizos…</div>';
  overlay.classList.add('open');
  await loadSpellsDB();
  if(grimorioLoadState === 'error'){
    box.innerHTML = '<div class="modal-title">Grimorio básico</div><div class="hint">No se pudieron cargar los hechizos. Comprobá que data/all.json esté disponible.</div><div class="modal-actions"><div></div><div><button class="btn-ghost" id="modalCancel">Cerrar</button></div></div>';
    document.getElementById('modalCancel').onclick = closeModal;
    return;
  }
  const renderList = (q='') => {
    const filtered = GRIMOIRE.filter(s => !q || s.name.toLowerCase().includes(q.toLowerCase()));
    return filtered.slice(0,60).map(s=>`
      <div class="grimoire-row">
        <div><strong>${escapeHtml(s.name)}</strong><br><span class="hint">${s.level===0?'Truco':'Nivel '+s.level} · ${escapeHtml(s.school)}</span></div>
        <button class="rail-btn" data-add="${s.id}" type="button">+ Agregar</button>
      </div>`).join('') || '<div class="hint" style="margin:10px 0;">Sin resultados.</div>';
  };
  box.innerHTML = `
    <div class="modal-title">Grimorio básico</div>
    <input class="search-input" id="grimoireSearch" placeholder="Buscar hechizo…" style="margin-bottom:12px;width:100%;">
    <div id="grimoireResults" style="max-height:360px; overflow-y:auto; display:flex; flex-direction:column; gap:8px;">${renderList()}</div>
    <div class="modal-actions"><div></div><div><button class="btn-ghost" id="modalCancel">Cerrar</button></div></div>`;
  overlay.classList.add('open');
  document.getElementById('modalCancel').onclick = closeModal;
  const wire = ()=>{
    document.querySelectorAll('#grimoireResults [data-add]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const spell = GRIMOIRE.find(s=>s.id===Number(btn.dataset.add));
        if(!spell) return;
        const line = `${spell.name} (${spell.level===0?'Truco':'Nv '+spell.level}, ${spell.school}) — ${spell.blurb}`;
        // wsSpells textarea lives inside the 5E panel — grab it from the page
        const ta = document.getElementById('wsSpells');
        if(ta){
          ta.value = ta.value ? ta.value + '\n' + line : line;
          markWsDirty();
        }
        btn.textContent = 'Agregado ✓'; btn.disabled = true;
      });
    });
  };
  wire();
  document.getElementById('grimoireSearch').addEventListener('input', (e)=>{ document.getElementById('grimoireResults').innerHTML = renderList(e.target.value); wire(); });
  setTimeout(()=>document.getElementById('grimoireSearch').focus(), 30);
});

/* Print */
function buildPrintHtml(entries){
  return `<html><head><title>Fichas</title><style>
    body{ font-family: Georgia, serif; padding:40px; color:#231914; max-width:760px; margin:auto; }
    h1{ font-size:26px; margin-bottom:4px; } .meta{ color:#7d5f2c; font-size:12px; margin-bottom:16px; }
    img{ max-width:100%; border-radius:6px; } .cover{ width:100%; max-height:240px; object-fit:cover; border-radius:8px; margin-bottom:16px; }
    .summary{ font-style:italic; margin-bottom:16px; } .entry-block{ margin-bottom:14px; }
    .entry-block h3{ font-size:15px; color:#7d5f2c; margin-bottom:4px; }
    .page-break{ page-break-after: always; margin-bottom:40px; border-bottom:1px dashed #ccc; padding-bottom:30px; }
  </style></head><body>
  ${entries.map(full=>`
    <div class="page-break">
      ${full.coverImage?`<img class="cover" src="${full.coverImage}">`:''}
      <h1>${escapeHtml(full.name)}</h1>
      <div class="meta">${escapeHtml(worldMeta.folders.find(f=>f.id===full.folderId)?.name||'')} ${full.tags?.length?'· '+escapeHtml(full.tags.join(', ')):''}</div>
      ${full.summary?`<p class="summary">${escapeHtml(full.summary)}</p>`:''}
      ${(full.blocks||[]).map(b=>`<div class="entry-block"><h3>${escapeHtml(b.title)}</h3><div>${b.html||''}</div></div>`).join('')}
    </div>`).join('')}
  </body></html>`;
}
function printEntry(){
  const name = document.getElementById('wsName').value || 'Ficha';
  const full = { name, tags: document.getElementById('wsTags').value.split(',').map(t=>t.trim()).filter(Boolean),
    summary: document.getElementById('wsSummary').value, coverImage: wsCoverData, blocks: currentBlocks };
  printEntries([full]);
}
function printEntries(entries){ openPrintWindow(buildPrintHtml(entries)); }
document.getElementById('printEntryBtn').addEventListener('click', printEntry);
