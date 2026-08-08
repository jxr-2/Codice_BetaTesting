/* modules/fichas.js — Carpetas, grilla de fichas, editor completo, impresión. */
function renderFolderList(){
  const el = document.getElementById('folderList');
  const counts = { all: entriesIndex.length, none: entriesIndex.filter(e=>!e.folderId).length };
  worldMeta.folders.forEach(f => counts[f.id] = entriesIndex.filter(e=>e.folderId===f.id).length);
  let html = `<div class="rail-item ${activeFolder==='all'?'active':''}" data-folder="all"><span>Todas</span><span class="rail-count">${counts.all}</span></div>`;
  html += `<div class="rail-item ${activeFolder==='none'?'active':''}" data-folder="none"><span>Sin carpeta</span><span class="rail-count">${counts.none}</span></div>`;
  worldMeta.folders.forEach(f=>{
    html += `<div class="rail-item ${activeFolder===f.id?'active':''}" data-folder="${f.id}">
      <span>${escapeHtml(f.name)}</span>
      <span style="display:flex;align-items:center;gap:4px;"><span class="rail-count">${counts[f.id]||0}</span><span class="icon-btn" data-del-folder="${f.id}" title="Eliminar carpeta">✕</span></span>
    </div>`;
  });
  el.innerHTML = html;
  el.querySelectorAll('.rail-item').forEach(item=>{
    item.addEventListener('click', (e)=>{
      if(e.target.closest('[data-del-folder]')) return;
      activeFolder = item.dataset.folder; setFichasMode('grid'); renderFolderList(); renderFichasGrid();
    });
  });
  el.querySelectorAll('[data-del-folder]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const fid = btn.dataset.delFolder;
      openConfirm({
        title:'Eliminar carpeta', message:'Las fichas dentro quedarán sin carpeta. Esta acción no se puede deshacer.',
        onConfirm: async ()=>{
          worldMeta.folders = worldMeta.folders.filter(f=>f.id!==fid);
          for(const en of entriesIndex){
            if(en.folderId===fid){
              en.folderId = null;
              const full = await storeGet('entry:'+en.id);
              if(full){ full.folderId = null; await storeSet('entry:'+en.id, full); }
            }
          }
          await storeSet('world-meta', worldMeta); await storeSet('entries-index', entriesIndex); markDirty();
          if(activeFolder===fid) activeFolder = 'all';
          renderFolderList(); renderFichasGrid(); renderWsFolderOptions(document.getElementById('wsFolder').value);
        }
      });
    });
  });
}
function renderTypeFilterList(){
  const el = document.getElementById('typeFilterList');
  const counts = { all: entriesIndex.length };
  Object.keys(TYPES).forEach(k => counts[k] = entriesIndex.filter(e=>e.type===k).length);
  let html = `<div class="rail-item ${activeType==='all'?'active':''}" data-type="all"><span>Todas</span><span class="rail-count">${counts.all}</span></div>`;
  Object.keys(TYPES).forEach(k=>{
    html += `<div class="rail-item ${activeType===k?'active':''}" data-type="${k}"><span>${TYPES[k].glyph} ${TYPES[k].label}</span><span class="rail-count">${counts[k]}</span></div>`;
  });
  el.innerHTML = html;
  el.querySelectorAll('.rail-item').forEach(item=>{
    item.addEventListener('click', ()=>{ activeType = item.dataset.type; setFichasMode('grid'); renderTypeFilterList(); renderFichasGrid(); });
  });
}


/* ========================= FICHAS GRID (auto-fit summary) ========================= */
document.getElementById('searchFichas').addEventListener('input', (e)=>{ searchTerm = e.target.value; renderFichasGrid(); });
function filteredEntries(){
  let list = entriesIndex;
  if(activeFolder === 'none') list = list.filter(e=>!e.folderId);
  else if(activeFolder !== 'all') list = list.filter(e=>e.folderId===activeFolder);
  if(activeType !== 'all') list = list.filter(e=>e.type===activeType);
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
    grid.innerHTML = `<div class="empty"><div class="glyph">⚙</div><div class="title">El taller está vacío</div><div class="sub">Creá tu primera ficha de personaje, lugar u objeto.</div></div>`;
    document.getElementById('bulkBar').style.display = 'none';
    return;
  }
  if(list.length === 0){
    grid.innerHTML = `<div class="empty"><div class="glyph">◌</div><div class="title">Sin resultados</div><div class="sub">Nada coincide con esa búsqueda o filtro.</div></div>`;
    return;
  }
  grid.innerHTML = `<div class="cards-grid">${list.map(e=>{
    const t = TYPES[e.type] || TYPES.personaje;
    const pos = e.coverPosition || {x:50,y:50};
    const zoom = e.coverZoom || 1;
    const coverStyle = e.coverThumb ? `background-image:url('${e.coverThumb}');background-position:${pos.x}% ${pos.y}%;background-size:${zoom*100}%;` : '';
    const checked = selectedIds.has(e.id);
    return `<div class="ficha-card" style="--type-color:${t.color}" data-id="${e.id}">
      ${selectMode ? `<input type="checkbox" class="ficha-check" data-check="${e.id}" ${checked?'checked':''}>` : ''}
      <div class="ficha-cover" style="${coverStyle}">${e.coverThumb ? '' : t.glyph}</div>
      <div class="ficha-body">
        <div class="ficha-type">${t.glyph} ${t.label}</div>
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
    title:'Mover a carpeta', fields:[{ key:'folderId', label:'Carpeta', type:'select', options:[{value:'',label:'Sin carpeta'}, ...worldMeta.folders.map(f=>({value:f.id,label:f.name}))] }],
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
    renderFolderList(); renderTypeFilterList(); renderFichasGrid(); renderHomeDashboard();
  }});
});
document.getElementById('bulkPrintBtn').addEventListener('click', async ()=>{
  const items = [];
  for(const id of selectedIds){ const full = await storeGet('entry:'+id); if(full) items.push(full); }
  printEntries(items);
});

/* ========================= WORKSPACE (Fichas, unificado) ========================= */
function defaultEntry(){
  return { name:'', type:'personaje', folderId:null, tags:[], summary:'', blocks:[], coverImage:null, coverThumb:null,
    coverPosition:{x:50,y:50}, coverZoom:1, enable5eSheet:false, stats:{}, spells:'', inventory:'' };
}
function renderWsTypeOptions(selected){
  document.getElementById('wsType').innerHTML = Object.keys(TYPES).map(k=>`<option value="${k}" ${k===selected?'selected':''}>${TYPES[k].glyph} ${TYPES[k].label}</option>`).join('');
}
function renderWsFolderOptions(selected){
  let html = `<option value="">Sin carpeta</option>`;
  html += worldMeta.folders.map(f=>`<option value="${f.id}" ${f.id===selected?'selected':''}>${escapeHtml(f.name)}</option>`).join('');
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
  const type = document.getElementById('wsType').value;
  const toggle = document.getElementById('ws5eToggle');
  const panel = document.getElementById('ws5ePanel');
  if(type === 'personaje'){
    toggle.style.display = 'flex';
    panel.classList.toggle('active', wsEnable5E);
    document.getElementById('wsToggle5E').textContent = wsEnable5E ? 'Ocultar hoja 5E' : 'Activar hoja 5E';
  } else { toggle.style.display = 'none'; panel.classList.remove('active'); wsEnable5E = false; }
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
        <button class="icon-btn mini-fmt-btn" data-block-img="${b.id}" title="Insertar imagen" type="button">🖼</button>
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
    insertResizableImage(target, dataUrl, blockId);
    const b = currentBlocks.find(x=>x.id===blockId);
    if(b) b.html = target.innerHTML;
    markWsDirty();
  }
  e.target.value = '';
});

/* ---- Resizable / alignable image helper ---- */
function insertResizableImage(container, src, blockId){
  const wrapper = document.createElement('div');
  wrapper.className = 'img-block';
  wrapper.dataset.imgBlock = '1';
  wrapper.contentEditable = 'false';

  const img = document.createElement('img');
  img.src = src;
  img.style.width = '60%';
  img.style.display = 'block';
  img.style.margin = '8px auto';
  img.draggable = false;

  const toolbar = document.createElement('div');
  toolbar.className = 'img-toolbar';
  toolbar.innerHTML = `
    <button data-align="left"   title="Izquierda">◀</button>
    <button data-align="center" title="Centro">▬</button>
    <button data-align="right"  title="Derecha">▶</button>
    <button data-align="full"   title="Ancho completo">⇔</button>
    <input type="range" min="20" max="100" value="60" title="Tamaño" style="width:70px;">
    <button data-remove title="Eliminar">✕</button>`;

  toolbar.querySelector('input[type=range]').addEventListener('input', ev=>{
    img.style.width = ev.target.value + '%';
    syncBlock(blockId, container);
  });
  toolbar.querySelectorAll('[data-align]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const a = btn.dataset.align;
      if(a==='left')  { img.style.marginLeft='0'; img.style.marginRight='auto'; img.style.display='block'; }
      else if(a==='center'){ img.style.margin='8px auto'; img.style.display='block'; }
      else if(a==='right') { img.style.marginLeft='auto'; img.style.marginRight='0'; img.style.display='block'; }
      else if(a==='full')  { img.style.width='100%'; img.style.margin='8px 0'; }
      syncBlock(blockId, container);
    });
  });
  toolbar.querySelector('[data-remove]').addEventListener('click', ()=>{
    wrapper.remove();
    syncBlock(blockId, container);
  });

  wrapper.appendChild(toolbar);
  wrapper.appendChild(img);

  // Insert at cursor position or append
  const sel = window.getSelection();
  if(sel && sel.rangeCount && container.contains(sel.anchorNode)){
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(wrapper);
    range.setStartAfter(wrapper);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    container.appendChild(wrapper);
  }
}

function syncBlock(blockId, container){
  const b = currentBlocks.find(x=>x.id===blockId);
  if(b){ b.html = container.innerHTML; markWsDirty(); }
}

/* Wire click-to-show-toolbar on existing saved images when a block renders */
function wireExistingImages(container, blockId){
  container.querySelectorAll('img:not([data-wired])').forEach(img=>{
    img.dataset.wired = '1';
    img.style.cursor = 'pointer';
    img.addEventListener('click', ()=>{
      // wrap orphan img in a block and show controls
      if(!img.closest('.img-block')){
        const w = document.createElement('div');
        w.className = 'img-block';
        w.contentEditable = 'false';
        img.parentNode.insertBefore(w, img);
        w.appendChild(img);
        const dataUrl = img.src;
        img.parentNode.replaceChild(document.createElement('span'), img); // remove then re-insert
        w.innerHTML = '';
        insertResizableImage(container, dataUrl, blockId);
        img.remove();
      }
    });
  });
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
  renderWsTypeOptions(full.type);
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
  document.getElementById('wsDirtyHint').textContent = '';
}
function markWsDirty(){ wsDirty = true; document.getElementById('wsDirtyHint').textContent = '● cambios sin guardar'; }
['wsName','wsTags','wsSummary','wsSTR','wsDEX','wsCON','wsINT','wsWIS','wsCHA','wsHP','wsAC','wsSpeed','wsProf','wsSpells','wsInventory'].forEach(id=>{
  document.getElementById(id).addEventListener('input', markWsDirty);
});
document.getElementById('wsType').addEventListener('change', ()=>{ markWsDirty(); update5EVisibility(); });
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
  if(!wsCoverData) return;
  coverDragState = { startX:e.clientX, startY:e.clientY, origX:wsCoverPos.x, origY:wsCoverPos.y, rect: document.getElementById('wsCover').getBoundingClientRect() };
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

async function saveCurrentWorkspace(){
  const name = document.getElementById('wsName').value.trim();
  if(!name){ document.getElementById('wsName').focus(); return false; }
  const type = document.getElementById('wsType').value;
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
  const full = { id, name, type, folderId, tags, summary, blocks: currentBlocks, stats, spells, inventory, enable5eSheet: wsEnable5E,
    coverImage: wsCoverData, coverThumb: wsCoverData, coverPosition: wsCoverPos, coverZoom: wsCoverZoom, updatedAt: now, createdAt: currentEntryId ? undefined : now };
  const prevIdx = entriesIndex.findIndex(e=>e.id===id);
  if(prevIdx>-1 && full.createdAt===undefined) full.createdAt = entriesIndex[prevIdx].createdAt || now;
  await storeSet('entry:'+id, full); markDirty();
  const lightEntry = { id, name, type, folderId, tags, summary, coverThumb: wsCoverData, coverPosition: wsCoverPos, coverZoom: wsCoverZoom, updatedAt: now, createdAt: full.createdAt };
  if(prevIdx>-1) entriesIndex[prevIdx] = lightEntry; else entriesIndex.push(lightEntry);
  await storeSet('entries-index', entriesIndex);
  currentEntryId = id; wsDirty = false;
  renderFolderList(); renderTypeFilterList(); renderFichasGrid(); renderHomeDashboard();
  if(canvasLoaded){ renderCanvasNodes(); renderCanvasEdges(); }
  setFichasMode('grid');
  return true;
}
document.getElementById('wsSave').addEventListener('click', saveCurrentWorkspace);

document.getElementById('wsDelete').addEventListener('click', ()=>{
  if(!currentEntryId) return;
  openConfirm({
    title:'Eliminar ficha', message:'Esta ficha se borrará de tu códice de forma permanente.',
    onConfirm: async ()=>{
      await storeDelete('entry:'+currentEntryId);
      entriesIndex = entriesIndex.filter(e=>e.id!==currentEntryId);
      await storeSet('entries-index', entriesIndex);
      const removedIds = canvasData.nodes.filter(n=>n.kind==='entry'&&n.entryId===currentEntryId).map(n=>n.id);
      if(removedIds.length){
        canvasData.nodes = canvasData.nodes.filter(n=>!removedIds.includes(n.id));
        canvasData.edges = canvasData.edges.filter(ed=>!removedIds.includes(ed.from)&&!removedIds.includes(ed.to));
        await saveCanvas();
        if(canvasLoaded){ renderCanvasNodes(); renderCanvasEdges(); }
      }
      markDirty();
      renderFolderList(); renderTypeFilterList(); renderFichasGrid(); renderHomeDashboard();
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
    fields:[{ key:'id', label:'Ficha', type:'select', options: entriesIndex.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||'')).map(e=>({value:e.id,label:`${TYPES[e.type].glyph} ${e.name||'Sin nombre'}`})) }],
    submitLabel:'Abrir',
    onSubmit: (v)=> openFichaEditor(v.id)
  });
});
document.getElementById('goToCanvasBtn').addEventListener('click', ()=> navigateTo('canvas'));
document.getElementById('goToMapsBtn').addEventListener('click', ()=> navigateTo('mapas'));

/* Grimorio picker (básico, panel lateral de la ficha) */
document.getElementById('openGrimoireBtn').addEventListener('click', ()=>{
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  box.style.width = 'min(520px,92vw)';
  const renderList = (q='') => {
    const filtered = GRIMOIRE.filter(s => !q || s.name.toLowerCase().includes(q.toLowerCase()));
    return filtered.slice(0,60).map(s=>`
      <div class="grimoire-row">
        <div><strong>${escapeHtml(s.name)}</strong><br><span class="hint">${s.level===0?'Truco':'Nivel '+s.level} · ${escapeHtml(s.school)}</span></div>
        <button class="rail-btn" data-add="${escapeHtml(s.name)}" type="button">+ Agregar</button>
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
        const spell = GRIMOIRE.find(s=>s.name===btn.dataset.add);
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
      <div class="meta">${escapeHtml(TYPES[full.type]?.label||'')} ${full.tags?.length?'· '+escapeHtml(full.tags.join(', ')):''}</div>
      ${full.summary?`<p class="summary">${escapeHtml(full.summary)}</p>`:''}
      ${(full.blocks||[]).map(b=>`<div class="entry-block"><h3>${escapeHtml(b.title)}</h3><div>${b.html||''}</div></div>`).join('')}
    </div>`).join('')}
  </body></html>`;
}
function printEntry(){
  const name = document.getElementById('wsName').value || 'Ficha';
  const full = { name, type: document.getElementById('wsType').value, tags: document.getElementById('wsTags').value.split(',').map(t=>t.trim()).filter(Boolean),
    summary: document.getElementById('wsSummary').value, coverImage: wsCoverData, blocks: currentBlocks };
  printEntries([full]);
}
function printEntries(entries){
  const win = window.open('', '_blank');
  if(!win) return;
  win.document.write(buildPrintHtml(entries));
  win.document.close(); win.focus();
  setTimeout(()=>win.print(), 400);
}
document.getElementById('printEntryBtn').addEventListener('click', printEntry);
